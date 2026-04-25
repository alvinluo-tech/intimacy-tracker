# 亲密关系记录器开发文档（Next.js + Vercel + Supabase）

> 目标：本文档用于直接交给 Trae AI / Cursor / 其他 AI 编码助手，作为完整的项目实现说明。  
> 产品定位：这是一个**成人、自愿、以隐私保护为核心**的私密关系记录器，强调快速记录、数据掌控权、可解释的分析看板。  
> 技术栈：Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui + Supabase + Leaflet（MVP）+ Recharts。

---

## 1. 项目目标

请实现一个移动端优先的 Web App，用于记录亲密关系相关事件，并提供时间线、统计分析、导出与隐私控制能力。

### 1.1 核心原则

1. **隐私优先**：所有用户数据必须隔离；数据库必须启用 RLS；敏感字段需要额外保护。
2. **录入极快**：用户应能在 3 秒内完成一条基础记录。
3. **移动端优先**：先做好手机端录入体验，再扩展桌面端分析面板。
4. **默认最小采集**：位置、备注、精确地点默认关闭，必须由用户主动开启。
5. **可迁移地图架构**：MVP 使用 Leaflet，但地图层代码必须可在未来迁移到 Mapbox 或 MapLibre。

---

## 2. MVP 功能范围

### 2.1 必做功能（MVP）

- 用户注册 / 登录 / 退出。
- Quick Log 快速记录。
- 时间线列表页面。
- 单条记录详情页。
- 编辑 / 删除记录。
- 标签系统。
- 评分与简短备注。
- 基础分析看板。
- PIN 锁屏。
- CSV 导出。
- 隐私设置页。

### 2.2 暂不做

以下功能先不要实现，除非本文档后面明确列入扩展阶段：

- 双人共享。
- 成就系统。
- 生物识别。
- 精细地图热力动画。
- 推送通知。


---

## 3. 推荐产品信息架构

请按以下页面结构开发：

```txt
/(public)
  /login
  /register

/(app)
  /dashboard           -> 总览看板
  /log/new             -> 新建记录
  /timeline            -> 时间线列表
  /records/[id]        -> 记录详情
  /records/[id]/edit   -> 编辑记录
  /analytics           -> 分析页
  /map                 -> 地图页（MVP 可先做简单版）
  /settings            -> 设置页
  /settings/privacy    -> 隐私设置
  /settings/export     -> 数据导出
  /lock                -> PIN 锁界面
```

导航优先级：

- 底部 Tab（移动端）：Dashboard / Quick Log / Timeline / Analytics / Settings
- 桌面端：左侧 Sidebar

---

## 4. 初始化项目指导

请严格按以下步骤初始化：

### 4.1 创建项目

```bash
npx create-next-app@latest intimacy-tracker \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

### 4.2 安装依赖

```bash
cd intimacy-tracker

npm install @supabase/supabase-js @supabase/ssr
npm install react-hook-form zod @hookform/resolvers
npm install date-fns clsx tailwind-merge lucide-react
npm install recharts
npm install leaflet react-leaflet
npm install sonner
npm install idb
npm install zustand
npm install dayjs
npm install csv-stringify
```

### 4.3 安装 shadcn/ui

```bash
npx shadcn@latest init
```

推荐生成的组件：

```bash
npx shadcn@latest add button card dialog drawer dropdown-menu form input label popover select separator sheet skeleton sonner switch tabs textarea badge tooltip calendar table alert-dialog avatar
```

### 4.4 安装开发辅助依赖（可选）

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

### 4.5 环境变量

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_NAME=Intimacy Tracker
NEXT_PUBLIC_DEFAULT_TIMEZONE=Europe/Paris
ENCRYPTION_SECRET=replace_with_secure_random_secret
```

注意：

- `SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用，绝不能暴露到客户端。
- `ENCRYPTION_SECRET` 仅用于服务端敏感字段加密逻辑。
- 不要把 `.env.local` 提交到 Git。

---

## 5. 目录结构要求

请按以下目录组织代码：

```txt
src/
  app/
    (public)/
    (app)/
    api/
  components/
    ui/
    layout/
    forms/
    analytics/
    timeline/
    map/
    settings/
  features/
    auth/
    records/
    analytics/
    privacy/
    export/
    map/
  lib/
    supabase/
    auth/
    encryption/
    utils/
    validators/
    constants/
  hooks/
  stores/
  types/
  styles/
