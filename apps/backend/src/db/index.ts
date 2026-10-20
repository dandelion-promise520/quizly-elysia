import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

/**
 * 创建 Drizzle 实例。
 *
 * D1 绑定通过 Elysia 的 `decorate` 注入到请求上下文，不在此处做模块级单例，
 * 避免 Workers 多 isolate 环境下的跨请求污染。
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type DB = ReturnType<typeof createDb>

export * from './schema'
