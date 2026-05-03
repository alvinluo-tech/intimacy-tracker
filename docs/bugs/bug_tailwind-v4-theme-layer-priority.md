# Bug: Tailwind v4 浅色模式全黑背景 — @theme 与 CSS 变量层序问题

## 现象

浅色模式下所有页面背景全黑（`--bg` 始终解析为暗色值 `#020617`），深色模式正常。
登录页因硬编码 `bg-[#020a21]` 不受影响。

## 根因

Tailwind v4 的 `@theme` 指令在编译时生成 `--color-*` 变量（如 `--color-app-bg: var(--bg)`）。
当 `:root` 和 `.dark` 中的原始变量定义（`--bg`, `--surface` 等）位于 **无层级区域**（unlayered）
时，Tailwind v4 编译器可能静态解析 `var(--bg)` 为文件中最后一次出现的值（即 `.dark` 的值），
导致 `--color-app-bg` 永远指向暗色值。

### 错误的结构

```css
/* ✗ 错误：变量在无层级区域，@theme 编译时无法正确追踪动态变化 */
:root { --bg: #f8fafc; }
.dark { --bg: #020617; }

@theme {
  --color-app-bg: var(--bg);  /* Tailwind 编译时可能固化解析为暗色值 */
}
```

### 正确的结构

```css
/* ✓ 正确：@theme 先生成引用，@layer base 内定义动态实体 */
@theme {
  --color-app-bg: var(--bg);
  ...
}

@layer base {
  :root { --bg: #f8fafc; ... }
  .dark  { --bg: #020617; ... }
}
```

## 层序规则

Tailwind v4 的 CSS 层优先级（从低到高）：
1. `@layer theme` ← `@theme` 生成 `--color-*` 引用变量
2. `@layer base`   ← 用户定义 `:root`/`.dark` 实际变量值
3. `@layer utilities` ← `!important` 的 Tailwind 工具类
4. **无层级 CSS**   ← `.bg-app`, `.text-app` 等自定义工具（最高优先级）

`@theme` 必须在 `@layer base` **之前**，`:root`/`.dark` 必须在 `@layer base` **内部`，
`@theme` 生成的 `--color-*` 变量才能正确通过 `var()` 动态追踪 `:root`/`.dark` 的变化。

## 修复

| 文件 | 修改 |
|------|------|
| `src/app/globals.css` | `@theme` 块移到文件顶部（`@layer base` 之前）；`:root` 和 `.dark` 变量定义移入 `@layer base` 内部 |
| `src/components/ui/ThemeProvider.tsx` | 修复 import 路径 `next-themes/dist/types` → `next-themes`（该路径在 next-themes@0.4.6 中不存在） |

## 验证

```bash
npm run build    # ✓ 编译通过，零错误
```
