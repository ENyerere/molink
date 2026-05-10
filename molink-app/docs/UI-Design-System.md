# Molink UI 设计系统文档

## 1. 设计原则

基于目标登录界面截图的视觉风格，Molink 设计系统遵循以下原则：

- **深邃不沉闷**：暗色背景采用极深的锌灰色（Zinc），而非纯黑，保持微妙的色彩温度
- **蓝色为强调**：主操作按钮、聚焦环、文字链接统一使用明亮的蓝色，形成视觉焦点
- **层次靠明度**：卡片、输入框、按钮之间不依赖阴影，而是通过微妙的背景色明度差异建立层级
- **边框细而淡**：分隔线和边框使用低对比度的细线，保持界面干净
- **内容优先**：界面元素克制，让用户的文档内容成为绝对主角

---

## 2. 色彩体系

### 2.1 暗色主题（Dark Theme）

暗色主题完全对标登录界面截图的视觉风格：深邃的 zinc 背景、蓝色主强调色、微妙的层次差异。

| Token | HSL 值 | HEX 值 | 使用场景 |
|---|---|---|---|
| `--background` | `240 6% 4%` | `#09090b` | 应用最底层背景（极深 zinc） |
| `--foreground` | `0 0% 98%` | `#fafafa` | 主标题、重要文字（近白） |
| `--card` | `240 4% 10%` | `#18181b` | 卡片、弹窗、面板背景 |
| `--card-foreground` | `0 0% 98%` | `#fafafa` | 卡片内主文字 |
| `--popover` | `240 4% 10%` | `#18181b` | 下拉菜单、浮层面板 |
| `--popover-foreground` | `0 0% 98%` | `#fafafa` | 浮层主文字 |
| `--primary` | `217 91% 60%` | `#3b82f6` | **主按钮、聚焦环、链接** |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | 主按钮上的文字 |
| `--secondary` | `240 4% 16%` | `#27272a` | 次要背景、输入框、第三方按钮 hover |
| `--secondary-foreground` | `0 0% 98%` | `#fafafa` | 次要背景上的文字 |
| `--muted` | `240 4% 16%` | `#27272a` | 静音区块背景 |
| `--muted-foreground` | `240 5% 65%` | `#a1a1aa` | 副标题、说明文字、占位符 |
| `--accent` | `240 4% 20%` | `#2e2e32` | 悬停背景、选中态背景 |
| `--accent-foreground` | `0 0% 98%` | `#fafafa` | 强调色上的文字 |
| `--destructive` | `0 84% 60%` | `#ef4444` | 错误提示、删除操作 |
| `--destructive-foreground` | `0 0% 100%` | `#ffffff` | 错误色上的文字 |
| `--border` | `240 4% 20%` | `#2e2e32` | 分隔线、边框（细而淡） |
| `--input` | `240 4% 16%` | `#27272a` | 输入框背景 |
| `--ring` | `217 91% 60%` | `#3b82f6` | **聚焦光环（蓝色）** |

**暗色色阶金字塔**：

```
#fafafa  ←── 主文字、标题（近白）
#a1a1aa  ←── 次要文字、说明（zinc-400）
#3b82f6  ←── 主按钮、链接、聚焦环（蓝色）
#3f3f46  ←── 边框、分隔线（zinc-700）
#2e2e32  ←── 悬停背景（accent）
#27272a  ←── 输入框、次要背景（zinc-800）
#18181b  ←── 卡片、弹窗（zinc-900）
#09090b  ←── 应用底色（zinc-950）
```

### 2.2 亮色主题（Light Theme）

亮色主题与暗色主题**结构对称**：暗色用 zinc 冷灰，亮色用暖灰；两者共用同一套蓝色强调色。

