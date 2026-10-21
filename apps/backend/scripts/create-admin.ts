/**
 * 预置管理员账号。
 *
 * Better Auth 关闭了注册接口，账号只能由此脚本写入：
 *   bun scripts/create-admin.ts <邮箱> <密码>
 *
 * 密码用 Better Auth 自己的 scrypt 实现哈希，保证与登录校验一致。
 */
import process from 'node:process'
import { hashPassword } from 'better-auth/crypto'

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('用法：bun scripts/create-admin.ts <邮箱> <密码>')
  process.exit(1)
}

if (password.length < 8) {
  console.error('密码至少 8 位')
  process.exit(1)
}

const now = Date.now()
const userId = crypto.randomUUID()
const accountId = crypto.randomUUID()
const passwordHash = await hashPassword(password)

// Better Auth 的邮箱密码账号：providerId 固定为 credential，accountId 与 userId 相同
const statements = [
  `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
   VALUES ('${userId}', '管理员', '${email}', 1, ${now}, ${now});`,
  `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
   VALUES ('${accountId}', '${userId}', 'credential', '${userId}', '${passwordHash}', ${now}, ${now});`,
]

console.log(statements.join('\n'))
