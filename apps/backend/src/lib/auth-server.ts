import { apiKey } from '@better-auth/api-key'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins'
import { createDb } from '../db'
import * as authSchema from '../db/auth-schema'

/**
 * Better Auth 实例管理。
 *
 * Workers 里 D1 绑定只能从 env 取，无法做模块级单例，
 * 但同一 isolate 内 env.DB 稳定，因此以绑定为键缓存实例，避免每请求重建。
 */
export interface AuthEnv {
  DB: D1Database
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  TRUSTED_ORIGINS?: string
}

/**
 * 允许跨域调用的前端来源。
 *
 * 前端在 pages.dev、后端在 workers.dev，属于不同站点，
 * 因此走 bearer token 而不是第三方 cookie（后者会被浏览器拦截）。
 * 额外的自定义域名可用 TRUSTED_ORIGINS 环境变量（逗号分隔）追加。
 */
const TRUSTED_ORIGINS = [
  'https://quizly.pages.dev',
  'http://localhost:5173',
  'http://localhost:5199',
  'http://localhost:4173',
]

/**
 * 判断某个 Origin 是否放行。
 *
 * Better Auth 只认「列表里有没有这个字符串」，所以命中规则的 Origin 会被
 * 原样追加进返回值 —— 这样 Pages 预览域名、本地任意端口、局域网调试都不用手工登记。
 */
function isTrustedOrigin(origin: string, extra: string[]): boolean {
  if (!origin || origin === 'null')
    return true
  if (TRUSTED_ORIGINS.includes(origin) || extra.includes(origin))
    return true

  try {
    const { hostname } = new URL(origin)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')
      return true
    // Pages 的预览部署是 <hash>.quizly.pages.dev
    if (hostname === 'quizly.pages.dev' || hostname.endsWith('.quizly.pages.dev'))
      return true
    // 私有网段，便于手机在局域网内联调
    if (/^(?:192\.168|10)\.\d{1,3}\.\d{1,3}(?:\.\d{1,3})?$/.test(hostname))
      return true
    if (/^172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname))
      return true
  }
  catch {
    // Origin 不是合法 URL，按不可信处理
  }
  return false
}

function readExtraOrigins(env: AuthEnv): string[] {
  return (env.TRUSTED_ORIGINS ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function createAuth(env: AuthEnv) {
  return betterAuth({
    database: drizzleAdapter(createDb(env.DB), { provider: 'sqlite', schema: authSchema }),
    baseURL: env.BETTER_AUTH_URL ?? 'https://quizly-backend.dandelionpromise.workers.dev',
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: (request) => {
      const extra = readExtraOrigins(env)
      const origin = request?.headers.get('origin') ?? ''
      const base = [...TRUSTED_ORIGINS, ...extra]
      return isTrustedOrigin(origin, extra) && origin && origin !== 'null'
        ? [...base, origin]
        : base
    },
    emailAndPassword: {
      enabled: true,
      // 不开放注册，管理员账号由脚本预置
      disableSignUp: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
    },
    plugins: [
      // 跨域场景用 Authorization: Bearer <token> 代替 cookie
      bearer(),
      // API Key 供脚本 / AI 调用写接口，不限流（内部单人使用）
      apiKey({
        enableMetadata: true,
        rateLimit: { enabled: false },
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>

const authByDb = new WeakMap<D1Database, Auth>()

/** 取当前请求对应的 Better Auth 实例 */
export function getAuth(env: AuthEnv): Auth {
  const cached = authByDb.get(env.DB)
  if (cached)
    return cached
  const auth = createAuth(env)
  authByDb.set(env.DB, auth)
  return auth
}

/**
 * 读取请求携带的凭证，兼容两种写法：
 *   Authorization: Bearer <token 或 API Key>
 *   X-API-Key: <API Key>
 */
export function readCredential(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (authorization?.toLowerCase().startsWith('bearer '))
    return authorization.slice(7).trim() || null
  return request.headers.get('x-api-key')?.trim() || null
}

/**
 * 校验请求是否有权写数据：先当 API Key 验，再当登录会话验。
 */
export async function isAuthorized(request: Request, env: AuthEnv): Promise<boolean> {
  const auth = getAuth(env)

  const credential = readCredential(request)
  if (credential) {
    try {
      const result = await auth.api.verifyApiKey({ body: { key: credential } })
      if (result.valid)
        return true
    }
    catch {
      // 不是合法 API Key，继续按会话校验
    }
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers })
    return Boolean(session)
  }
  catch {
    return false
  }
}