| Token | HSL 值 | HEX 值 | 使用场景 |
|---|---|---|---|
| `--background` | `40 12% 97%` | `#f8f7f5` | 应用底层背景（暖白） |
| `--foreground` | `240 6% 10%` | `#17171a` | 主标题、重要文字（近黑） |
| `--card` | `0 0% 100%` | `#ffffff` | 卡片、弹窗、面板背景 |
| `--card-foreground` | `240 6% 10%` | `#17171a` | 卡片内主文字 |
| `--popover` | `0 0% 100%` | `#ffffff` | 下拉菜单、浮层面板 |
| `--popover-foreground` | `240 6% 10%` | `#17171a` | 浮层主文字 |
| `--primary` | `217 91% 60%` | `#3b82f6` | **主按钮、聚焦环、链接** |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | 主按钮上的文字 |
| `--secondary` | `40 8% 94%` | `#f0eeeb` | 次要背景、标签页未选中 |
| `--secondary-foreground` | `240 6% 10%` | `#17171a` | 次要背景上的文字 |
| `--muted` | `40 8% 94%` | `#f0eeeb` | 静音区块背景 |
| `--muted-foreground` | `240 4% 46%` | `#71717a` | 副标题、说明文字、占位符 |
| `--accent` | `40 6% 90%` | `#e6e4e0` | 悬停背景、选中态背景 |
| `--accent-foreground` | `240 6% 10%` | `#17171a` | 强调色上的文字 |
| `--destructive` | `0 84% 60%` | `#ef4444` | 错误提示、删除操作 |
| `--destructive-foreground` | `0 0% 100%` | `#ffffff` | 错误色上的文字 |
| `--border` | `40 6% 88%` | `#e0ddd8` | 分隔线、边框（细而淡） |
| `--input` | `0 0% 100%` | `#ffffff` | 输入框背景 |
| `--ring` | `217 91% 60%` | `#3b82f6` | **聚焦光环（蓝色）** |

**亮色色阶金字塔**：

```
#17171a  ←── 主文字、标题（近黑）
#71717a  ←── 次要文字、说明（zinc-500）
#3b82f6  ←── 主按钮、链接、聚焦环（蓝色）
#e0ddd8  ←── 边框、分隔线（暖灰）
#e6e4e0  ←── 悬停背景（accent）
#f0eeeb  ←── 次要背景、Sidebar（暖灰）
#ffffff  ←── 卡片、弹窗、输入框（纯白）
#f8f7f5  ←── 应用底色（暖白）
```

### 2.3 明暗对比示意

```
暗色                    亮色
#09090b  background  ←→  #f8f7f5  background
#18181b  card        ←→  #ffffff  card
#27272a  input       ←→  #ffffff  input
#2e2e32  accent      ←→  #e6e4e0  accent
#2e2e32  border      ←→  #e0ddd8  border
#3b82f6  primary     ←→  #3b82f6  primary  (共用蓝色)
#a1a1aa  muted-fg    ←→  #71717a  muted-fg
#fafafa  foreground  ←→  #17171a  foreground
```

---

## 3. 组件配色规范

### 3.1 登录弹窗（Login Modal）

登录弹窗是本次设计的**风格基准**，所有配色必须严格对齐截图。

| 元素 | 暗色 | 亮色 |
|---|---|---|
| 遮罩层 | `bg-black/60 backdrop-blur-sm` | 同左 |
| 弹窗背景 | `bg-card` → `#18181b` | `bg-card` → `#ffffff` |
| 弹窗标题 "你的 AI 工作空间。" | `text-card-foreground text-3xl font-bold` | `text-card-foreground text-3xl font-bold` |
| 副标题 "登录你的 Molink 帐号" | `text-muted-foreground` | `text-muted-foreground` |
| 关闭按钮 | `text-muted-foreground hover:text-foreground` | 同逻辑 |
| 标签页未选中 | `text-muted-foreground border-transparent` | 同逻辑 |
| 标签页选中 | `text-foreground border-primary` | 同逻辑（下划线用蓝色） |
| 第三方登录按钮 | `bg-card border-border text-foreground hover:bg-accent` | `bg-card border-border text-foreground hover:bg-accent` |
| GitHub 按钮 | 同其他第三方按钮，或 `bg-secondary` 略深 | 同逻辑 |
| 分隔线 | `border-border` | 同逻辑 |
| 分隔线文字 | `text-muted-foreground bg-card px-2` | 同逻辑 |
| 输入框标签 "邮件地址" | `text-foreground font-medium` | 同逻辑 |
| 输入框边框 | `border-border focus:border-primary` | `border-border focus:border-primary` |
| 输入框背景 | `bg-input` → `#27272a` | `bg-input` → `#ffffff` |
| 输入框文字 | `text-foreground` | 同逻辑 |
| 输入框 placeholder | `text-muted-foreground` | 同逻辑 |
| 输入框聚焦环 | `ring-2 ring-primary` | `ring-2 ring-primary` |
| 说明文字 | `text-muted-foreground text-sm` | 同逻辑 |
| **主按钮 "继续"** | **`bg-primary text-primary-foreground hover:bg-blue-500`** | **`bg-primary text-primary-foreground hover:bg-blue-500`** |
| 底部链接 "条款和条件" | `text-primary hover:underline` | 同逻辑 |
| 底部链接 "隐私政策" | `text-primary hover:underline` | 同逻辑 |

