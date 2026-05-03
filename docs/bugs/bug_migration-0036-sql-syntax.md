# 迁移文件 0036 SQL 语法错误导致 db push 失败

## 描述
`supabase/migrations/0036_analytics_rpc.sql` 包含 PL/pgSQL 语法错误，导致 `supabase db push` 执行迁移时报错，两个迁移（0035、0036）无法应用。

## 原因
`get_dashboard_stats` 函数中存在两个问题：

### 1. 变量声明与类型不匹配
```sql
DECLARE
  v_recent30 RECORD;          -- 声明为 RECORD 类型
  -- v_recent7_durations 未声明
```
但 `SELECT ... INTO` 语句中将子查询返回的 JSON 值赋给 `v_recent30`，且 `v_recent7_durations` 直接被使用但从未声明。

**修复：** `v_recent30` 改为 `JSON` 类型，补声明 `v_recent7_durations JSON`

### 2. COALESCE 内 ORDER BY 位置错误
```sql
SELECT COALESCE(json_agg(...) ORDER BY label, '[]'::json)
--                                     ^
--                          ORDER BY 不能放在聚合函数括号外
```
PostgreSQL 的 `ORDER BY` 必须放在 `json_agg()` 的括号内部。

**修复：**
```sql
SELECT COALESCE(json_agg(... ORDER BY label), '[]'::json)
```

## 截图/重现
执行 `supabase db push` 时输出：
```
ERROR: "v_recent30" is not a scalar variable (SQLSTATE 42601)
ERROR: syntax error at or near "ORDER" (SQLSTATE 42601)
```

## 修复
详见 `supabase/migrations/0036_analytics_rpc.sql` 的 diff：
- `v_recent30 RECORD` → `v_recent30 JSON` + 新增 `v_recent7_durations JSON`
- `COALESCE(json_agg(...) ORDER BY label, '[]'::json)` → `COALESCE(json_agg(... ORDER BY label), '[]'::json)`
- `'recent30Days', COALESCE(v_recent30.recent30_json, '[]'::json)` → `'recent30Days', COALESCE(v_recent30, '[]'::json)`

## 教训
1. PL/pgSQL 中 `RECORD` 类型不能接收标量子查询的 JSON 结果
2. `json_agg()` 的 `ORDER BY` 子句必须在聚合函数括号内，不能放在 `COALESCE` 外层
3. `INTO` 子句中的变量必须全部在 `DECLARE` 块中声明

## 状态
已修复
