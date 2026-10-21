import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit 配置。
 *
 * 仅使用 `generate` 生成 SQL 迁移文件，再由 wrangler 应用到 D1：
 *   bun --cwd apps/backend drizzle-kit generate
 *   bunx wrangler d1 migrations apply quizly --local   # 本地
 *   bunx wrangler d1 migrations apply quizly --remote  # 线上
 *
 * 不使用 driver: 'd1-http'，避免依赖 Cloudflare API Token。
 */
export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './drizzle',
  dialect: 'sqlite',
})
