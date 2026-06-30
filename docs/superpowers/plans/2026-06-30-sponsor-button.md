# 微信打赏悬浮按钮实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在主答题页面添加一个低调且精致的微信打赏悬浮按钮，支持点击弹出微信打赏码。

**Architecture:** 创建一个独立的 `SponsorButton` 组件。组件利用 `motion` (来自 `motion/react`) 处理 Popover 卡片的弹出和悬浮按钮的微动效。将组件集成至 `QuizPage`，定位在原有数据库帮助按钮上方。

**Tech Stack:** React, Tailwind CSS, motion (framer-motion), lucide-react.

## Global Constraints
- Commit 消息必须使用中文。
- 全部使用中文进行日常沟通和代码注释。
- 精准修改，保持现有风格，不进行非必要的重构；代码力求简洁。

---

### Task 1: 复制并准备图片资源

**Files:**
- Create: `apps/frontend/public/sponsor-qr.jpg`
- Source: `31f80faa5507932488340a03f22f73e3.jpg`

- [ ] **Step 1: 复制源图片到 public 目录下**

  执行命令：
  ```pwsh
  Copy-Item -Path "31f80faa5507932488340a03f22f73e3.jpg" -Destination "apps/frontend/public/sponsor-qr.jpg"
  ```

- [ ] **Step 2: 验证图片是否存在**

  执行命令：
  ```pwsh
  Test-Path "apps/frontend/public/sponsor-qr.jpg"
  ```
  预期输出：`True`

- [ ] **Step 3: 提交修改**

  执行命令（使用 BypassSandbox: true）：
  ```bash
  git add apps/frontend/public/sponsor-qr.jpg
  git commit -m "feat: 导入打赏码图片"
  ```

---

### Task 2: 创建 SponsorButton 组件

**Files:**
- Create: `apps/frontend/src/components/SponsorButton.tsx`

- [ ] **Step 1: 编写 SponsorButton 组件代码**

  新建 `apps/frontend/src/components/SponsorButton.tsx` 文件，内容如下：
  ```tsx
  import { Coffee } from 'lucide-react'
  import { AnimatePresence, motion } from 'motion/react'
  import { useEffect, useRef, useState } from 'react'

  export default function SponsorButton() {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // 点击外部区域关闭 Popover
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    return (
      <div ref={containerRef} className="fixed bottom-22 right-7 z-40">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="absolute bottom-14 right-0 bg-white border border-slate-100 p-3 rounded-2xl shadow-xl w-38 flex flex-col items-center gap-2"
            >
              <span className="text-[10px] font-bold text-slate-400 select-none">
                请作者喝杯咖啡 ☕️
              </span>
              <div className="relative w-32 h-32 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center p-1">
                <img
                  src="/sponsor-qr.jpg"
                  alt="微信打赏码"
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-11 h-11 bg-white/80 border border-slate-200 shadow-sm rounded-full backdrop-blur-md transition-opacity duration-300 cursor-pointer ${
            isOpen ? 'opacity-100 text-teal-600 border-teal-200' : 'opacity-40 hover:opacity-100 text-slate-500 hover:text-slate-800'
          }`}
          title="支持作者"
        >
          <Coffee className="w-5 h-5" />
        </motion.button>
      </div>
    )
  }
  ```

- [ ] **Step 2: 运行编译和代码格式检查**

  在根目录下执行：
  ```bash
  bun lint
  bun typecheck
  ```
  确保新文件没有 Lint 和 TypeScript 错误。

- [ ] **Step 3: 提交组件**

  执行命令（使用 BypassSandbox: true）：
  ```bash
  git add apps/frontend/src/components/SponsorButton.tsx
  git commit -m "feat: 创建 SponsorButton 打赏组件"
  ```

---

### Task 3: 在 QuizPage 中引入并集成组件

**Files:**
- Modify: `apps/frontend/src/components/QuizPage.tsx`

- [ ] **Step 1: 修改 QuizPage.tsx 引入 SponsorButton**

  在 `apps/frontend/src/components/QuizPage.tsx` 的导入区域引入 `SponsorButton`：
  ```tsx
  import Scoreboard from './Scoreboard'
  import SponsorButton from './SponsorButton' // 新增
  ```

- [ ] **Step 2: 在 JSX 渲染树中挂载 SponsorButton**

  在 `QuizPage.tsx` 底部，渲染 `<DbSchemaHelper />` 的地方，并排渲染 `<SponsorButton />`：
  ```tsx
        </main>
        {isDbOrSqlActive && <DbSchemaHelper />}
        <SponsorButton /> {/* 新增 */}
      </div>
    )
  }
  ```

- [ ] **Step 3: 运行代码规范和类型检查**

  在根目录下执行：
  ```bash
  bun lint
  bun typecheck
  ```
  预期：无任何错误。

- [ ] **Step 4: 提交修改**

  执行命令（使用 BypassSandbox: true）：
  ```bash
  git add apps/frontend/src/components/QuizPage.tsx
  git commit -m "feat: 在答题页面挂载打赏悬浮按钮"
  ```

---

### Task 4: 本地调试与效果验证

**Files:**
- Verify locally.

- [ ] **Step 1: 运行本地开发服务**

  在根目录下启动开发环境：
  ```bash
  bun dev
  ```
  等待 Vite 服务启动，在浏览器中打开前端地址（通常为 http://localhost:5173/）。

- [ ] **Step 2: 验证 UI 和交互**
  - 确认页面右下角“数据库表结构”正上方，有一个小咖啡杯 ☕️ 悬浮按钮，且默认呈半透明状态（40% 透明度）。
  - 悬浮鼠标，其是否变为 100% 透明度并轻微放大。
  - 点击按钮，确认在按钮上方以平滑渐现的弹性动画弹出微信打赏码卡片，并展示正确的打赏码。
  - 再次点击按钮或在卡片外任意位置点击，确认卡片能正常收回。
