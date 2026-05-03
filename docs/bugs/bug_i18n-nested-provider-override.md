# 嵌套 NextIntlClientProvider 消息被替换导致 MISSING_MESSAGE

## 描述
按需加载翻译 namespace 优化后，页面报 `MISSING_MESSAGE` 错误：部分组件找不到所需 namespace。

## 原因
`NextIntlClientProvider` 内部通过 `use-intl` 的 `IntlProvider` 实现。源码第 44 行逻辑是：
```js
messages: messages === undefined ? prevContext?.messages : messages
```
当 `messages` prop 不为 `undefined` 时，**直接替换**父级上下文的消息，而非合并。

这导致：
1. 子 provider 完全覆盖父 provider 的消息
2. 页面级 `NextIntlClientProvider` 必须包含组件树所需的**全部** namespaces（不能依赖 layout 层继承）
3. 共享组件（如 `AvatarViewer`→`ImageViewer`）在所有使用它的页面都需要对应 namespace

## 波及组件
- `AvatarViewer` 始终渲染 `ImageViewer`（即使 `open=false`），而 `ImageViewer` 使用 `useTranslations("imageViewer")`
- `ThemeToggle` 使用 `useTranslations("settings")`，在 `SidebarNav` 中渲染

## 截图/重现
1. 访问 `/partners` → `MISSING_MESSAGE: imageViewer`
2. 访问 `/dashboard` → `MISSING_MESSAGE: common`（因 dashboard 页面 provider 未包含 `common`）
3. 访问任何页面 → `MISSING_MESSAGE: settings`（因 app layout 未包含 `settings`）

## 修复
每个 `NextIntlClientProvider` 独立声明所需 namespace，不依赖嵌套继承：

| Provider | Namespace |
|---|---|
| `(app)/layout` | `nav`, `common`, `settings` |
| `(public)/layout` | `auth` |
| `/dashboard` | `analytics`, `encounter`, `common` |
| `/timeline` | `timeline`, `encounter`, `common`, `imageViewer` |
| `/records/[id]/edit` | `encounter`, `common` |
| `/partners` | `partners`, `common`, `imageViewer` |
| `/partners/[id]` | `partners`, `encounter`, `common`, `imageViewer` |
| `/settings` | `settings`, `pin`, `partners`, `common`, `feedback` |
| `/settings/privacy` | `settings`, `pin`, `partners`, `common` |
| `/lock` | `pin`, `common` |

## 改动文件
- `src/lib/i18n.ts` — 新增 `pick` 工具函数
- `src/app/layout.tsx` — root layout 只传 `locale`，移除 messages
- `src/app/(app)/layout.tsx` — 提供 `nav` + `common` + `settings`
- `src/app/(public)/layout.tsx` — 提供 `auth`
- 14 个 page 文件 — 各自声明所需 namespace
- `src/app/(app)/settings/about/page.tsx` — 拆分为 server wrapper + `AboutContent.tsx`
- `src/app/(app)/settings/privacy-policy/page.tsx` — 拆分为 server wrapper + `PrivacyPolicyContent.tsx`
- `src/app/(app)/settings/terms-of-service/page.tsx` — 拆分为 server wrapper + `TermsOfServiceContent.tsx`

## 教训
`NextIntlClientProvider` 嵌套时 `messages` 是**替换**而非**合并**语义。如需为不同组件树提供不同 namespace，必须各自完整声明，或只在最外层放一个 provider（本优化方案采用前者）。

## 状态
已修复
