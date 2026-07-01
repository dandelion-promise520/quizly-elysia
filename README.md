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
- **后端框架**：[ElysiaJS](https://elysiajs.com/) (基于 Bun 的高性能 Web 框架)
- **ORM**：[Prisma](https://www.prisma.io/)
- **数据库**：PostgreSQL
- **缓存**：Redis

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
在启动服务前，需要配置后端的环境变量：
1. 进入后端目录：`apps/backend/`
2. 创建或修改 `.env` 文件，填入以下变量（可以参考 `.env.example`）：
   ```env
   DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db_name>"
   ADMIN_PASSWORD="your-admin-password"
   REDIS_URL="<redis_host>:<redis_port>"
   ```

### 3. 安装依赖
在项目根目录下执行以下命令安装所有依赖：
```bash
bun install
```

### 4. 数据库迁移与生成
在首次启动或修改了数据库 Schema（`apps/backend/prisma/schema.prisma`）后，需要同步数据库并生成 Prisma 客户端：
```bash
# 生成 Prisma Client 客户端代码
bun --cwd apps/backend prisma generate

# 数据库迁移
bun --cwd apps/backend prisma migrate dev
```

### 5. 启动开发服务器
在根目录下执行以下命令，将通过 Turborepo 同时启动前端和后端的开发服务：
```bash
bun dev
```

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
构建整个项目（包括共享类型定义、前端和后端）：
```bash
bun build
```

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
