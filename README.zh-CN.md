<div align="center">

# Encounter

**以隐私为核心的亲密关系记录器，Linear 美学设计**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一款注重隐私的 PWA 应用，提供军事级加密保护、端到端加密和精致的深色模式界面。

[功能特性](#功能特性) · [快速开始](#快速开始) · [文档](#文档) · [参与贡献](#参与贡献)

</div>

---

## 项目简介

Encounter 是一款专注于隐私保护的 Web 应用，专为希望记录亲密行为的成年人设计。它将极简、快速的数据录入流程与强大的分析功能相结合——同时通过加密、PIN 保护和行级安全 (RLS) 严格保护您的隐私。

**核心原则：**
- 🔒 **隐私优先**：数据静态和传输中均加密
- ⚡ **极速记录**：移动端 3 秒内完成一条记录
- 📊 **深度分析**：精美的图表和热力图可视化
- 🌐 **离线可用**：完整的 PWA 支持，支持离线访问

## 功能特性

### 核心功能
- **快速记录** — 单屏移动端优先表单，智能默认值
- **时间线** — 时间顺序卡片列表，游标分页
- **仪表盘** — 综合分析看板，7+ 种图表类型
- **地图** — Mapbox 驱动的热力图和点位可视化
- **回放** — 地图上的动画旅程重放

### 隐私与安全
- **端到端加密** — AES-256-GCM 加密备注，HKDF 密钥派生
- **PIN 锁** — 4-6 位 PIN 码，防暴力破解保护
- **行级安全** — 通过 Supabase RLS 实现数据库级用户隔离
- **审计日志** — 追踪数据访问和导出记录

### 数据管理
- **伴侣档案** — 支持多位伴侣，自定义颜色和头像
- **标签系统** — 自定义标签分类记录
- **CSV 导出** — 导出所有数据，包含审计追踪
- **图片附件** — 上传前客户端压缩

### 高级功能
- **双人绑定** — 与伴侣绑定，共享可见性
- **位置模式** — 关闭 / 城市级 / 精确坐标
- **活动热力图** — GitHub 风格的年度活动可视化
- **深色/浅色主题** — 跟随系统，支持手动切换

### 技术特性
- **PWA** — 可安装到手机主屏幕
- **国际化** — 支持中文和英文
- **移动优先** — 响应式设计，底部 Tab 导航

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| **UI 组件** | shadcn/ui, Radix UI, Lucide Icons, Recharts, Motion |
| **状态管理** | Zustand 5 |
| **地图** | Mapbox GL 3, Turf.js |
| **后端** | Next.js Server Actions, Route Handlers |
| **数据库** | Supabase (PostgreSQL)，包含 37 个迁移文件 |
| **认证** | Supabase Auth（邮箱/密码） |
| **邮件** | Resend |
| **限流** | Upstash Redis |
| **PWA** | Serwist (Service Worker) |
| **部署** | Vercel |

## 快速开始

### 前置要求

- **Node.js** 18+（推荐：20+）
- **pnpm**（推荐）或 npm/yarn
- **Supabase 账户** — [supabase.com](https://supabase.com/)
- **Mapbox Token**（可选）— [mapbox.com](https://www.mapbox.com/)

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/encounter.git
cd encounter
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 环境变量

在根目录创建 `.env.local` 文件：

```env
# 必需：Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key

# 必需：加密密钥
ENCRYPTION_SECRET=至少32位的随机密钥

# 必需：邮件服务
RESEND_API_KEY=你的_resend_api_key
RESEND_FROM_EMAIL=noreply@你的域名.com

# 可选：应用配置
NEXT_PUBLIC_APP_NAME=Encounter
NEXT_PUBLIC_DEFAULT_TIMEZONE=UTC

# 可选：Mapbox（地图功能）
NEXT_PUBLIC_MAPBOX_TOKEN=你的_mapbox_token

# 可选：限流配置（Upstash Redis）
UPSTASH_REDIS_REST_URL=你的_redis_url
UPSTASH_REDIS_REST_TOKEN=你的_redis_token
```

### 4. 数据库配置

1. 在 [Supabase](https://supabase.com/) 创建新项目
2. 安装 [Supabase CLI](https://supabase.com/docs/guides/cli)
3. 链接项目并运行迁移：

```bash
supabase link --project-ref 你的项目ID
supabase db push
```

### 5. 启动开发服务器

```bash
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## 文档

| 文档 | 说明 |
|------|------|
| [设计系统](./design.md) | Linear 风格视觉设计指南 |
| [产品规格](./intimacy-tracker-dev-spec.md) | 完整产品开发规格（中文） |
| [AI 协作协议](./AGENTS.md) | Git 工作流和编码标准 |
| [AI 编码准则](./CLAUDE.md) | AI 辅助开发准则 |

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── (app)/              # 受保护路由（仪表盘、时间线等）
│   ├── (public)/           # 公开路由（登录、注册等）
│   └── api/                # API 路由处理器
├── components/             # React 组件
│   ├── ui/                 # 基础 UI 组件（shadcn）
│   ├── layout/             # 布局组件（侧边栏、导航）
│   ├── analytics/          # 仪表盘和图表
│   ├── forms/              # 表单组件
│   ├── timeline/           # 时间线视图
│   ├── map/                # 地图组件
│   ├── partners/           # 伴侣管理
│   └── settings/           # 设置面板
├── features/               # 业务逻辑和服务器操作
│   ├── auth/               # 认证
│   ├── records/            # 记录 CRUD
│   ├── analytics/          # 统计查询
│   ├── partners/           # 伴侣管理
│   ├── map/                # 地图数据查询
│   └── privacy/            # PIN 和隐私设置
├── lib/                    # 工具函数和配置
│   ├── supabase/           # Supabase 客户端设置
│   ├── auth/               # PIN 哈希和验证
│   ├── encryption/         # AES-256-GCM 加密
│   └── email/              # Resend 邮件模板
├── stores/                 # Zustand 状态管理
├── hooks/                  # 自定义 React Hooks
└── i18n/                   # 国际化配置
```

## 配置说明

### 位置模式

Encounter 支持三种位置精度级别：

| 模式 | 说明 | 存储内容 |
|------|------|----------|
| `off` | 不收集位置数据 | 无 |
| `city` | 城市级近似 | 城市/国家名称 |
| `exact` | GPS 坐标 | 经纬度 + 城市/国家 |

### PIN 安全机制

PIN 系统实现渐进式锁定保护：

| 失败次数 | 锁定时长 |
|----------|----------|
| 1-4 | 无 |
| 5 | 1 分钟 |
| 6 | 5 分钟 |
| 7 | 15 分钟 |
| 8+ | 1 小时 |

PIN 哈希使用 scrypt (v2) 存储，自动从旧版 HMAC (v1) 升级。

## 部署

### Vercel（推荐）

1. 推送到 GitHub
2. 在 [Vercel](https://vercel.com/) 导入项目
3. 配置环境变量
4. 部署

### 自托管

```bash
pnpm build
pnpm start
```

## 参与贡献

欢迎贡献代码！请按以下步骤操作：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

请阅读 [AGENTS.md](./AGENTS.md) 了解我们的 Git 工作流和编码标准。

## 安全

如有安全问题，请直接发送邮件至 [security@yourdomain.com](mailto:security@yourdomain.com)。

**安全特性：**
- AES-256-GCM 加密敏感数据
- 所有表启用行级安全 (RLS)
- PIN 暴力破解保护
- 数据导出审计日志
- 无追踪、无分析、无第三方服务

## 许可证

本项目基于 MIT 许可证开源 - 详情请查看 [LICENSE](LICENSE) 文件。

---

<div align="center">

**为注重隐私的你精心打造**

</div>
