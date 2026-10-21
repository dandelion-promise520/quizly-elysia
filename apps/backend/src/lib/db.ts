import type { Question } from '@quizly/types'
import type { DB } from '../db'
import { asc, eq, inArray } from 'drizzle-orm'
import { blanks, categories, courses, options, questions } from '../db/schema'

/**
 * 原子执行一批语句。
 *
 * D1 的 batch 要求至少一条语句，且类型上是非空元组，
 * 这里统一收敛调用处的类型断言与空数组判断。
 */
async function runBatch(db: DB, statements: any[]): Promise<any[]> {
  if (statements.length === 0)
    return []
  return await db.batch(statements as any) as any[]
}

/**
 * 读取全部题目（含选项、填空与分类）。
 *
 * 一次取出全部父表与子表数据，在内存中组装，避免逐题查询导致的 N+1。
 */
export async function getQuestions(db: DB): Promise<Question[]> {
  const [questionRows, optionRows, blankRows, categoryRows] = await Promise.all([
    db.select().from(questions).orderBy(asc(questions.id)),
    db.select().from(options),
    db.select().from(blanks).orderBy(asc(blanks.order)),
    db.select().from(categories),
  ])

  const categoryById = new Map(categoryRows.map(c => [c.id, c]))
  const optionsByQuestion = new Map<number, typeof optionRows>()
  const blanksByQuestion = new Map<number, typeof blankRows>()

  for (const o of optionRows) {
    const list = optionsByQuestion.get(o.questionId)
    if (list)
      list.push(o)
    else optionsByQuestion.set(o.questionId, [o])
  }
  for (const b of blankRows) {
    const list = blanksByQuestion.get(b.questionId)
    if (list)
      list.push(b)
    else blanksByQuestion.set(b.questionId, [b])
  }

  return questionRows.map((q) => {
    const base = {
      id: q.id,
      text: q.text,
      categoryId: q.categoryId,
      category: q.categoryId === null ? null : categoryById.get(q.categoryId) ?? null,
      courseId: q.courseId,
    }

    if (q.type === '填空题') {
      const textArr = (blanksByQuestion.get(q.id) ?? []).map(b => b.text)
      return {
        ...base,
        type: '填空题' as const,
        blanks: textArr,
        answer: textArr,
      }
    }

    return {
      ...base,
      type: q.type as '单选题' | '判断题' | '多选题',
      options: (optionsByQuestion.get(q.id) ?? []).map(o => ({ label: o.label, text: o.text })),
      answer: q.answer,
    }
  })
}

interface StoredQuestion {
  type: string
  text: string
  answer: string
  categoryId: number | null
  courseId: number | null
  options: { label: string, text: string }[]
  blanks: string[]
}

/**
 * 全量保存题目。
 *
 * D1 不支持交互式事务（读取后依据结果再决定写入），因此拆成两步：
 *   1. 一次性读出全部题目及其子表，在内存中比算出差异；
 *   2. 把差异攒成语句，用 db.batch() 原子提交。
 *
 * 新增题目采用「父表插入 + 子表插入」两段 batch：子表需要父表的自增 id，
 * 只能等父表落库后再写。已有 id 的题目（前端全量提交的常规路径）不受影响。
 */
