import type { Course, Question } from '@quizly/types'

// 本地开发走 vite 代理的相对路径；线上构建通过 VITE_API_BASE 指向后端 Worker
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
// Better Auth 挂在 /api/auth 下
const AUTH_BASE = `${API_BASE}/auth`

// 登录后由后端下发的会话 token（Better Auth bearer 模式），只存 sessionStorage
const TOKEN_KEY = 'quizly_session_token'

export function hasSession(): boolean {
  return Boolean(sessionStorage.getItem(TOKEN_KEY))
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
}

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** 写接口在会话过期后返回 401，统一转成可提示的文案 */
function ensureOk(res: Response, message: string) {
  if (res.status === 401) {
    clearSession()
    throw new Error('登录已过期，请重新登录')
  }
  if (!res.ok)
    throw new Error(message)
}

/**
 * 邮箱密码登录。
 *
 * Better Auth 的 bearer 插件把会话 token 放在 `set-auth-token` 响应头里，
 * 后续请求用它代替 cookie（前后端跨站部署，cookie 会被浏览器拦）。
 */
export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const res = await fetch(`${AUTH_BASE}/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message: string = data?.message ?? ''
    // Better Auth 的 Origin 校验失败时报英文，转成能照着处理的说明
    if (message.toLowerCase().includes('invalid origin'))
      return { error: `后端未信任当前站点 ${location.origin}，需加入后端 TRUSTED_ORIGINS` }
    return { error: message || '登录失败，请检查邮箱与密码' }
  }

  const token = res.headers.get('set-auth-token')
  if (token)
    sessionStorage.setItem(TOKEN_KEY, token)
  return {}
}

/** 退出登录：通知后端注销会话，再清掉本地 token */
export async function signOut(): Promise<void> {
  await fetch(`${AUTH_BASE}/sign-out`, { method: 'POST', headers: authHeaders() }).catch(() => {})
  clearSession()
}

export async function getQuestions(): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/questions`)
  if (!res.ok)
    throw new Error('Failed to fetch questions')
  return res.json()
}

export async function saveQuestions(questions: Question[]): Promise<{ success: boolean, questions?: Question[], error?: string }> {
  const res = await fetch(`${API_BASE}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(questions),
  })
  ensureOk(res, 'Failed to save questions')
  return res.json()
}

export async function getCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE}/courses`)
  if (!res.ok)
    throw new Error('Failed to fetch courses')
  return res.json()
}

export async function saveCourses(courses: Course[]): Promise<{ success: boolean, courses?: Course[], error?: string }> {
  const res = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(courses),
  })
  ensureOk(res, 'Failed to save courses')
  return res.json()
}

export async function batchBindQuestions(payload: {
  questionIds: number[]
  courseId: number | null
  categoryId: number | null
}): Promise<{ success: boolean, error?: string }> {
  const res = await fetch(`${API_BASE}/questions/batch-bind`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  })
  ensureOk(res, 'Failed to batch bind questions')
  return res.json()
}
