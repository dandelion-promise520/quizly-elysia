# Quizly

Quizly 是一个现代化、轻量级的在线测验与刷题管理系统。该项目采用 Monorepo（单体大仓）架构进行组织，基于 Bun、Turborepo、React 和 ElysiaJS 构建，旨在提供极佳的开发体验与高性能的运行时表现。

## 🚀 技术栈

### 核心架构与工具
- **包管理器与运行时**：[Bun](https://bun.sh/) (v1.3.14+)
- **任务编排**：[Turborepo](https://turbo.build/) (v2)
- **共享包**：[Bun Workspaces](https://bun.sh/docs/install/workspaces)

### 前端应用 (`apps/frontend`)
- **构建工具**：[Vite](https://vite.dev/)
- **前端框架**：[React 19](https://react.dev/)
- **路由管理**：[TanStack Router](https://tanstack.com/router)
- **状态与请求管理**：[TanStack Query (React Query)](https://tanstack.com/query)
- **样式方案**：[Tailwind CSS (v4)](https://tailwindcss.com/)
- **UI 组件库**：[shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) + [Base UI](https://base-ui.com/)
- **动效库**：[Motion](https://motion.dev/)

### 后端服务 (`apps/backend`)
- **后端框架**：[ElysiaJS](https://elysiajs.com/) (v2，运行于 Cloudflare Workers)
- **ORM**：[Drizzle ORM](https://orm.drizzle.team/)（类 SQL 查询语法）
- **数据库**：[Cloudflare D1](https://developers.cloudflare.com/d1/)（SQLite 语义的托管数据库）
- **部署**：Cloudflare Workers

---

## 📁 目录结构

```text
quizly-elysia/
├── apps/
│   ├── frontend/          # React 前端应用
│   └── backend/           # ElysiaJS 后端服务
├── packages/
│   └── types/             # 共享的 TypeScript 类型定义 (@quizly/types)
├── package.json           # 根目录包管理与多包配置
├── turbo.json             # Turborepo 任务编排配置
└── tsconfig.json          # 全局 TypeScript 基础配置
```

---

## 🛠️ 环境准备与本地开发

### 1. 安装 Bun
确保本地已安装 [Bun](https://bun.sh/)。如果在 Windows 下，可通过以下命令安装：
```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 2. 环境配置
本地开发只需配置管理后台密码（`wrangler dev` 会自动加载 `apps/backend/.env`）：
1. 进入后端目录：`apps/backend/`
2. 创建或修改 `.env` 文件（可参考 `.env.example`）：
   ```env
   ADMIN_PASSWORD="your-admin-password"
   ```
   > 线上环境请用 `wrangler secret put ADMIN_PASSWORD` 设置，不要写进仓库。
   > 数据库连接由 `wrangler.jsonc` 中的 D1 绑定提供，无需连接串。

### 3. 安装依赖
在项目根目录下执行以下命令安装所有依赖：
```bash
bun install
```

### 4. 数据库迁移与种子数据
数据库 Schema 定义在 `apps/backend/src/db/schema.ts`，修改后需生成迁移并应用：

```bash
# 由 schema 生成 SQL 迁移文件（输出到 apps/backend/drizzle）
bun --cwd apps/backend db:generate

# 应用到本地 D1（数据位于 apps/backend/.wrangler/state）
bun --cwd apps/backend db:migrate:local

# 应用到线上 D1
bun --cwd apps/backend db:migrate:remote
```

导入初始题库（基于根目录的 `questions.json`，会**清空并重建**数据）：

```bash
# 由 questions.json 生成 seed.sql
bun --cwd apps/backend db:seed:generate

# 导入本地 / 线上 D1
bun --cwd apps/backend db:seed:local
bun --cwd apps/backend db:seed:remote
```

### 5. 启动开发服务器
在根目录下执行以下命令，将通过 Turborepo 同时启动前端和后端的开发服务：
```bash
bun dev
```
后端由 `wrangler dev` 提供（默认 `http://127.0.0.1:8787`），前端 Vite 会把 `/api` 代理到该地址。

*若只想启动单个应用，可使用 Turborepo 过滤器：*
```bash
# 仅启动前端
bun --filter frontend dev

# 仅启动后端
bun --filter backend dev
```

---

## 📦 构建与部署

### 生产环境构建
构建整个项目（包括共享类型定义、前端）：
```bash
bun build
```

### 部署到 Cloudflare（重要）

前后端分别部署，二者通过同域路由协作，因此**不需要配置 CORS**：

| 组件 | 平台 | 说明 |
|---|---|---|
| 后端 | Cloudflare Workers | `apps/backend/wrangler.jsonc`，绑定 D1 `DB` |
| 前端 | Cloudflare Pages | 项目名 `quizly`，构建产物 `apps/frontend/dist` |

部署命令（在 `apps/backend` 目录下）：
```bash
# 首次：应用数据库迁移并导入初始题库
bunx wrangler d1 migrations apply quizly --remote
bunx wrangler d1 execute quizly --remote --file=./scripts/seed.sql

# 发布 Worker
bunx wrangler deploy
```

前端部署（已接入 GitHub，推 `main` 即自动构建）：

| 配置项 | 值 |
|---|---|
| Pages 项目 | `quizly`（GitHub 集成模式） |
| 生产分支 | `main` |
| 构建命令 | `bunx turbo run build --filter=frontend` |
| 产物目录 | `apps/frontend/dist` |
| 环境变量 | `VITE_API_BASE=https://quizly-backend.dandelionpromise.workers.dev/api`、`SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` |

> `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` 是必需的：Cloudflare 构建环境里 bun 的依赖布局会让
> `simple-git-hooks` 的 postinstall 找不到自身 package.json 而报错退出。

手动构建部署（应急用，绕过 Git 构建）：
```bash
cd apps/frontend
VITE_API_BASE=https://quizly-backend.dandelionpromise.workers.dev/api bun run build
../../apps/backend/node_modules/.bin/wrangler.exe pages deploy dist --project-name=quizly --branch=main
```

> 后端已开启 CORS（`origin: '*'`），因此前端跨域直连 Worker 即可，无需为 `/api/*` 配置路由。

> **路由说明**：前端接口地址由 `VITE_API_BASE` 在构建时决定，未设置时回退为相对路径 `/api`
> 并依赖 `vite.config.ts` 里的本地代理，因此本地开发无需改动。

### 关于 D1 的事务限制

D1 不支持交互式事务（即「事务内先读取、再依据结果决定写入」）。因此
[db.ts](apps/backend/src/lib/db.ts) 中的保存逻辑采用：

1. 一次性读出全部相关数据，在内存中比对算出差异；
2. 把差异攒成语句，用 `db.batch()` 原子提交。

新增题目需要父表自增 id，所以拆成「插入父表 → 插入子表」两段 batch。

## 💾 本地存储与版本控制

为了防止网站更新（例如测验数据结构变更）后，用户浏览器中残留的旧版本本地存储（LocalStorage）导致页面加载异常或渲染错误，项目引入了**本地存储版本控制机制**。

### 缓存更新与清理机制
* **核心配置**：在前端的 [useQuizState.ts](file:///D:/workSpace/Code/Project/quizly-elysia/apps/frontend/src/hooks/useQuizState.ts) 中定义了 `STORAGE_VERSION` 常量（例如 `v1.0.0`）。
* **自动校验**：当用户访问网页时，系统会读取本地缓存并校验其版本号。如果版本号不匹配或缺失，系统将**自动清除旧版缓存**并重新初始化，确保数据兼容性。

### 开发者操作指南
当你在后续迭代中**修改了本地存储的数据结构**时，请务必执行以下步骤：
1. 打开 [useQuizState.ts](file:///D:/workSpace/Code/Project/quizly-elysia/apps/frontend/src/hooks/useQuizState.ts)。
2. 修改 `STORAGE_VERSION` 常量（例如将 `'v1.0.0'` 改为 `'v1.0.1'`）。
3. 提交并发布。用户在访问新版网页时，其本地的陈旧缓存就会被安全地自动清理。

---

## 🧼 代码规范与质量

本项目使用 [@antfu/eslint-config](https://github.com/antfu/eslint-config) 进行代码格式化和规范检查。

- **代码规范检查**：
  ```bash
  bun lint
  ```
- **自动修复 Lint 问题**：
  ```bash
  bun lint:fix
  ```
- **类型检查**：
  ```bash
  bun typecheck
  ```

### Git Hooks
项目配置了 `simple-git-hooks`。在每次执行 `git commit` 时，会自动运行类型检查和对暂存区代码的自动格式化，确保提交的代码质量。