### 3.2 侧边栏（Sidebar）

| 元素 | 暗色 | 亮色 |
|---|---|---|
| 背景 | `bg-background` → `#09090b` | `bg-background` → `#f8f7f5` |
| 边框 | `border-border` → `#2e2e32` | `border-border` → `#e0ddd8` |
| 工作区名称 | `text-foreground font-medium` | 同逻辑 |
| 头像/Logo 背景 | `bg-secondary` → `#27272a` | `bg-secondary` → `#f0eeeb` |
| 导航项默认 | `text-secondary-foreground` | 同逻辑 |
| 导航项 hover | `bg-accent` → `#2e2e32` | `bg-accent` → `#e6e4e0` |
| 导航项选中 | `bg-secondary text-foreground` | `bg-secondary text-foreground` |
| 导航图标 | `text-muted-foreground` | 同逻辑 |
| 分组标题 "最近 / 页面" | `text-muted-foreground uppercase text-xs tracking-wider` | 同逻辑 |
| 页面列表项 | `text-secondary-foreground` | 同逻辑 |
| 页面图标 | `text-muted-foreground` | 同逻辑 |
| 底部登录按钮 | `bg-primary text-primary-foreground hover:opacity-90` | `bg-primary text-primary-foreground hover:opacity-90` |

### 3.3 顶部标题栏（Header）

| 元素 | 暗色 | 亮色 |
|---|---|---|
| 背景 | `bg-background` | 同逻辑 |
| 边框 | `border-border` | 同逻辑 |
| 前进/后退按钮 | `text-muted-foreground hover:bg-accent` | 同逻辑 |
| 面包屑标题 | `text-foreground font-medium` | 同逻辑 |
| "私人" 标签 | `text-muted-foreground` | 同逻辑 |
| 分享按钮 | `text-secondary-foreground hover:bg-accent` | 同逻辑 |
| 功能图标 | `text-muted-foreground hover:bg-accent` | 同逻辑 |

### 3.4 编辑器区域（Editor）

| 元素 | 暗色 | 亮色 |
|---|---|---|
| 页面标题输入 | `text-foreground text-4xl font-bold placeholder:text-muted-foreground bg-transparent` | 同逻辑 |
| 正文内容 | `prose dark:prose-invert`（需确保 prose 接入 CSS 变量） | `prose` |
| 空页面提示按钮 | `bg-secondary text-foreground hover:bg-accent` | 同逻辑 |
| 框选高亮 | `border-primary/50 bg-primary/20` | `border-primary/50 bg-primary/20` |

---

## 4. CSS 变量实现代码

### 4.1 `src/assets/styles/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
@import "tailwindcss";

