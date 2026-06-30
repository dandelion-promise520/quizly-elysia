import type { Question } from '@quizly/types'
import { prisma } from './prisma'

export async function getQuestions(): Promise<Question[]> {
  const questions = await prisma.question.findMany({
    include: {
      Option: true,
      Blank: true,
      category: true,
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
    const categoryId = q.categoryId
    const courseId = q.courseId

    if (type === '填空题') {
      const sortedBlanks = [...q.Blank].sort((a, b) => a.order - b.order)
      const textArr = sortedBlanks.map(b => b.text)
      return {
        id,
        type: '填空题' as const,
        text,
        blanks: textArr,
        answer: textArr,
        categoryId,
        category,
        courseId,
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
        categoryId,
        category,
        courseId,
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
                && dbQ.categoryId === (q.categoryId ?? null)
                && dbQ.courseId === (q.courseId ?? null)
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
                && dbQ.categoryId === (q.categoryId ?? null)
                && dbQ.courseId === (q.courseId ?? null)
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
                categoryId: q.categoryId ?? null,
                courseId: q.courseId ?? null,
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
                categoryId: q.categoryId ?? null,
                courseId: q.courseId ?? null,
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
                categoryId: q.categoryId ?? null,
                courseId: q.courseId ?? null,
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
                categoryId: q.categoryId ?? null,
                courseId: q.courseId ?? null,
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

export async function getCourses() {
  const courses = await prisma.course.findMany({
    include: {
      Category: true,
    },
    orderBy: {
      id: 'asc',
    },
  })
  return courses.map(c => ({
    id: c.id,
    name: c.name,
    categories: c.Category,
  }))
}

export async function saveCoursesToDatabase(courses: { id?: number, name: string, categories?: { id?: number, name: string }[] }[]) {
  const inputIds = courses
    .map(c => c.id)
    .filter((id): id is number => typeof id === 'number')

  await prisma.$transaction(
    async (tx) => {
      // 1. Delete removed courses
      await tx.course.deleteMany({
        where: {
          id: {
            notIn: inputIds,
          },
        },
      })

      // 2. Insert or Update courses
      for (const c of courses) {
        let courseId = c.id
        if (typeof courseId === 'number') {
          await tx.course.update({
            where: { id: courseId },
            data: {
              name: c.name,
            },
          })
        }
        else {
          const created = await tx.course.create({
            data: {
              name: c.name,
            },
          })
          courseId = created.id
        }

        // 同步分类数据
        const inputCategories = c.categories || []
        const inputCatIds = inputCategories
          .map(cat => cat.id)
          .filter((id): id is number => typeof id === 'number')

        // 2.1 删除被移除的分类
        await tx.category.deleteMany({
          where: {
            courseId,
            id: {
              notIn: inputCatIds,
            },
          },
        })

        // 2.2 更新或新增分类
        for (const cat of inputCategories) {
          if (typeof cat.id === 'number') {
            await tx.category.update({
              where: { id: cat.id },
              data: {
                name: cat.name,
              },
            })
          }
          else {
            await tx.category.create({
              data: {
                name: cat.name,
                courseId,
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

  return await getCourses()
}

export async function batchBindQuestions(
  questionIds: number[],
  courseId: number | null,
  categoryId: number | null,
) {
  const finalCourseId = courseId
  let finalCategoryId = categoryId

  if (finalCourseId === null) {
    finalCategoryId = null
  }
  else if (finalCategoryId !== null) {
    const cat = await prisma.category.findUnique({
      where: { id: finalCategoryId },
    })
    if (!cat) {
      throw new Error('所选分类不存在')
    }
    if (cat.courseId !== finalCourseId) {
      throw new Error('所选分类不属于该课程')
    }
  }

  await prisma.question.updateMany({
    where: {
      id: {
        in: questionIds,
      },
    },
    data: {
      courseId: finalCourseId,
      categoryId: finalCategoryId,
    },
  })
}
