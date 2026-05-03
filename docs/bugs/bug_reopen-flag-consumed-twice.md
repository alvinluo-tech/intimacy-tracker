# Bug: Location Picker 返回后表单状态丢失

## 现象

从 Location Picker 选择地址返回后：
1. 新选择的位置没有记录到表单中
2. 之前填写的所有内容（伴侣、心情、评分、标签、笔记、照片等）全部丢失

## 根因分析

### 背景

Location Picker 使用 `quicklog-location-draft.ts` 这套 localStorage 机制在组件之间传递数据：

- 进入 Location Picker 前：表单内容写入 localStorage draft
- 在 Location Picker 确认后：新位置合并到 draft，设置 `quicklog_reopen` flag
- 返回后：消费 flag 并从 draft 恢复表单 + 位置

### 问题 1：重复消费 reopen flag（核心 bug）

`consumeQuickLogReopenFlag()` 是一个"一次性"函数——它读取 flag 后立即从 localStorage 移除：

```typescript
export function consumeQuickLogReopenFlag() {
  const val = localStorage.getItem(QUICKLOG_REOPEN_FLAG_KEY);
  if (val !== "1") return false;
  localStorage.removeItem(QUICKLOG_REOPEN_FLAG_KEY); // 移除了！
  return true;
}
```

但**三个地方都在消费这个 flag**：

| 组件 | 作用 | 是否应该消费 |
|------|------|------------|
| `AddLogModal.tsx:39` | 检测 reopen → 打开弹窗 | 不应该消费（只需要检查） |
| `TimelinePageView.tsx:141` | 检测 reopen → 打开编辑抽屉 | 不应该消费（只需要检查） |
| `PartnerDetailView.tsx:166` | 检测 reopen → 打开编辑抽屉 | 不应该消费（只需要检查） |
| `QuickLogDrawerForm.tsx:569` | 检测 reopen → 恢复表单状态 | 应该消费（唯一消费者） |

**流程**（以 Quick Log 为例）：

```
用户选好位置 → confirm() → setQuickLogReopenFlag() → router.back()

回到 Dashboard：
  1. AddLogModal 的 useEffect 运行 →
     consumeQuickLogReopenFlag() → true → flag 被移除 → 打开弹窗
  2. QuickLogDrawerForm 挂载 →
     consumeQuickLogReopenFlag() → false (flag 已被消费) → 不恢复！
  3. 结果：表单空白 + 位置丢失
```

### 问题 2：Effect 执行顺序错误

编辑流程中还存在第二个 bug：

```typescript
// 1️⃣ 位置恢复 effect（行 569）- 先执行
React.useEffect(() => {
  if (!consumeQuickLogReopenFlag()) return;
  // 从 draft 恢复新选的位置 ...
}, []);

// 2️⃣ initialData effect（行 638）- 后执行 ← 覆盖了恢复的位置！
React.useEffect(() => {
  if (!initialData) return;
  // 从 encounter 记录设置旧位置 ...
}, []);
```

在 React 中，effect 按声明顺序执行。位置恢复 effect 先执行，然后会被 initialData effect 覆盖——导致就算 flag 没被重复消费，编辑模式下新选的位置也会被初始数据冲掉。

## 修改方案

### 修改 1：`quicklog-location-draft.ts`

新增 `hasQuickLogReopenFlag()`——只读检查，不消费 flag：

```typescript
export function hasQuickLogReopenFlag() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(QUICKLOG_REOPEN_FLAG_KEY) === "1";
}
```

### 修改 2：页面级组件改用 `hasQuickLogReopenFlag`

- `AddLogModal.tsx`：`consumeQuickLogReopenFlag` → `hasQuickLogReopenFlag`
- `TimelinePageView.tsx`：`consumeQuickLogReopenFlag` → `hasQuickLogReopenFlag`
- `PartnerDetailView.tsx`：`consumeQuickLogReopenFlag` → `hasQuickLogReopenFlag`

这些组件只负责打开弹窗/抽屉，不再消费 flag。

### 修改 3：`QuickLogDrawerForm.tsx` 交换 effect 顺序