export async function saveQuestionsToDatabase(db: DB, input: Question[]): Promise<Question[]> {
  const [existingRows, existingOptions, existingBlanks] = await Promise.all([
    db.select().from(questions),
    db.select().from(options),
    db.select().from(blanks).orderBy(asc(blanks.order)),
  ])

  const existing = new Map<number, StoredQuestion>()
  for (const q of existingRows) {
    existing.set(q.id, {
      type: q.type,
      text: q.text,
      answer: q.answer,
      categoryId: q.categoryId,
      courseId: q.courseId,
      options: [],
      blanks: [],
    })
  }
  for (const o of existingOptions)
    existing.get(o.questionId)?.options.push({ label: o.label, text: o.text })
  for (const b of existingBlanks)
    existing.get(b.questionId)?.blanks.push(b.text)

  const inputIds = input
    .map(q => q.id)
    .filter((id): id is number => typeof id === 'number')

  const idsToDelete = existingRows.map(q => q.id).filter(id => !inputIds.includes(id))

  // 待写入题目，按「新增」与「更新」分开收集
  const toInsert: { data: typeof questions.$inferInsert, children: StoredQuestion }[] = []
  const toUpdate: { id: number, data: typeof questions.$inferInsert, children: StoredQuestion }[] = []

  for (const q of input) {
    const isFill = q.type === '填空题'
    const children: StoredQuestion = {
      type: q.type,
      text: q.text,
      answer: isFill ? '' : q.answer,
      categoryId: q.categoryId ?? null,
      courseId: q.courseId ?? null,
      options: isFill ? [] : q.options.map(o => ({ label: o.label, text: o.text })),
      blanks: isFill ? q.blanks : [],
    }

    const dbQ = typeof q.id === 'number' ? existing.get(q.id) : undefined

    // 走「更新」分支时 q.id 必然是数字，此处排除 undefined 以满足类型
    if (!dbQ || typeof q.id !== 'number') {
      toInsert.push({
        data: {
          type: children.type,
          text: children.text,
          answer: children.answer,
          categoryId: children.categoryId,
          courseId: children.courseId,
        },
        children,
      })
      continue
    }

    // 内容未变化则跳过，避免无谓写入
    const optionsChanged = dbQ.options.length !== children.options.length
      || children.options.some((opt) => {
        const old = dbQ.options.find(o => o.label === opt.label)
        return !old || old.text !== opt.text
      })
    const blanksChanged = dbQ.blanks.length !== children.blanks.length
      || children.blanks.some((b, idx) => b !== dbQ.blanks[idx])

    const unchanged = dbQ.type === children.type
      && dbQ.text === children.text
      && dbQ.answer === children.answer
      && dbQ.categoryId === children.categoryId
      && dbQ.courseId === children.courseId
      && !optionsChanged
      && !blanksChanged

    if (unchanged)
      continue

    toUpdate.push({
      id: q.id,
      data: {
        type: children.type,
        text: children.text,
        answer: children.answer,
        categoryId: children.categoryId,
        courseId: children.courseId,
      },
      children,
    })
  }

  // 第一步：删除 + 更新（子表重建）+ 无子数据的纯文本新题，一次 batch 提交
  const updateIds = toUpdate.map(u => u.id)
  const statements: any[] = []

  if (idsToDelete.length > 0)
    statements.push(db.delete(questions).where(inArray(questions.id, idsToDelete)))

  // 子表先清空再重建，顺序不可调换
  if (updateIds.length > 0) {
    statements.push(db.delete(options).where(inArray(options.questionId, updateIds)))
    statements.push(db.delete(blanks).where(inArray(blanks.questionId, updateIds)))
    for (const u of toUpdate)
      statements.push(db.update(questions).set(u.data).where(eq(questions.id, u.id)))

    for (const u of toUpdate) {
      if (u.children.options.length > 0) {
        statements.push(db.insert(options).values(
          u.children.options.map(o => ({ label: o.label, text: o.text, questionId: u.id })),
        ))
      }
      if (u.children.blanks.length > 0) {
        statements.push(db.insert(blanks).values(
          u.children.blanks.map((text, order) => ({ text, order, questionId: u.id })),
        ))
      }
    }
  }

  if (statements.length > 0)
    await runBatch(db, statements)

  // 第二步：新增题目需要先拿自增 id，再补写子表
  if (toInsert.length > 0) {
    const created = await runBatch(
      db,
      toInsert.map(item => db.insert(questions).values(item.data).returning({ id: questions.id })),
    ) as { id: number }[][]

    const childStatements: any[] = []
    created.forEach((rows, index) => {
      const questionId = rows[0]?.id
      if (questionId === undefined)
        return
      const { options: opt, blanks: blk } = toInsert[index].children
      if (opt.length > 0) {
        childStatements.push(db.insert(options).values(
          opt.map(o => ({ label: o.label, text: o.text, questionId })),
        ))
      }
      if (blk.length > 0) {
        childStatements.push(db.insert(blanks).values(
          blk.map((text, order) => ({ text, order, questionId })),
        ))
      }
    })

    if (childStatements.length > 0)
      await runBatch(db, childStatements)
  }

  return await getQuestions(db)
}

/**
 * 增量写入单条题目：带 id 且已存在则更新，否则新增。
 *
 * 与全量保存的区别是不删除任何未提交的题目，适合通过 API 逐条维护。
 */
