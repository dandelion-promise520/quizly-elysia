/**
 * 使用项目根目录的 questions.json 重建 SQLite 数据库内容。
 *
 * 用法（在 apps/backend 目录下）：
 *   DATABASE_URL="file:./prisma/dev.db" bun run prisma/seed.ts
 *
 * 说明：
 * - 会先清空两张子表与题目表，再按 questions.json 重建，属于幂等操作；
 * - 保留 JSON 中原始的 courseId / categoryId / id，避免数据错位。
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { prisma } from '../src/lib/prisma'

interface SeedOption {
  label: string
  text: string
}

interface SeedQuestion {
  id: number
  type: string
  text: string
  options?: SeedOption[]
  blanks?: string[]
  answer: string | string[]
  categoryId: number | null
  courseId: number | null
  category?: { id: number, name: string, courseId: number } | null
}

async function main() {
  const jsonPath = path.resolve(import.meta.dir, '../../../questions.json')
  const raw = await readFile(jsonPath, 'utf-8')
  const questions = JSON.parse(raw) as SeedQuestion[]

  // 1. 从题目里反推出课程与分类，保证与题目数据一致
  const courseMap = new Map<number, string>()
  const categoryMap = new Map<number, { name: string, courseId: number }>()

  for (const q of questions) {
    if (q.category && q.categoryId !== null) {
      categoryMap.set(q.categoryId, {
        name: q.category.name,
        courseId: q.category.courseId,
      })
    }
  }

  // 课程名在 JSON 中不存在，按 courseId 顺序命名，可在后台再改
  const courseIds = [...new Set([...categoryMap.values()].map(c => c.courseId))].sort((a, b) => a - b)
  courseIds.forEach((id, index) => {
    courseMap.set(id, `课程${index + 1}`)
  })

  await prisma.$transaction(async (tx) => {
    // 2. 清空旧数据（先子表后主表，避免外键约束）
    await tx.option.deleteMany()
    await tx.blank.deleteMany()
    await tx.question.deleteMany()
    await tx.category.deleteMany()
    await tx.course.deleteMany()

    // 3. 重建课程
    for (const [id, name] of courseMap) {
      await tx.course.create({ data: { id, name } })
    }

    // 4. 重建分类
    for (const [id, cat] of categoryMap) {
      await tx.category.create({
        data: { id, name: cat.name, courseId: cat.courseId },
      })
    }

    // 5. 重建题目
    for (const q of questions) {
      const isFill = q.type === '填空题'
      const blanks = isFill ? (q.blanks ?? []) : []

      await tx.question.create({
        data: {
          id: q.id,
          type: q.type,
          text: q.text,
          // 填空题的答案存在 Blank 表里，question.answer 留空，与原后端逻辑一致
          answer: isFill ? '' : String(q.answer),
          categoryId: q.categoryId,
          courseId: q.courseId,
          ...(isFill
            ? {
                Blank: {
                  create: blanks.map((text, order) => ({ text, order })),
                },
              }
            : {
                Option: {
                  create: (q.options ?? []).map(o => ({ label: o.label, text: o.text })),
                },
              }),
        },
      })
    }
  })

  const [courseCount, categoryCount, questionCount, optionCount, blankCount] = await Promise.all([
    prisma.course.count(),
    prisma.category.count(),
    prisma.question.count(),
    prisma.option.count(),
    prisma.blank.count(),
  ])

  console.log('✅ 数据重建完成')
  console.log(`   课程 ${courseCount} / 分类 ${categoryCount} / 题目 ${questionCount}`)
  console.log(`   选项 ${optionCount} / 填空 ${blankCount}`)
}

main()
  .catch((error) => {
    console.error('❌ 数据重建失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
