import type { Question } from '@quizly/types'
import { prisma } from './prisma'

export async function getQuestions(): Promise<Question[]> {
  const questions = await prisma.question.findMany({
    include: {
      Option: true,
      Blank: true,
    },
    orderBy: {
      id: 'asc',
    },
  })

  return questions.map((q) => {
    const id = q.id
    const type = q.type
    const text = q.text
    const category = q.category

    if (type === '填空题') {
      const sortedBlanks = [...q.Blank].sort((a, b) => a.order - b.order)
      const textArr = sortedBlanks.map(b => b.text)
      return {
        id,
        type: '填空题' as const,
        text,
        blanks: textArr,
        answer: textArr,
        category,
      }
    }
    else {
      const optionsArr = q.Option.map(o => ({
        label: o.label,
        text: o.text,
      }))
      return {
        id,
        type: type as '单选题' | '判断题' | '多选题',
        text,
        options: optionsArr,
        answer: q.answer,
        category,
      }
    }
  })
}

export async function saveQuestionsToDatabase(questions: Question[]): Promise<Question[]> {
  const inputIds = questions
    .map(q => q.id)
    .filter((id): id is number => typeof id === 'number')

  await prisma.$transaction(
    async (tx) => {
      // 1. Delete removed questions
      await tx.question.deleteMany({
        where: {
          id: {
            notIn: inputIds,
          },
        },
      })

      // Fetch existing questions to compare in memory and avoid redundant updates
      const existing = await tx.question.findMany({
        where: {
          id: {
            in: inputIds,
          },
        },
        include: {
          Option: true,
          Blank: true,
        },
      })

      // 2. Insert or Update questions
      for (const q of questions) {
        if (typeof q.id === 'number') {
          const dbQ = existing.find(x => x.id === q.id)
          let needsUpdate = true
          if (dbQ) {
            if (q.type === '填空题') {
              const dbBlanks = [...dbQ.Blank].sort((a, b) => a.order - b.order).map(b => b.text)
              const hasBlanksChanged = dbBlanks.length !== q.blanks.length || dbBlanks.some((b, idx) => b !== q.blanks[idx])

              if (
                dbQ.type === q.type
                && dbQ.text === q.text
                && dbQ.category === (q.category || '基础题')
                && !hasBlanksChanged
              ) {
                needsUpdate = false
              }
            }
            else {
              const hasOptionsChanged = dbQ.Option.length !== q.options.length || q.options.some((opt) => {
                const dbOpt = dbQ.Option.find(o => o.label === opt.label)
                return !dbOpt || dbOpt.text !== opt.text
              })

              if (
                dbQ.type === q.type
                && dbQ.text === q.text
                && dbQ.answer === q.answer
                && dbQ.category === (q.category || '基础题')
                && !hasOptionsChanged
              ) {
                needsUpdate = false
              }
            }
          }

          if (!needsUpdate) {
            continue
          }

          if (q.type === '填空题') {
            await tx.question.update({
              where: { id: q.id },
              data: {
                type: q.type,
                text: q.text,
                answer: '',
                category: q.category || '基础题',
                Option: { deleteMany: {} },
                Blank: {
                  deleteMany: {},
                  create: q.blanks.map((b, index) => ({
                    text: b,
                    order: index,
                  })),
                },
              },
            })
          }
          else {
            await tx.question.update({
              where: { id: q.id },
              data: {
                type: q.type,
                text: q.text,
                answer: q.answer,
                category: q.category || '基础题',
                Blank: { deleteMany: {} },
                Option: {
                  deleteMany: {},
                  create: q.options.map(o => ({
                    label: o.label,
                    text: o.text,
                  })),
                },
              },
            })
          }
        }
        else {
          if (q.type === '填空题') {
            await tx.question.create({
              data: {
                type: q.type,
                text: q.text,
                answer: '',
                category: q.category || '基础题',
                Blank: {
                  create: q.blanks.map((b, index) => ({
                    text: b,
                    order: index,
                  })),
                },
              },
            })
          }
          else {
            await tx.question.create({
              data: {
                type: q.type,
                text: q.text,
                answer: q.answer,
                category: q.category || '基础题',
                Option: {
                  create: q.options.map(o => ({
                    label: o.label,
                    text: o.text,
                  })),
                },
              },
            })
          }
        }
      }
    },
    {
      timeout: 60_000,
      maxWait: 10_000,
    },
  )

  return await getQuestions()
}
