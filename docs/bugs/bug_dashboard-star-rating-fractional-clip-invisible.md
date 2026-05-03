# Dashboard 星星评分小数裁剪不可见

## 描述
Dashboard 平均评分显示时，4.7 分看起来像 5 颗满星，小数部分不可见。

## 原因
`StarRating` 组件使用**整体百分比裁剪**：将全部星星放在一个容器中，按 `score/max * 100%` 裁剪宽度。当 `score=4.7` 时裁剪比例为 94%，最后一颗星仅空出约 6%（约 1px），肉眼无法分辨，看起来像是 5 颗满星。

## 截图/重现
- 评分数据 `avgRating = 4.7`
- 数字显示 "4.7"
- 星星看起来全部填满，数值与视觉不一致

## 修复
改为**逐星裁剪**：每颗星星单独计算填充比例 `fill = min(1, max(0, score - i))`，每颗星独立裁剪宽度。

4.7 → ★★★★½（4 颗满星 + 第 5 颗 70%）

## 改动文件
- `src/components/ui/StarRating.tsx` — 重写为逐星渲染 + 每星独立裁剪
- `src/components/analytics/DashboardContent.tsx` — 改用 StarRating 组件
- `src/components/timeline/EncounterCard.tsx`
- `src/components/forms/EncounterDetailDrawer.tsx`
- `src/components/partners/PartnerDetailView.tsx` — 两处评分 + 移除 `clampRating`

## 状态
已修复
