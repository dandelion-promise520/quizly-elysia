FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# 复制 root 依赖定义及所有 workspace 子包的 package.json
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# 安装依赖（忽略开发相关的 postinstall 脚本，如 simple-git-hooks 等）
RUN bun install --frozen-lockfile --ignore-scripts

# 复制整个项目以用于生成和构建
COPY . .

# 进入后端目录，生成 Prisma 客户端（注入临时的 DATABASE_URL 以绕过构建期的配置验证）
WORKDIR /app/apps/backend
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" bun prisma generate

# 暴露 Elysia 端口
EXPOSE 3000

ENV NODE_ENV=production

# 运行数据库迁移并启动服务
CMD ["sh", "-c", "bun prisma migrate deploy && bun run src/index.ts"]
