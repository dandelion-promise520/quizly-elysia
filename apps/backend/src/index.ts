import process from 'node:process'
import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { getCourses, getQuestions, saveCoursesToDatabase, saveQuestionsToDatabase } from './lib/db'
import { delCache, getCache, setCache } from './lib/redis'

const app = new Elysia()
  .use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .get('/', () => ({ status: 'ok', service: 'quizly-backend' }))
  .post('/api/admin/verify', async ({ body }) => {
    try {
      const { password } = body as { password?: string }
      const correctPassword = process.env.ADMIN_PASSWORD || 'admin123'
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
  .get('/api/questions', async () => {
    try {
      const cached = await getCache('quizly:questions')
      if (cached) {
        return JSON.parse(cached)
      }
      const questions = await getQuestions()
      await setCache('quizly:questions', JSON.stringify(questions), 3600)
      return questions
    }
    catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      }
    }
  })
  .post('/api/questions', async ({ body }) => {
    try {
      const questions = body as any[]
      const updated = await saveQuestionsToDatabase(questions)
      await delCache('quizly:questions')
      return { success: true, questions: updated }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to database',
      }
    }
  })
  .get('/api/courses', async () => {
    try {
      const cached = await getCache('quizly:courses')
      if (cached) {
        return JSON.parse(cached)
      }
      const courses = await getCourses()
      await setCache('quizly:courses', JSON.stringify(courses), 3600)
      return courses
    }
    catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown database error',
      }
    }
  })
  .post('/api/courses', async ({ body }) => {
    try {
      const courses = body as any[]
      const updated = await saveCoursesToDatabase(courses)
      await delCache('quizly:courses')
      await delCache('quizly:questions')
      return { success: true, courses: updated }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to database',
      }
    }
  })
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
)
