# Bug: LocationPicker 返回后编辑抽屉消失

## 现象

从 Location Picker 选择地址返回后：
1. 编辑抽屉关闭，回到只读详情界面
2. 无法以编辑模式重新打开抽屉

## 根因分析

### 核心问题：`router.back()` 不触发 Server Component 重渲染

LocationPicker 确认后调用 `router.back()`，但 Next.js App Router 中：
- `router.back()` 不会触发 Server Component 重新渲染
- `safeItems`/`encounters` 引用不变
- `[safeItems]` 依赖的 useEffect 不会重新执行
- `startInEdit` 永远不会被设为 `true`
- Drawer 以只读模式重新打开

### 次要问题：Reopen Flag 被提前消费

`QuickLogDrawerForm` 在 LocationPicker 页面挂载时调用 `consumeQuickLogReopenFlag()`，导致：
1. LocationPicker 设置 flag
2. QuickLogDrawerForm（在 LocationPicker 上）立即消费 flag
3. `router.back()` 返回后，TimelinePageView 检查 flag 时已是 `false`
4. Drawer 无法以编辑模式重新打开

## 修改方案

### 修改 1：LocationPicker 确认后强制刷新

**文件**：`src/components/map/LocationPickerView.tsx`

```tsx
const confirm = () => {
  const existing = readQuickLogLocationDraft() ?? {};
  writeQuickLogLocationDraft({ ...existing, ...selected, updatedAt: Date.now() });
  setQuickLogReopenFlag();
  router.back();
  // 强制 Server Component 重渲染，使 reopen effect 能检测到 flag
  setTimeout(() => router.refresh(), 100);
};
```

### 修改 2：Reopen Flag 消费权归页面组件

**原则**：`consumeQuickLogReopenFlag()` 只能由页面级组件调用，`QuickLogDrawerForm` 只读不消费。

| 组件 | 操作 | 说明 |
|------|------|------|
| `TimelinePageView` | `consumeQuickLogReopenFlag()` | 消费 flag，打开编辑抽屉 |
| `PartnerDetailView` | `consumeQuickLogReopenFlag()` | 消费 flag，打开编辑抽屉 |
| `QuickLogDrawerForm` | `hasQuickLogReopenFlag()` | 只读，检查后从 draft 恢复表单 |

**TimelinePageView**：
```tsx
useEffect(() => {
  if (!consumeQuickLogReopenFlag()) return;
  const draft = readQuickLogLocationDraft();
  if (!draft?.encounterId) return;
  const encounter = safeItems.find((e) => e.id === draft.encounterId);
  if (!encounter) return;
  setSelectedEncounter(encounter);
  setDetailDrawerOpen(true);
  setStartInEdit(true);
}, [safeItems]);
```

**QuickLogDrawerForm**：
```tsx
// 不检查 flag，只检查 draft 是否存在
React.useEffect(() => {
  const draft = readQuickLogLocationDraft();
  if (!draft) return;
  // ... 恢复表单数据
}, []);
```

### 修改 3：关闭抽屉时清除 Draft

**文件**：`TimelinePageView.tsx`、`PartnerDetailView.tsx`

防止切换编辑不同笔记时旧 draft 残留：

```tsx
onClose={() => {
  setDetailDrawerOpen(false);
  setSelectedEncounter(null);
  setStartInEdit(false);
  clearQuickLogLocationDraft();
}}
```

## 涉及文件

| 文件 | 修改 |
|------|------|
| `src/components/map/LocationPickerView.tsx` | confirm 后加 `router.refresh()` |
| `src/components/forms/QuickLogDrawerForm.tsx` | 改用 `hasQuickLogReopenFlag()`（只读） |
| `src/components/timeline/TimelinePageView.tsx` | 改用 `consumeQuickLogReopenFlag()`，关闭时清除 draft |
| `src/components/partners/PartnerDetailView.tsx` | 同上 |

## 架构原则

1. **Flag 消费权唯一**：`consumeQuickLogReopenFlag()` 只能由一个组件调用，其他组件用 `hasQuickLogReopenFlag()` 只读检查
2. **Server Component 刷新**：`router.back()` 不触发重渲染，需配合 `router.refresh()` 使用
3. **Draft 生命周期**：draft 在抽屉关闭时必须清除，防止跨会话污染
