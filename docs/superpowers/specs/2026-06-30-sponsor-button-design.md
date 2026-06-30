# 微信打赏悬浮按钮设计方案

本设计旨在主答题界面添加一个低调、精致的微信打赏悬浮按钮，在不干扰用户正常作答的前提下，为有打赏意愿的用户提供打赏通道。

## 1. 资源管理

- 源打赏码图片路径：`d:\workSpace\Code\Project\quizly-elysia\31f80faa5507932488340a03f22f73e3.jpg`
- 目标存放路径：`apps/frontend/public/sponsor-qr.jpg`
- 引用路径：前端通过绝对路径 `/sponsor-qr.jpg` 引用。

## 2. 组件设计与交互

在前端 `apps/frontend/src/components` 目录下新建 `SponsorButton.tsx` 组件。

### 2.1 悬浮按钮 (Floating Button)
- **定位**：固定定位在页面右下角。
  - 考虑到现有数据库帮助按钮 `DbSchemaHelper` 位于 `fixed bottom-6 right-6`，打赏按钮将放置在其正上方，定位设置为 `fixed bottom-22 right-7`（相当于 `bottom: 5.5rem; right: 1.75rem;`），以保持视觉上的对齐和层次感。
- **样式**：
  - 图标：使用 `lucide-react` 中的 `Coffee` ☕️ 图标。
  - 外观：圆形按钮，背景使用 `bg-white/80 border border-slate-200 shadow-sm backdrop-blur-md`。
  - 低调动效：
    - 默认透明度为 `opacity-40`，不抢占视线。
    - 鼠标悬浮 (Hover) 时，透明度渐变为 `opacity-100`，并带有缩放动画 `scale-110`。
    - 鼠标点击 (Tap) 时，轻微收缩 `scale-95`。

### 2.2 气泡卡片 (Popover)
- **展示逻辑**：点击悬浮按钮时，气泡卡片显示；再次点击或点击卡片外的区域时，气泡卡片关闭。
- **定位**：相对于悬浮按钮上方弹出，定位为 `absolute bottom-14 right-0`。
- **动画**：使用 `motion/react` (项目已引入的动效库) 控制气泡卡片的淡入淡出和向上微弹的过渡效果。
- **内容结构**：
  - 微缩标题：`请作者喝杯咖啡 ☕️`（字体大小 `text-xs`，颜色 `text-slate-500`）。
  - 打赏码：微信打赏码图片 `sponsor-qr.jpg`，大小限制为 `w-32 h-32`（圆角 `rounded-lg`，带细微阴影）。
  - 卡片整体样式：白色背景 `bg-white border border-slate-150 p-3 rounded-2xl shadow-xl w-38 flex flex-col items-center gap-2`。

## 3. 组件引入与集成

- 在 `apps/frontend/src/components/QuizPage.tsx` 中引入并渲染 `<SponsorButton />`。
- 其渲染位置与 `<DbSchemaHelper />` 并列，作为全局悬浮元素挂载在 `QuizPage` 根节点下。

## 4. 成功指标与测试验证

- 检查打赏码图片已成功放置到公共目录，并在浏览器中能正常通过 `http://localhost:5173/sponsor-qr.jpg` 访问。
- 打开答题页面，右下角“数据库表结构”上方应出现半透明的咖啡图标。
- 悬浮鼠标在咖啡图标上，确认其透明度变回 100% 并伴有微缩放。
- 点击咖啡图标，能看到带动画效果弹出的微信打赏码卡片。
- 再次点击或在卡片外点击，卡片正常收起。
