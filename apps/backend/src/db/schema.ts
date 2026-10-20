import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * 课程
 */
export const courses = sqliteTable('Course', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
})

/**
 * 分类（隶属于课程，课程删除时级联删除）
 */
export const categories = sqliteTable(
  'Category',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
  },
  table => [uniqueIndex('Category_name_courseId_key').on(table.name, table.courseId)],
)

/**
 * 题目（关联课程与分类，二者删除时置空）
 */
export const questions = sqliteTable('Question', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  text: text('text').notNull(),
  answer: text('answer').notNull().default(''),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
})

/**
 * 选择题选项（题目删除时级联删除）
 */
export const options = sqliteTable('Option', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  text: text('text').notNull(),
  questionId: integer('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
})

/**
 * 填空题的空（题目删除时级联删除）
 */
export const blanks = sqliteTable('Blank', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  order: integer('order').notNull().default(0),
  questionId: integer('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
})

export type CourseRow = typeof courses.$inferSelect
export type CategoryRow = typeof categories.$inferSelect
export type QuestionRow = typeof questions.$inferSelect
export type OptionRow = typeof options.$inferSelect
export type BlankRow = typeof blanks.$inferSelect
