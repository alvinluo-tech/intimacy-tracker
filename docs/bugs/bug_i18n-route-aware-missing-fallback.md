# i18n 路由感知加载缺少 header 兜底导致 MISSING_MESSAGE

## 描述
优化 i18n 按路由加载 namespace 后，`DashboardLoading`、`SidebarNav` 等组件报 `MISSING_MESSAGE` 错误：
```
MISSING_MESSAGE: Could not resolve `analytics` in messages for locale `zh`
MISSING_MESSAGE: Could not resolve `nav` in messages for locale `zh`
```

## 原因
`src/i18n/request.ts` 中通过 `headers().get("x-pathname")` 获取当前路由，再通过 `matchNamespaces` 决定加载哪些 namespace。

问题在于：
1. `headers()` 在某些渲染上下文中会抛出异常（如 loading.tsx、Turbopack HMR 热更新）
2. 异常未被捕获，导致 `pathname` 为空字符串
3. 空 `pathname` 下 `matchNamespaces` 返回空数组
4. 只有 `defaultNamespaces` (`["common", "errors"]`) 被加载
5. 组件使用 `useTranslations("analytics")` / `useTranslations("nav")` 时找不到对应 namespace

## 波及组件
- `DashboardLoading` — 使用 `analytics`
- `SidebarNav` — 使用 `nav`
- `DashboardContent` — 使用 `analytics`
- `QuickStartTimer` — 使用 `analytics`
- `FeatureCards` — 使用 `analytics`
- `ActivityHeatmap` — 使用 `analytics`

## 截图/重现
1. 启动 `pnpm run dev`
2. 访问 `/dashboard`
3. 控制台输出大量 `MISSING_MESSAGE: analytics` 和 `MISSING_MESSAGE: nav`

## 修复
```typescript
// 1. headers() 调用包裹 try-catch
let pathname = "";
try {
  pathname = (await headers()).get("x-pathname") ?? "";
} catch {
  // headers() may be unavailable in some rendering contexts
}

// 2. pathname 不可用时兜底加载全部 namespace
const matched = pathname ? matchNamespaces(pathname) : [];
const allNamespaces = matched.length
  ? [...new Set(["common", "errors", ...matched])]
  : allNamespacesFallback;
```

同时将 `nav` 从仅在 dashboard 路由加载改为始终随 `common`/`errors` 加载的更合理方式。

## 改动文件
- `src/i18n/request.ts`

## 教训
1. `next-intl` 的 `getRequestConfig` 中调用 `headers()` 需加 try-catch
2. 按需加载 namespace 必须有兜底策略：header 不可用时应加载全部 namespace
3. `nav` namespace（侧边栏）是布局级依赖，不应放在路由级匹配中

## 状态
已修复
