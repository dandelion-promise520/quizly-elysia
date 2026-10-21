import type { Question } from '@quizly/types'
import type { DB } from './db'
import type { AuthEnv } from './lib/auth-server'
import { cors } from '@elysia/cors'
import { Elysia } from 'elysia'
import { WebStandardAdapter } from 'elysia/adapter/web-standard'
import { createDb } from './db'
import { getAuth, isAuthorized } from './lib/auth-server'
import { batchBindQuestions, deleteQuestion, getCourses, getQuestions, saveCoursesToDatabase, saveQuestionsToDatabase, upsertQuestion } from './lib/db'

/**
 * Cloudflare Workers 环境绑定
 */
export interface Env extends AuthEnv {
  DB: D1Database
}

/**
 * 把每个请求的 Workers 绑定和对应的 Request 对象关联起来。
 *
 * Elysia v2 的 Web 标准 adapter 只能拿到 Request，无法直接读取 Workers 的 env。
 * 用 WeakMap 以 Request 为键传递绑定，既能避免模块级可变状态被并发请求串号，
 * 也不会阻止 Request 被回收。
 */
const envByRequest = new WeakMap<Request, Env>()

function getEnv(request: Request): Env {
  const env = envByRequest.get(request)
  if (!env)
    throw new Error('Workers bindings are not available')
  return env
}

/** 从上下文取当前请求的 Drizzle 实例 */
function db(ctx: { request: Request }): DB {
  return createDb(getEnv(ctx.request).DB)
}

/**
 * 写操作需要凭证，读接口保持公开。
 *
 * 做题页要读题库，公开读取不泄露数据；只有改动数据才校验登录态或 API Key。
 * /api/auth/* 是 Better Auth 自己的端点（登录、会话等），不能要求已登录。
 */
function requiresCredential(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS')
    return false
  const { pathname } = new URL(request.url)
  if (!pathname.startsWith('/api'))
    return false
  return !pathname.startsWith('/api/auth/')
}

const app = new Elysia({ adapter: WebStandardAdapter })
  .use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    // bearer 插件把会话 token 放在这个响应头里，跨域必须显式暴露前端才读得到
    exposeHeaders: ['set-auth-token'],
  }))
  .onBeforeHandle(async ({ request, set }) => {
    if (!requiresCredential(request))
      return

    if (await isAuthorized(request, getEnv(request)))
      return

    set.status = 401
    return { success: false, error: '未登录或凭证无效' }
  })
  .get('/', ({ request }) => ({
    status: 'ok',
    service: 'quizly-backend',
    authEnabled: Boolean(getEnv(request).BETTER_AUTH_SECRET),
  }))
  // Better Auth 自带端点：登录、登出、会话、API Key 管理
  .all('/api/auth/*', ({ request }) => getAuth(getEnv(request)).handler(request))
  .get('/api/questions', async (ctx) => {
    try {
      return await getQuestions(db(ctx))
    }
    catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      }
    }
  })
  .post('/api/questions', async (ctx) => {
    try {
      const questions = ctx.body as any[]
      const updated = await saveQuestionsToDatabase(db(ctx), questions)
      return { success: true, questions: updated }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to database',
      }
    }
  })
  // 增量写入：传单条或数组，有 id 则更新，无 id 则新增，不会删除其他题目
  .post('/api/questions/upsert', async (ctx) => {
    try {
      const payload = ctx.body as Question | Question[]
      const list = Array.isArray(payload) ? payload : [payload]
      const saved: Question[] = []
      for (const item of list)
        saved.push(await upsertQuestion(db(ctx), item))
      return { success: true, questions: Array.isArray(payload) ? saved : saved[0] }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存失败',
      }
    }
  })
  .delete('/api/questions/:id', async (ctx) => {
    try {
      const id = Number(ctx.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        return { success: false, error: '题目 id 无效' }
      }
      const removed = await deleteQuestion(db(ctx), id)
      return removed ? { success: true } : { success: false, error: '题目不存在' }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      }
    }
  })
  .post('/api/questions/batch-bind', async (ctx) => {
    try {
      const { questionIds, courseId, categoryId } = ctx.body as {
        questionIds: number[]
        courseId: number | null
        categoryId: number | null
      }

      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return { success: false, error: '请选择要修改的题目' }
      }

      await batchBindQuestions(db(ctx), questionIds, courseId, categoryId)
      return { success: true }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量修改失败',
      }
    }
  })
  .get('/api/courses', async (ctx) => {
    try {
      return await getCourses(db(ctx))
    }
    catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      }
    }
  })
  .post('/api/courses', async (ctx) => {
    try {
      const courses = ctx.body as any[]
      const updated = await saveCoursesToDatabase(db(ctx), courses)
      return { success: true, courses: updated }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to database',
      }
    }
  })
  // Cloudflare Workers 必须调用 compile()，用于提前完成路由编译
  .compile()

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    envByRequest.set(request, env)
    return await app.fetch(request)
  },
}