@layer base {
  :root {
    /* ========== 亮色主题 ========== */
    --background: 40 12% 97%;
    --foreground: 240 6% 10%;
    --card: 0 0% 100%;
    --card-foreground: 240 6% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 6% 10%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 100%;
    --secondary: 40 8% 94%;
    --secondary-foreground: 240 6% 10%;
    --muted: 40 8% 94%;
    --muted-foreground: 240 4% 46%;
    --accent: 40 6% 90%;
    --accent-foreground: 240 6% 10%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 40 6% 88%;
    --input: 0 0% 100%;
    --ring: 217 91% 60%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem
  }

  .dark {
    /* ========== 暗色主题 ========== */
    --background: 240 6% 4%;
    --foreground: 0 0% 98%;
    --card: 240 4% 10%;
    --card-foreground: 0 0% 98%;
    --popover: 240 4% 10%;
    --popover-foreground: 0 0% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 4% 16%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 4% 16%;
    --muted-foreground: 240 5% 65%;
    --accent: 240 4% 20%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 4% 20%;
    --input: 240 4% 16%;
    --ring: 217 91% 60%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

::view-transition-old(root), ::view-transition-new(root) {
    animation: none;
    mix-blend-mode: normal;
}
```

---

## 5. 组件迁移 checklist

### 5.1 高优先级（直接影响用户视觉）

- [ ] `src/assets/styles/index.css` — 替换为上述 CSS 变量
- [ ] `src/components/auth/Login.tsx` — 弹窗重构为截图风格
  - 标题改为 "你的 AI 工作空间。" + 副标题
  - 标签页增加下划线选中态
  - 主按钮改为蓝色
  - 增加底部条款和隐私政策链接
  - 输入框聚焦环改为蓝色
- [ ] `src/Sidebar.tsx` — 背景、导航项、边框接入变量
  - 背景改为 `bg-background`
  - 登录按钮改为蓝色 `bg-primary`
- [ ] `src/App.tsx` — 整体背景、标题栏
- [ ] `src/Editor.tsx` — 编辑器标题、placeholder、框选高亮

### 5.2 中优先级（细节打磨）

- [ ] `src/components/SettingsModal.tsx` — 设置面板配色
- [ ] `src/components/UserMenu.tsx` — 用户下拉菜单
- [ ] `src/components/magicui/animated-theme-toggler.tsx` — 主题切换按钮
- [ ] 全局搜索 `dark:bg-gray-` / `dark:text-gray-` / `bg-gray-` 等硬编码，统一替换为 CSS 变量

### 5.3 迁移示例

**Before（旧硬编码）**：
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
<button className="bg-gray-900 dark:bg-gray-700 text-white">
```

**After（新变量）**：
```tsx
<div className="bg-background text-foreground">
<button className="bg-primary text-primary-foreground">
```

---

## 6. 辅助色与图表色

### 6.1 状态色

| 状态 | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| 成功 | `#16a34a` | `#4ade80` | 保存成功提示 |
| 警告 | `#ca8a04` | `#facc15` | 注意事项 |
| 错误 | `#ef4444` | `#f87171` | 错误提示（已纳入 `--destructive`） |
| 信息 | `#3b82f6` | `#60a5fa` | 功能引导（与主色同系） |

### 6.2 图表色（Chart Colors）

| Token | 亮色 | 暗色 |
|---|---|---|
| `--chart-1` | `#e07b5c` | `#60a5fa` |
| `--chart-2` | `#2a9d8f` | `#34d399` |
| `--chart-3` | `#264653` | `#fbbf24` |
| `--chart-4` | `#e9c46a` | `#a78bfa` |
| `--chart-5` | `#f4a261` | `#f472b6` |

---

## 7. 排版与间距

### 7.1 字体

- **系统字体栈**：`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **标题字重**：弹窗大标题使用 `font-bold`（700），页面标题使用 `font-bold`
- **正文字重**：常规文字 `font-normal`（400），按钮/标签 `font-medium`（500）

### 7.2 圆角

- 全局圆角：`--radius: 0.5rem`
- 按钮、输入框、卡片：`rounded-lg`（`0.5rem`）
- 大面板/弹窗：`rounded-xl`（`0.75rem`）

### 7.3 阴影

暗色主题减少阴影依赖，主要靠背景色差异建立层级：

| 场景 | 亮色 | 暗色 |
|---|---|---|
| 弹窗遮罩 | `bg-black/60 backdrop-blur-sm` | 同左 |
| 弹窗主体 | `shadow-xl` | `shadow-2xl shadow-black/50` |
| 下拉菜单 | `shadow-lg` | `shadow-lg shadow-black/50` |
| 卡片 | `shadow-sm` | 无阴影，仅用边框 |

---

## 8. 交互状态规范

| 状态 | 实现方式 |
|---|---|
| Hover | 背景色变为 `accent`，文字色不变；按钮可额外增加 `opacity-90` |
| Active / 按下 | `scale-[0.98]` 或背景色亮度降低 5% |
| Focus | `ring-2 ring-ring ring-offset-2 ring-offset-background` |
| 禁用 | `opacity-50 cursor-not-allowed` |
| 选中 | 背景色为 `secondary`，文字为 `foreground` |

---

## 9. 附录：颜色速查表

### 暗色主题速查

```
#fafafa  foreground      主文字（近白）
#a1a1aa  muted-foreground 次要文字（zinc-400）
#3b82f6  primary / ring   主按钮、链接、聚焦环（蓝色）
#2e2e32  border          边框、分隔线
#2e2e32  accent          悬停背景
#27272a  secondary       次要背景、输入框（zinc-800）
#18181b  card            卡片、弹窗（zinc-900）
#09090b  background      应用底色（zinc-950）
```

### 亮色主题速查

```
#17171a  foreground      主文字（近黑）
#71717a  muted-foreground 次要文字（zinc-500）
#3b82f6  primary / ring   主按钮、链接、聚焦环（蓝色）
#e0ddd8  border          边框、分隔线
#e6e4e0  accent          悬停背景
#f0eeeb  secondary       次要背景、Sidebar
#ffffff  card / input    卡片、弹窗、输入框
#f8f7f5  background      应用底色（暖白）
```
