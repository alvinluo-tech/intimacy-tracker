# 伴侣筛选漏掉对方记录的 encounter

## 描述
Dashboard 和 Map 页按伴侣筛选时，只显示当前用户自己记录的 encounters，绑定伴侣记录的数据不显示。

## 原因
绑定伴侣时双方各自创建一条镜像 partner 记录（UUID 不同）：

- User A → partner `UUID-A` (user_id=A, bound_user_id=B, source=bound)
- User B → partner `UUID-B` (user_id=B, bound_user_id=A, source=bound)

筛选 `encounters.partner_id = UUID-A` 只能查到 User A 自己记录的数据，User B 记录的 encounter 用的是 `partner_id = UUID-B`，被漏掉了。

三处命中：
1. `analytics/queries.ts::getAnalyticsRows()` — Dashboard 统计数据
2. `map/queries.ts::listMapPoints()` — 地图数据点
3. `partners/queries.ts::getPartnerById()` — 伴侣详情 encounterCount

## 修复
统一沿用 `getPartnerStats()` / `listPartnerEncounters()` 中已有的"镜像双 ID"查询模式：

1. 查 partner 表获取 `source` + `bound_user_id`
2. 如果 `source === "bound"`，去对面找 mirror partner：`user_id = bound_user_id AND bound_user_id = current_user_id AND source = 'bound'`
3. 用 `.in("partner_id", [ownId, mirrorId])` 替代 `.eq("partner_id", ownId)`

## 改动文件
- `src/features/analytics/queries.ts` — `getAnalyticsRows()` 增加镜像查询
- `src/features/map/queries.ts` — `listMapPoints()` 增加镜像查询
- `src/features/partners/queries.ts` — `getPartnerById()` 增加镜像查询

## 状态
已修复
