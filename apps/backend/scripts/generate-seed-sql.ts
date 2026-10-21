/**
 * 由 questions.json 生成 D1 种子数据 SQL 文件。
 *
 * 用法（在 apps/backend 目录下）：
 *   bun run seed:generate
 *
 * 生成后的导入方式：
 *   本地：bunx wrangler d1 execute quizly --local  --file=./scripts/seed.sql
 *   线上：bunx wrangler d1 execute quizly --remote --file=./scripts/seed.sql
 *
 * 说明：
 * - 采用 SQL 文件而不是脚本直连 D1，是因为 wrangler 的 d1 execute 是官方支持的导入通道，
 *   不依赖本地模拟 D1 绑定；
 * - 语句以幂等方式编写（先清空再插入），可重复执行。
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

interface SeedQuestion {
  id: number
  type: string
  text: string
  options?: { label: string, text: string }[]
  blanks?: string[]
  answer: string | string[]
  categoryId: number | null
  courseId: number | null
  category?: { id: number, name: string, courseId: number } | null
}

/** 转义 SQLite 字符串字面量中的单引号 */
function sqlStr(value: string): string {
  return `'${value.replace(/'/g, '\'\'')}'`
}

/** 处理可空的外键字段（数字或 NULL） */
function sqlNullableId(value: number | null | undefined): string {
  return value === null || value === undefined ? 'NULL' : String(value)
}

async function main() {
  const jsonPath = path.resolve(import.meta.dir, '../../../questions.json')
  const outPath = path.resolve(import.meta.dir, 'seed.sql')

  const raw = await readFile(jsonPath, 'utf-8')
  const questionsJson = JSON.parse(raw) as SeedQuestion[]

  // 1. 从题目反推课程与分类
  const categoryMap = new Map<number, { name: string, courseId: number }>()
  for (const q of questionsJson) {
    if (q.category && q.categoryId !== null)
      categoryMap.set(q.categoryId, { name: q.category.name, courseId: q.category.courseId })
  }

  const courseIds = [...new Set([...categoryMap.values()].map(c => c.courseId))].sort((a, b) => a - b)
  const courseMap = new Map(courseIds.map((id, index) => [id, `课程${index + 1}`]))

  const lines: string[] = [
    '-- 由 scripts/generate-seed-sql.ts 自动生成，请勿手动修改',
    '-- 数据来源：questions.json',
    '',
    '-- 清空旧数据（先子表后主表）',
    'DELETE FROM `Option`;',
    'DELETE FROM `Blank`;',
    'DELETE FROM `Question`;',
    'DELETE FROM `Category`;',
    'DELETE FROM `Course`;',
    '',
    '-- 重建课程',
  ]

  for (const [id, name] of courseMap)
    lines.push(`INSERT INTO \`Course\` (\`id\`, \`name\`) VALUES (${id}, ${sqlStr(name)});`)

  lines.push('', '-- 重建分类')
  for (const [id, cat] of categoryMap)
    lines.push(`INSERT INTO \`Category\` (\`id\`, \`name\`, \`course_id\`) VALUES (${id}, ${sqlStr(cat.name)}, ${cat.courseId});`)

  lines.push('', '-- 重建题目')
  const optionLines: string[] = []
  const blankLines: string[] = []

  for (const q of questionsJson) {
    const isFill = q.type === '填空题'
    // 填空题答案存在 Blank 表，answer 留空，与原后端逻辑一致
    const answer = isFill ? '' : String(q.answer)
    lines.push(
      `INSERT INTO \`Question\` (\`id\`, \`type\`, \`text\`, \`answer\`, \`category_id\`, \`course_id\`) `
      + `VALUES (${q.id}, ${sqlStr(q.type)}, ${sqlStr(q.text)}, ${sqlStr(answer)}, `
      + `${sqlNullableId(q.categoryId)}, ${sqlNullableId(q.courseId)});`,
    )

    if (isFill) {
      ;(q.blanks ?? []).forEach((text, order) => {
        blankLines.push(
          `INSERT INTO \`Blank\` (\`text\`, \`order\`, \`question_id\`) VALUES (${sqlStr(text)}, ${order}, ${q.id});`,
        )
      })
    }
    else {
      for (const o of q.options ?? []) {
        optionLines.push(
          `INSERT INTO \`Option\` (\`label\`, \`text\`, \`question_id\`) VALUES (${sqlStr(o.label)}, ${sqlStr(o.text)}, ${q.id});`,
        )
      }
    }
  }

  lines.push('', '-- 重建选项', ...optionLines)
  lines.push('', '-- 重建填空', ...blankLines)
  lines.push('')

  await writeFile(outPath, lines.join('\n'), 'utf-8')

  console.log(`已生成 ${path.relative(process.cwd(), outPath)}`)
  console.log(`   课程 ${courseMap.size} / 分类 ${categoryMap.size} / 题目 ${questionsJson.length}`)
  console.log(`   选项 ${optionLines.length} / 填空 ${blankLines.length}`)
}

await main()
