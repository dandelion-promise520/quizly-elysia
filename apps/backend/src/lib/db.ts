import type { Question } from '../types'
import { prisma } from './prisma'

let saveQueue: Promise<unknown> = Promise.resolve()

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

    if (type === '填空题') {
      const sortedBlanks = [...q.Blank].sort((a, b) => a.order - b.order)
      const textArr = sortedBlanks.map(b => b.text)
      return {
        id,
        type: '填空题' as const,
        text,
        blanks: textArr,
        answer: textArr,
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
      }
    }
  })
}

export async function saveQuestionsToDatabase(questions: Question[]): Promise<Question[]> {
  const previousSave = saveQueue
  let releaseSave: (() => void) | undefined

  saveQueue = new Promise((resolve) => {
    releaseSave = () => resolve(undefined)
  })

  try {
    await previousSave

    const [existingMaxQuestionId, existingMaxOptionId, existingMaxBlankId] = await Promise.all([
      prisma.question.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      }),
      prisma.option.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      }),
      prisma.blank.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      }),
    ])

    let nextQuestionId = (existingMaxQuestionId?.id ?? 0) + 1
    let nextOptionId = (existingMaxOptionId?.id ?? 0) + 1
    let nextBlankId = (existingMaxBlankId?.id ?? 0) + 1
    const normalizedQuestions = questions.map((q) => {
      if (typeof q.id === 'number') {
        return {
          question: q,
          isNew: false,
        }
      }

      return {
        question: {
          ...q,
          id: nextQuestionId++,
        },
        isNew: true,
      }
    })

    const inputIds = normalizedQuestions
      .map(({ question }) => question.id)
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

        // 2. Insert or Update questions
        for (const { question: q, isNew } of normalizedQuestions) {
          if (!isNew) {
            if (q.type === '填空题') {
              await tx.question.update({
                where: { id: q.id },
                data: {
                  type: q.type,
                  text: q.text,
                  answer: '',
                  Option: { deleteMany: {} },
                  Blank: {
                    deleteMany: {},
                    create: q.blanks.map((b, index) => ({
                      id: nextBlankId++,
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
                  Blank: { deleteMany: {} },
                  Option: {
                    deleteMany: {},
                    create: q.options.map(o => ({
                      id: nextOptionId++,
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
                  id: q.id as number,
                  type: q.type,
                  text: q.text,
                  answer: '',
                  Blank: {
                    create: q.blanks.map((b, index) => ({
                      id: nextBlankId++,
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
                  id: q.id as number,
                  type: q.type,
                  text: q.text,
                  answer: q.answer,
                  Option: {
                    create: q.options.map(o => ({
                      id: nextOptionId++,
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
        timeout: 30_000,
        maxWait: 10_000,
      },
    )

    return await getQuestions()
  }
  finally {
    releaseSave?.()
  }
}
