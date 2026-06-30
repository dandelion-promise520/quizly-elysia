import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { getQuestions, saveQuestionsToDatabase } from './lib/db'

const app = new Elysia()
  .use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
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