将 initialData effect 移到 draft 恢复 effect **之前**，确保 draft 数据能覆盖 initialData 数据：

```
执行顺序：
  1️⃣ initialData effect → 设置初始数据（旧的 encounter 值）
  2️⃣ draft 恢复 effect → 覆盖为新选的位置和编辑中的表单数据（生效）
```

`consumeQuickLogReopenFlag` 调用保留在 form 中——成为 **唯一的 flag 消费者**。

### 子问题 1：编辑模式下 draft 缺少 encounterId

**现象**：点击编辑 > 选择位置 > 确认后，编辑抽屉消失（不会重新打开）。

**原因**：从编辑抽屉进入 Location Picker 时，`QuickLogDrawerForm` 写入的 draft 不包含 `encounterId`。返回后 `TimelinePageView`/`PartnerDetailView` 的 effect 依赖 `draft.encounterId` 来找到对应的 encounter 重新打开抽屉——但 encounterId 不存在，effect 提前 return。

**修复**：
- 向 `QuickLogDrawerForm` 新增可选 prop `encounterId?: string`
- `EncounterDetailDrawer` 在编辑模式下将 `encounterId` 传入 `QuickLogDrawerForm`
- 写入 draft 时包含 `encounterId`，供返回后页面组件匹配 encounter 并重新打开抽屉

### 子问题 3：提交处理器上传已有照片时报错

**现象**：编辑已有照片的记录时，提交报 "errorPhotoUploadFailed" 或 "type not supported"。

**原因**：从 draft 或 initialData 恢复的已有照片使用 dummy File 对象（size=0, name='pre-uploaded.jpg' / 'existing-photo.jpg'）。提交处理器中循环上传所有照片时，尝试将 0 字节的 dummy file 上传到 Supabase Storage，被拒绝。

Location Picker 导航处理器（line 1654）已有该跳过逻辑，但提交处理器（line 911）中没有。

**修复**：在提交处理器的照片上传循环中添加相同的跳过检查，对 dummy file 直接复用原 URL 不执行上传。

### 子问题 2：编辑模式调用 createEncounterAction 而非 updateEncounterAction

**现象**：编辑后确认，不是更新原数据，而是创建了一条新记录。

**原因**：`QuickLogDrawerForm` 的 submit 处理器永远调用 `createEncounterAction`，没有根据 `encounterId` 是否存在来分支选择 `updateEncounterAction`。

**修复**：检查 `encounterId` 是否存在：
- 存在 → `updateEncounterAction(encounterId, payload)` （更新原记录）
- 不存在 → `createEncounterAction(payload)` （创建新记录）

## 涉及文件

| 文件 | 修改 |
|------|------|
| `src/lib/utils/quicklog-location-draft.ts` | 新增 `hasQuickLogReopenFlag()` |
| `src/components/forms/AddLogModal.tsx` | `consumeQuickLogReopenFlag` → `hasQuickLogReopenFlag` |
| `src/components/timeline/TimelinePageView.tsx` | `consumeQuickLogReopenFlag` → `hasQuickLogReopenFlag` |
| `src/components/partners/PartnerDetailView.tsx` | `consumeQuickLogReopenFlag` → `hasQuickLogReopenFlag` |
| `src/components/forms/QuickLogDrawerForm.tsx` | 交换 `initialData` effect 和 `consumeQuickLogReopenFlag` effect 的顺序；新增 `encounterId` prop 并写入 draft；submit 时按 encounterId 分支调用 create/update action |
| `src/components/forms/EncounterDetailDrawer.tsx` | 编辑模式下将 `encounterId` 传入 `QuickLogDrawerForm` |

## 架构原则

`consumeQuickLogReopenFlag` 这类"一次性"信号（read-and-remove）的设计：

- **任何时候只能有一个消费者**。如果多个组件需要响应同一个信号，要么：
  - 用 `hasXxx`（只读检查）+ `consumeXxx`（实际消费）分离关注点，或
  - 使用状态提升 + prop drilling / context 传递信号
- 在 React effect 中处理信号时，需考虑 effect 之间的执行顺序依赖关系。