```

规则：

- 所有业务逻辑尽量放入 `features/*`。
- 所有公共工具方法放入 `lib/*`。
- 所有表单 schema 使用 zod，并放入 `lib/validators`。
- 地图实现必须封装在 `features/map` 和 `components/map`，避免未来迁移困难。

---

## 6. 设计与交互要求

### 6.1 设计风格

- 风格：克制、私密、现代、低刺激。
- 不要使用过于情色化或夸张的视觉语言。
- 主色建议：深色中性色 + 一种低饱和强调色。
- 默认支持深色模式。

### 6.2 移动端优先

必须优先优化以下体验：

- 单手操作。
- 大按钮、明确点击区域。
- Quick Log 页面一屏完成核心输入。
- 高级选项收进 Drawer / Accordion。

### 6.3 Quick Log 交互

新建记录页要求：

- 默认填入当前开始时间。
- 可快捷结束并自动计算时长。
- 地点开关默认关闭。
- 备注字段默认折叠。
- 提交成功后显示 Toast，并允许用户继续补充标签或备注。

---

## 7. 数据模型设计

请在 Supabase PostgreSQL 中建立以下表结构。

### 7.1 profiles

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  timezone text default 'UTC',
  pin_hash text,
  require_pin boolean default false,
  location_mode text default 'off',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.2 partners

```sql
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  color text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.3 encounters

```sql
create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer,
  timezone text,
  location_enabled boolean default false,
  location_precision text default 'off',
  latitude numeric,
  longitude numeric,
  location_label text,
  city text,
  country text,
  rating integer check (rating between 1 and 5),
  mood text,
  notes_encrypted text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.4 tags

```sql
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  color text,
  created_at timestamptz default now(),
  unique(user_id, name)
);
```

### 7.5 encounter_tags

```sql
create table if not exists public.encounter_tags (
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (encounter_id, tag_id)
);
```

### 7.6 audit_events

```sql
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
```

---

## 8. Row Level Security 要求

所有业务表必须开启 RLS。

### 8.1 启用 RLS

```sql
alter table public.profiles enable row level security;
alter table public.partners enable row level security;
alter table public.encounters enable row level security;
alter table public.tags enable row level security;
alter table public.encounter_tags enable row level security;
alter table public.audit_events enable row level security;
```

### 8.2 基础策略示例

```sql
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

create policy "partners_all_own"
on public.partners
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "encounters_all_own"
on public.encounters
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tags_all_own"
on public.tags
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "audit_events_insert_own"
on public.audit_events
for insert
with check (auth.uid() = user_id);

create policy "audit_events_select_own"
on public.audit_events
for select
using (auth.uid() = user_id);
```

### 8.3 重要约束

- 不允许任何“全表公开可读”策略。
- 所有写操作都必须 `with check (auth.uid() = user_id)`。
- `encounter_tags` 需要通过 join 方式确保只能关联自己的 encounter 和 tag。
- 所有服务端写接口也必须再次校验当前用户身份，不可只依赖 RLS。

---

## 9. 敏感数据保护要求

### 9.1 需要特殊保护的字段

以下字段属于高敏感：

- `encounters.notes_encrypted`
- 精确经纬度字段
- 未来的共享邀请码 / relationship token

### 9.2 处理策略

请按以下方式处理：

1. `notes` 在进入数据库前先通过服务端加密，数据库中只保存加密后的字符串。
2. 客户端不得直接持有加密密钥。
3. 精确位置默认不记录。
4. 若用户选择模糊位置，只保存 `city` / `country` 或降精度坐标。
5. 所有导出行为写入 `audit_events`。

### 9.3 PIN 锁

实现一个应用级 PIN 锁：

- 用户可设置 4~6 位 PIN。
- 数据库存储 `pin_hash`，不要存明文 PIN。
- 解锁状态只保存在内存态 store，不落 localStorage。
- 进入 app 后，如果用户开启了 PIN，优先跳转 `/lock`。

---

## 10. 表单与校验要求

请使用 `react-hook-form + zod`。

### 10.1 新建记录表单 schema

```ts
import { z } from 'zod'

export const encounterSchema = z.object({
  partnerId: z.string().uuid().optional().nullable(),
  startedAt: z.string(),
  endedAt: z.string().optional().nullable(),
  durationMinutes: z.number().int().nonnegative().optional().nullable(),
  locationEnabled: z.boolean().default(false),
  locationPrecision: z.enum(['off', 'city', 'exact']).default('off'),
  locationLabel: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  mood: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tagIds: z.array(z.string().uuid()).default([]),
})
```

### 10.2 交互规则

- 如果 `locationEnabled = false`，则忽略所有地点字段。
- 如果填写了 `endedAt`，自动计算 `durationMinutes`。
- 如果 `endedAt < startedAt`，直接报错。
- `notes` 可为空，不要设为必填。

---

## 11. 核心页面开发要求

### 11.1 Dashboard

展示：

- 本周记录次数。
- 本月记录次数。
- 平均时长。
- 最近一次记录时间。
- 最近 30 天趋势图。
- 最近常用标签。

### 11.2 Quick Log

重点优化移动端：

- 页面顶部显示当前时间。
- 提供“开始 / 结束 / 现在完成”快捷操作。
- 标签用可点击 Badge 选择。
- 备注区域折叠。

### 11.3 Timeline

按日期倒序展示记录卡片：

- 时间。
- 时长。
- 评分。
- 标签。
- 地点摘要（仅当用户记录时）。

支持：

- 筛选日期范围。
- 按标签筛选。
- 按评分筛选。

### 11.4 Analytics

使用 Recharts 实现：

- 最近 12 周频率趋势图。
- 最近 12 个月频率柱状图。
- 时长分布图。
- 星期几分布图。
- 标签频次排名。

### 11.5 Map

MVP 用 Leaflet 实现：

- 默认显示模糊位置点。
- 支持 marker cluster。
- 可按时间范围筛选。
- 如果无位置信息，显示 empty state。

请封装地图适配器接口：

```ts
export interface MapAdapter {
  renderPoints(points: MapPoint[]): void
  clear(): void
  fitBounds(): void
}
```

未来迁移到 Mapbox / MapLibre 时，不应影响业务层数据流。

### 11.6 Settings

需要至少包括：

- 时区设置。
- 是否开启 PIN。
- 位置记录模式：off / city / exact。
- 导出数据。
- 删除账户。

---

## 12. 服务端逻辑要求

请尽量使用 Next.js Server Actions 或 Route Handlers。

### 12.1 必须服务端执行的逻辑

- 创建记录。
- 更新记录。
- 删除记录。
- 导出 CSV。
- 备注加密 / 解密。
- PIN 设置与校验。
- 审计日志写入。

### 12.2 禁止事项

- 不要在客户端直接使用 service role key。
- 不要把敏感加密逻辑写到浏览器端。
- 不要仅靠前端判断是否有权限。

---

## 13. 导出功能要求

实现 CSV 导出。

### 13.1 导出内容

至少包含以下列：

- record_id
- started_at
- ended_at
- duration_minutes
- partner_nickname
- city
- country
- rating
- mood
- tags
- created_at

### 13.2 导出规则

- 用户只能导出自己的数据。
- 每次导出写入 `audit_events`。
- 导出文件名示例：`intimacy-tracker-export-2026-04-20.csv`

---

## 14. 状态管理建议

### 14.1 推荐 Zustand 管理

建议至少管理以下客户端状态：

- 当前解锁状态。
- 当前筛选条件。
- 当前主题模式。
- Quick Log 草稿状态。

### 14.2 本地缓存

允许使用 IndexedDB 暂存草稿：

- 仅缓存未提交草稿。
- 不缓存解密后的完整历史数据。
- 用户提交后应清理草稿缓存。

---

## 15. UI 组件清单

请至少实现以下可复用组件：

- `AppShell`
- `BottomNav`
- `SidebarNav`
- `QuickLogForm`
- `EncounterCard`
- `TagSelector`
- `RatingInput`
- `PrivacyModeSwitch`
- `PinLockScreen`
- `ExportButton`
- `AnalyticsCard`
- `EmptyState`
- `ConfirmDeleteDialog`
- `MapView`

---

## 16. 编码规范

请遵守以下规则：

- 使用 TypeScript 严格模式。
- 组件优先使用 Server Components；需要交互时再用 Client Component。
- 表单与交互组件拆分清晰。
- 避免把 SQL、schema、UI、业务逻辑全部写进一个文件。
- 每个 feature 目录内部使用 `actions.ts`、`queries.ts`、`schema.ts`、`types.ts` 的组织方式。
- 保持命名一致：`encounter` 不要和 `record` 混用。

---

## 17. 开发里程碑

请按以下顺序实现：

### Milestone 1

- 初始化 Next.js 项目。
- 配置 Supabase。
- 配置 shadcn/ui。
- 完成登录 / 注册。
- 建立数据库表和 RLS。

### Milestone 2

- 完成 Quick Log 页面。
- 完成新建记录与列表读取。
- 完成编辑 / 删除。

### Milestone 3

- 完成 Dashboard。
- 完成 Analytics 页。
- 完成标签筛选与统计。

### Milestone 4

- 完成 PIN 锁。
- 完成 CSV 导出。
- 完成审计日志。

### Milestone 5

- 完成 Leaflet 地图页。
- 完成模糊位置显示。
- 优化移动端交互。

---

## 18. 完成定义（Definition of Done）

只有满足以下条件，才算 MVP 完成：

- 所有业务表启用 RLS。
- 用户只能读写自己的数据。
- 可完成注册、登录、记录、查看、编辑、删除、导出。
- 移动端 Quick Log 体验顺畅。
- 备注加密逻辑生效。
- PIN 锁可正常工作。
- 分析图表正常渲染。
- 地图页可显示模糊位置。
- 关键页面具备 loading / empty / error state。
- 通过 ESLint，无明显类型错误。

---

## 19. 给 Trae AI 的执行指令

请严格根据本文档生成项目代码，并遵循以下要求：

1. 先完成项目初始化与目录结构搭建。
2. 再完成 Supabase schema、RLS 和类型定义。
3. 再实现认证流程。
4. 然后按 Milestone 顺序实现功能。
5. 每完成一个 Milestone，输出变更说明。
6. 所有 UI 必须是移动端优先。
7. 所有敏感逻辑必须在服务端处理。
8. 所有地图实现需使用可迁移抽象层，不要把 Leaflet API 散落在业务组件中。
9. 所有统计图使用 Recharts。
10. 如遇不明确设计，优先选择更保守、更隐私优先的方案。

---

## 20. 后续扩展预留（先不要实现）

请为未来能力预留可扩展空间，但暂不编码：

- 双人共享。
- Mapbox / MapLibre 迁移。
- PDF 导出。
- PWA 离线模式。
- 生物识别。
- 成就系统。
- 年度总结报告。
- 更高级的地理热力图和聚合分析。

---

## 21. 可选补充：建议优先实现的命令顺序

```bash
# 1. 创建项目
npx create-next-app@latest intimacy-tracker --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. 进入目录
cd intimacy-tracker

# 3. 安装依赖
npm install @supabase/supabase-js @supabase/ssr react-hook-form zod @hookform/resolvers date-fns clsx tailwind-merge lucide-react recharts leaflet react-leaflet sonner idb zustand dayjs csv-stringify

# 4. 初始化 shadcn/ui
npx shadcn@latest init

# 5. 添加基础组件
npx shadcn@latest add button card dialog drawer dropdown-menu form input label popover select separator sheet skeleton sonner switch tabs textarea badge tooltip calendar table alert-dialog avatar

# 6. 启动开发服务器
npm run dev
```

---

## 22. 最终要求

请直接开始编码，不要只生成示意代码。要求输出可运行、可扩展、结构清晰的生产级项目骨架，并优先保证：

- 安全性
- 清晰的数据结构
- 移动端录入体验
- 后续地图迁移能力
- 分析页面可扩展性

