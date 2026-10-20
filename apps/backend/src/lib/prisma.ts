import process from 'node:process'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../../generated/prisma/client.js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set')
}

// 使用 libsql adapter（纯 JS 实现，兼容 Bun）；
// better-sqlite3 依赖原生模块，在 Bun 下无法加载
const adapter = new PrismaLibSql({ url: databaseUrl })
export const prisma = new PrismaClient({ adapter })
