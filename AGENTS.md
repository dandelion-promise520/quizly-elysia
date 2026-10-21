# Quizly AI Agent Guidelines & Context

本文件为 AI Agent 提示指南，旨在提供本项目开发的关键上下文与规范要求。

## 1. 沟通与协作规范
- **语言要求**：全部使用 **中文** 进行日常沟通和代码注释。
- **Git Commit**：Commit message 必须使用 **中文**。
- **修改原则**：精准修改，保持现有风格，不进行非必要的重构；代码力求简洁，不添加不必要的抽象或推测性设计。
- **禁止 Emoji**：界面文案、提示语、日志、文档标题一律不使用 emoji（`⚠️` `✅` `💡` `☕️` `🚀` 等）。
  需要视觉标记时用 `lucide-react` 图标组件（如 `<TriangleAlert className="size-3.5" />`），不要塞字符图形。
- **配色**：只用语义 token（`bg-background` `bg-card` `text-foreground` `text-muted-foreground` `border-border`
  `bg-primary` `bg-accent` `bg-success` `bg-warning` `bg-destructive`），基座是 beUI 官方 `theme.css`。
  禁止硬编码 `bg-white` / `text-slate-600` / `text-teal-600` 这类调色板类，也不要自绘品牌色板。

## 1.1 组件使用铁律

- **`src/components/motion/**` 是 beUI 原装组件**，由 registry（`https://beui.dev/r/<name>.json`）直接落盘。
  **不得修改其实现**，也不得为了"适合本项目"删分支、改默认值、砍 api。缺能力就在调用处组合，不要去改库。
  唯一例外：上游类型与本机 TypeScript 严格模式不兼容时，可加最小类型断言，并在旁边写注释说明。
- **调用原装组件时不要覆盖它的样式**。`className` 只用于布局（宽高、flex、间距、`w-full`、`flex-1`），
  不要传 `bg-*` / `text-*` / 圆角 / 字号去改观感，更不要用 `classNames={{ label: ... }}` 逐槽改色。
  组件自带的 variant、size、状态就是设计好的样子，直接选，别自己拼。
- 现成组件优先，顺序：beUI（`components/motion/`）→ shadcn 基础件 → 手写。
  禁止 `bun add`、`shadcn add`（会打坏本机 node_modules），要组件就拉 registry JSON 手工落盘。
- **新增 beUI 组件后必须跑一遍 `eslint --fix`**：上游用双引号加分号，会被本项目 antfu 规则刷一遍；
  `eslint.config.mjs` 里已对 `components/motion/**`、`lib/hooks/**` 放宽三条与上游写法冲突的规则。

## 1.2 交互反馈约定

- 任何会写数据的操作（保存、创建、删除、启停、导入导出、登录登出）**必须给出结果反馈**，
  成功和失败都要有，不能只靠界面变化让用户猜。
- 统一走 `useToast()`（`@/components/toast-provider`，底层是 beUI 的 Animated Toast Stack）：
  `toast.success('题目已保存')` / `toast.error('创建失败', err.message)`。
  失败文案要带原因，别只写"操作失败"。
- 表单内的字段级错误用组件自带能力（`<Input error="..." />`、`<Alert variant="destructive">`），
  不要再手写一行红色小字。整页级错误用 `<Alert>`，别用 div 拼红框。
- 破坏性操作（删除等）要有二次确认，用 beUI `<CenterMorphModal>`。

## 2. 目录与技术栈结构

本项目是基于 [Bun](https://bun.sh/) Workspaces 和 [Turborepo](https://turbo.build/) 的单体大仓（Monorepo）。

- **根目录配置文件**：
  - 包管理配置：[package.json](file:///D:/workSpace/Code/Project/quizly/package.json)
  - 任务编排配置：[turbo.json](file:///D:/workSpace/Code/Project/quizly/turbo.json)
- **前端应用**（[apps/frontend](file:///D:/workSpace/Code/Project/quizly/apps/frontend)）：
  - **技术栈**：Vite + React + Tailwind CSS (v4) + shadcn/ui
  - **组件配置**：[components.json](file:///D:/workSpace/Code/Project/quizly/apps/frontend/components.json)
- **后端服务**（[apps/backend](file:///D:/workSpace/Code/Project/quizly-elysia/apps/backend)）：
  - **技术栈**：ElysiaJS (v2) + Drizzle ORM + Cloudflare D1，运行于 Cloudflare Workers
  - **数据库 Schema**：[schema.ts](file:///D:/workSpace/Code/Project/quizly-elysia/apps/backend/src/db/schema.ts)
  - **数据访问层**：[db.ts](file:///D:/workSpace/Code/Project/quizly-elysia/apps/backend/src/lib/db.ts)
  - **D1 绑定配置**：[wrangler.jsonc](file:///D:/workSpace/Code/Project/quizly-elysia/apps/backend/wrangler.jsonc)（binding 为 `DB`，库名 `quizly`）
  - **种子数据**：`apps/backend/scripts/generate-seed-sql.ts` 由根目录 `questions.json` 生成 `seed.sql`
  - **本地开发**：`wrangler dev`（默认端口 8787），本地 D1 数据存放于 `apps/backend/.wrangler/state`
  - **重要约束**：D1 不支持交互式事务，写操作必须采用「先读 → 内存比对 → `db.batch()` 原子提交」

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

## 4. 后端数据库常用命令

修改 [schema.ts](file:///D:/workSpace/Code/Project/quizly-elysia/apps/backend/src/db/schema.ts) 后，在 [apps/backend](file:///D:/workSpace/Code/Project/quizly-elysia/apps/backend) 目录下操作：

- **生成 SQL 迁移文件**（输出到 `apps/backend/drizzle`）：
  ```bash
  bun --cwd apps/backend db:generate
  ```
- **应用到本地 D1**：
  ```bash
  bun --cwd apps/backend db:migrate:local
  ```
- **应用到线上 D1**：
  ```bash
  bun --cwd apps/backend db:migrate:remote
  ```
- **重建种子数据**（先由 `questions.json` 生成 SQL，再导入）：
  ```bash
  bun --cwd apps/backend db:seed:generate
  bun --cwd apps/backend db:seed:local
  bun --cwd apps/backend db:seed:remote
  ```
- **直接查询本地 D1**：
  ```bash
  bunx wrangler d1 execute quizly --local --command "SELECT COUNT(*) FROM Question"
  ```
