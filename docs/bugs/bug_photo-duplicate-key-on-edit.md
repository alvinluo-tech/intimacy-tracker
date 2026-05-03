# Bug: 编辑保存带照片记录时唯一约束冲突

## 现象

编辑已有照片的记录并保存时，报错：
```
duplicate key value violates unique constraint "encounter_photos_encounter_id_photo_url_key"
```

## 根因分析

`updateEncounterAction` 使用"先删后插"策略：
1. 删除 `encounter_photos` 中该 encounter 的所有行
2. 插入 `parsed.photos` 中的照片列表

问题出在步骤 2：`parsed.photos` 中可能包含重复的 `photo_url`，导致插入时违反 `(encounter_id, photo_url)` 唯一约束。

### 重复 URL 的来源

编辑模式下，`QuickLogDrawerForm` 从 `initialData.photos` 加载已有照片到 `photos` 状态。如果：
- 数据库中存在重复行（历史 bug 导致）
- 或用户多次选择同一张照片
- 或 draft 恢复时合并了重复项

则 `parsed.photos` 中会出现相同的 `photo_url`，插入时触发唯一约束冲突。

## 修改方案

### 修改 1：`updateEncounterAction` 使用 upsert

**文件**：`src/features/records/actions.ts`

```tsx
// 删除旧行
const { error: delPhotoErr } = await supabase
  .from("encounter_photos")
  .delete()
  .eq("encounter_id", id);
if (delPhotoErr) return { ok: false as const, error: delPhotoErr.message };

if (parsed.photos && parsed.photos.length > 0) {
  // 客户端去重
  const seen = new Set<string>();
  const uniquePhotos = parsed.photos.filter((photo) => {
    if (!photo.url || seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  });
  if (uniquePhotos.length > 0) {
    // 使用 upsert + ignoreDuplicates 防止冲突
    const { error: insPhotoErr } = await supabase
      .from("encounter_photos")
      .upsert(
        uniquePhotos.map((photo) => ({
          encounter_id: id,
          user_id: user.id,
          photo_url: photo.url,
          is_private: photo.isPrivate,
        })),
        { onConflict: "encounter_id,photo_url", ignoreDuplicates: true }
      );
    if (insPhotoErr) return { ok: false as const, error: insPhotoErr.message };
  }
}
```

### 修改 2：`createEncounterAction` 客户端去重

**文件**：`src/features/records/actions.ts`

```tsx
if (parsed.photos && parsed.photos.length > 0) {
  const seen = new Set<string>();
  const uniquePhotos = parsed.photos.filter((photo) => {
    if (!photo.url || seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  });
  if (uniquePhotos.length > 0) {
    const { error: dbError } = await supabase
      .from('encounter_photos')
      .insert(
        uniquePhotos.map((photo) => ({
          encounter_id: inserted.id,
          user_id: user.id,
          photo_url: photo.url,
          is_private: photo.isPrivate,
        }))
      );
    if (dbError) return { ok: false as const, error: dbError.message };
  }
}
```

## 涉及文件

| 文件 | 修改 |
|------|------|
| `src/features/records/actions.ts` | update: upsert + ignoreDuplicates；create: 客户端去重 |

## 架构原则

1. **防御性编程**：客户端和服务端都应去重，不假设上游数据干净
2. **upsert 优于 insert**：当操作可能重复时，使用 `upsert` + `ignoreDuplicates` 比 `insert` 更健壮
3. **空值检查**：插入前检查 `photo.url` 是否存在，避免空 URL 触发约束
