import { Elysia } from 'elysia'
import { getQuestions, saveQuestionsToDatabase } from './lib/db'

const app = new Elysia()
  // 手写简易 CORS 中间件，避免依赖外部包
  .onRequest(({ set }) => {
    set.headers['Access-Control-Allow-Origin'] = '*'
    set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
  })
  .onBeforeHandle(({ request, set }) => {
    if (request.method === 'OPTIONS') {
      set.status = 204
      return ''
    }
  })
  .get('/', () => ({ status: 'ok', service: 'quizly-backend' }))
  .get('/api/questions', async () => {
    try {
      const questions = await getQuestions()
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
      return { success: true, questions: updated }
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