export async function upsertQuestion(db: DB, input: Question): Promise<Question> {
  const isFill = input.type === '填空题'
  const data = {
    type: input.type,
    text: input.text,
    answer: isFill ? '' : input.answer,
    categoryId: input.categoryId ?? null,
    courseId: input.courseId ?? null,
  }

  let questionId = input.id
  const exists = typeof questionId === 'number'
    ? (await db.select({ id: questions.id }).from(questions).where(eq(questions.id, questionId)).limit(1)).length > 0
    : false

  if (exists && typeof questionId === 'number') {
    await db.update(questions).set(data).where(eq(questions.id, questionId))
  }
  else {
    const created = await db.insert(questions).values(data).returning({ id: questions.id })
    questionId = created[0].id
  }

  // 子表按「先清后建」重建，与全量保存保持一致
  const statements: any[] = [
    db.delete(options).where(eq(options.questionId, questionId)),
    db.delete(blanks).where(eq(blanks.questionId, questionId)),
  ]
  if (!isFill && input.options.length > 0) {
    statements.push(db.insert(options).values(
      input.options.map(o => ({ label: o.label, text: o.text, questionId })),
    ))
  }
  if (isFill && input.blanks.length > 0) {
    statements.push(db.insert(blanks).values(
      input.blanks.map((text, order) => ({ text, order, questionId })),
    ))
  }
  await runBatch(db, statements)

  const saved = (await getQuestions(db)).find(q => q.id === questionId)
  if (!saved)
    throw new Error('题目写入后未能读回')
  return saved
}

/**
 * 删除单条题目，返回是否确实删掉了（题目不存在时为 false）。
 */
export async function deleteQuestion(db: DB, id: number): Promise<boolean> {
  const removed = await db.delete(questions).where(eq(questions.id, id)).returning({ id: questions.id })
  return removed.length > 0
}

/**
 * 读取课程（含分类）
 */
export async function getCourses(db: DB) {
  const [courseRows, categoryRows] = await Promise.all([
    db.select().from(courses).orderBy(asc(courses.id)),
    db.select().from(categories).orderBy(asc(categories.id)),
  ])

  return courseRows.map(c => ({
    id: c.id,
    name: c.name,
    categories: categoryRows.filter(cat => cat.courseId === c.id),
  }))
}

interface CourseInput {
  id?: number
  name: string
  categories?: { id?: number, name: string }[]
}

/**
 * 全量保存课程及其分类。
 *
 * 分类依赖课程 id，新建课程需先落库拿到自增 id，因此按课程逐个提交。
 */
export async function saveCoursesToDatabase(db: DB, input: CourseInput[]) {
  const [existingCourses, existingCategories] = await Promise.all([
    db.select().from(courses),
    db.select().from(categories),
  ])

  const inputIds = input
    .map(c => c.id)
    .filter((id): id is number => typeof id === 'number')

  const coursesToDelete = existingCourses
    .map(c => c.id)
    .filter(id => !inputIds.includes(id))

  // 删除被移除的课程（分类由外键级联删除）
  if (coursesToDelete.length > 0)
    await db.delete(courses).where(inArray(courses.id, coursesToDelete))

  for (const c of input) {
    let courseId = c.id

    if (typeof courseId === 'number') {
      await db.update(courses).set({ name: c.name }).where(eq(courses.id, courseId))
    }
    else {
      const created = await db.insert(courses).values({ name: c.name }).returning({ id: courses.id })
      courseId = created[0].id
    }

    const inputCategories = c.categories ?? []
    const inputCatIds = inputCategories
      .map(cat => cat.id)
      .filter((id): id is number => typeof id === 'number')

    const catsToDelete = existingCategories
      .filter(cat => cat.courseId === courseId && !inputCatIds.includes(cat.id))
      .map(cat => cat.id)

    const statements: any[] = []
    if (catsToDelete.length > 0)
      statements.push(db.delete(categories).where(inArray(categories.id, catsToDelete)))

    for (const cat of inputCategories) {
      if (typeof cat.id === 'number')
        statements.push(db.update(categories).set({ name: cat.name }).where(eq(categories.id, cat.id)))
      else
        statements.push(db.insert(categories).values({ name: cat.name, courseId }))
    }

    if (statements.length > 0)
      await runBatch(db, statements)
  }

  return await getCourses(db)
}

/**
 * 批量绑定题目的课程与分类
 */
export async function batchBindQuestions(
  db: DB,
  questionIds: number[],
  courseId: number | null,
  categoryId: number | null,
) {
  let finalCategoryId = categoryId

  if (courseId === null) {
    finalCategoryId = null
  }
  else if (finalCategoryId !== null) {
    const cat = await db.select().from(categories).where(eq(categories.id, finalCategoryId)).limit(1)
    if (cat.length === 0)
      throw new Error('所选分类不存在')
    if (cat[0].courseId !== courseId)
      throw new Error('所选分类不属于该课程')
  }

  await db.update(questions)
    .set({ courseId, categoryId: finalCategoryId })
    .where(inArray(questions.id, questionIds))
}
