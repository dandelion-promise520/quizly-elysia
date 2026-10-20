import type { DB } from './db'
import { cors } from '@elysia/cors'
import { Elysia } from 'elysia'
import { WebStandardAdapter } from 'elysia/adapter/web-standard'
import { createDb } from './db'
import { batchBindQuestions, getCourses, getQuestions, saveCoursesToDatabase, saveQuestionsToDatabase } from './lib/db'

/**
 * Cloudflare Workers 环境绑定
 */
export interface Env {
  DB: D1Database
  ADMIN_PASSWORD?: string
}

/**
 * 把每个请求的 Workers 绑定和对应的 Request 对象关联起来。
 *
 * Elysia v2 的 Web 标准 adapter 只能拿到 Request，无法直接读取 Workers 的 env。
 * 用 WeakMap 以 Request 为键传递绑定，既能避免模块级可变状态被并发请求串号，
 * 也不会阻止 Request 被回收。
 */
const envByRequest = new WeakMap<Request, Env>()

/** 从上下文取当前请求的 Drizzle 实例 */
function db(ctx: { request: Request }): DB {
  const env = envByRequest.get(ctx.request)
  if (!env)
    throw new Error('D1 binding is not available')
  return createDb(env.DB)
}

const app = new Elysia({ adapter: WebStandardAdapter })
  .use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .get('/', () => ({ status: 'ok', service: 'quizly-backend' }))
  .post('/api/admin/verify', async ({ body, request }) => {
    try {
      const { password } = body as { password?: string }
      const correctPassword = envByRequest.get(request)?.ADMIN_PASSWORD || 'admin123'
      if (password === correctPassword) {
        return { success: true }
      }
      return { success: false, error: '密码错误，请重新输入' }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      }
    }
  })
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
