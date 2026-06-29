# Quizly AI Agent Guidelines & Context

本文件为 AI Agent 提示指南，旨在提供本项目开发的关键上下文与规范要求。

## 1. 沟通与协作规范
- **语言要求**：全部使用 **中文** 进行日常沟通和代码注释。
- **Git Commit**：Commit message 必须使用 **中文**。
- **修改原则**：精准修改，保持现有风格，不进行非必要的重构；代码力求简洁，不添加不必要的抽象或推测性设计。

## 2. 目录与技术栈结构

本项目是基于 [Bun](https://bun.sh/) Workspaces 和 [Turborepo](https://turbo.build/) 的单体大仓（Monorepo）。

- **根目录配置文件**：
  - 包管理配置：[package.json](file:///D:/workSpace/Code/Project/quizly/package.json)
  - 任务编排配置：[turbo.json](file:///D:/workSpace/Code/Project/quizly/turbo.json)
- **前端应用**（[apps/frontend](file:///D:/workSpace/Code/Project/quizly/apps/frontend)）：
  - **技术栈**：Vite + React + Tailwind CSS (v4) + shadcn/ui
  - **组件配置**：[components.json](file:///D:/workSpace/Code/Project/quizly/apps/frontend/components.json)
- **后端服务**（[apps/backend](file:///D:/workSpace/Code/Project/quizly/apps/backend)）：
  - **技术栈**：ElysiaJS + Prisma + PostgreSQL
  - **数据库 Schema**：[schema.prisma](file:///D:/workSpace/Code/Project/quizly/apps/backend/prisma/schema.prisma)
  - **Prisma 客户端输出目录**：`apps/backend/generated/prisma`

## 3. 常用开发命令

在根目录下，使用 [Bun](https://bun.sh/) 统一调度：

- **启动所有服务本地开发**：
  ```bash
  bun dev
  ```
- **构建整个单仓**：
  ```bash
  bun build
  ```
- **代码规范检查 & 自动修复**（采用 `@antfu/eslint-config`）：
  ```bash
  bun lint
  bun lint:fix
  ```
- **类型检查**：
  ```bash
  bun typecheck
  ```
- **单模块过滤操作**（Turborepo 过滤）：
  ```bash
  bun --filter frontend dev
  bun --filter backend dev
  ```

## 4. 后端 Prisma 常用命令

在对 [schema.prisma](file:///D:/workSpace/Code/Project/quizly/apps/backend/prisma/schema.prisma) 进行修改后，可通过以下命令在 [apps/backend](file:///D:/workSpace/Code/Project/quizly/apps/backend) 目录下操作：

- **生成 Prisma Client**：
  ```bash
  bun --cwd apps/backend prisma generate
  ```
- **数据库迁移**：
  ```bash
  bun --cwd apps/backend prisma migrate dev
  ```
- **打开 Prisma Studio 查看数据**：
  ```bash
  bun --cwd apps/backend prisma studio
  ```
