# 2026-09 全面审计修复记录(fix/audit-bug-fixes 分支)

## 背景

对项目做了四轮递进式检查:全库审计(安全/数据完整性/功能)→ 修复 → 对修复本身的对抗性回归审查(两轮)→ 性能专项审查。本文记录全部已修复项、修复方式、遗留低优先项与部署注意事项。

**分支提交**(基于 dev,共 13 个):

| 提交 | 主题 |
|---|---|
| e421ecb | 编辑保存数据丢失(照片/ended_at/笔记/mood) |
| 97fc898 | 安全:解密预言机、刷票、开放重定向、PIN 伪造、限流降级、导出加固 |
| 49e8504 | 迁移 0050/0051:RLS 写策略、RPC 加固、时区感知分析 |
| d91ea01 | 前端状态与 UI bug(回放/时间线/地图/设置/PWA/报告页) |
| 781e584 | Lint 清零、i18n 补齐、回归测试 |
| 44e2c6e | Next 16 cacheComponents 预渲染(法务页 Suspense) |
| 8ee91f2 | 照片桶私有化 + 签名 URL + 身份码竞争 |
| 70f2a3b | 回归审查修复:PIN 找回、照片回传、admin 过滤 |
| c1e54e7 | admin 仪表盘 stats.filters 崩溃 |
| 152a0e8 | 照片隐私切换持久化、admin 结束日期含当天 |
| 92d298d | 时间线无限滚动 22P02(游标缺 id 段) |
| aa36812 | 性能:请求瀑布、N+1、缺索引、渲染开销 |

## 已修复项(按类别)

### 数据丢失(严重)
- 编辑页保存清空全部照片:编辑页现从 DB 加载照片回传;update 的照片替换为差量式(先 upsert 新的、按 id 删陈旧的),`photos: undefined` 表示"不动"
- 抽屉编辑清空 `ended_at`/`location_notes`/未映射 mood;解密失败时误清笔记(notesUnavailable 信号,undefined 跳过该列)
- update/delete 无受影响行校验导致 RLS 拦截下"假成功" → 显式报错
- 编辑回传 1 小时签名 URL 腐烂存储 → 写入侧统一 normalizePhotoUrl 归一化为裸路径

### 安全
- `/api/decrypt-notes` 解密预言机(客户端可提交任意密文)→ 只收 encounterId,密文服务端自取;列表/详情查询不再下发 notes_encrypted
- PIN 解锁 cookie 静态 "1" 可伪造 → HMAC 签名、绑定用户、带过期(fail-closed)
- `/lock?next=//evil.com` 开放重定向 + 畸形编码 500 → sanitizeRedirectPath
- 公开投票刷票(轮换 anonymousId 绕过)→ 服务端 HMAC(poll, IP) 派生身份、窗口/选项归属校验、zod、限流
- 限流 Redis 缺失/故障时 fail-open → 内存兜底限流
- 导出:CSV 公式注入中和、no-store、截断标记、审计失败不再吞掉
- SECURITY DEFINER RPC 加固(create_encounter_atomic 校验 auth.uid/伴侣归属/rating;get_platform_stats 管理员专属;get_poll_results 公开+活跃才可读)
- PIN 列(pin_hash/pin_attempts/pin_locked_until/pin_reset_*)从 authenticated 列授权移除,全部写入走 service-role(否则忘记 PIN 即永久锁死)
- 照片桶 private + 存量 URL 转路径;读取全部服务端签名(短时 URL);feedback 桶改签名 URL
- 身份码并发竞争:守卫更新(.is null)+ 受影响行校验 + 唯一索引
- report/generate 限流、theme 白名单、错误不外泄;坏掉的 download 路由删除

### 正确性
- 时间线无限滚动 22P02:游标编码/解码统一(lib/utils/encounter-cursor),页面传服务端 nextCursor
- 时区:分析 RPC 按用户时区分桶(0051,带 PGRST202 回退);年度报告按每条记录时区(Intl)分桶;星期约定三方(聚合器/海报/页面)一致
- 单向解绑 → 双向同步镜像伴侣 + 清双方默认绑定
- 海报中文字体(Noto Sans SC 恢复加载)、页脚年份动态化
- 回放索引越界/日期过滤器清不掉;时间线删除后残留渲染、preset id 跨会话冲突
- SettingsView TDZ 崩溃、时区水合不匹配、挂载自动保存竞态;PIN 后台阈值 0 → 60s
- PWA:平台检测竞态、dev 环境 SW 拦截、重复 "/" 路由合并、SW 预缓存单点失败、离线缓存无限增长
- 过期链接:recovery → /forgot-password,其余 → /login,本地化文案
- admin:stats.filters 崩溃、过滤参数被静默忽略(0053 参数化 RPC + 逐项校验 + 回退感知标签)、结束日期含当天
- 加载失败自动无限重试 + toast 轰炸 → 手动重试按钮

### 性能
- getServerUser 请求级 React cache()(原每渲染 2-5 次鉴权网络往返)
- 时间线页面/查询、报告聚合器、抽屉照片+笔记全部并行化
- /api/partners 用 get_manage_partners_rpc 单聚合查询(原 2N+1)
- 0054 索引:poll_votes(option_id)、encounter_photos(encounter_id)、partner_photos(partner_id/user_id)、saved_addresses(user_id)
- Intl formatter 缓存(工具层 + 卡片层,原每卡片 4 次构建)
- 搜索防抖 200ms;报告页等伴侣列表就绪再拉最重接口;html-to-image 按需导入

### 工程质量
- ESLint 错误清零;删除死组件(ReportPreview/ShareModal)与无效 schema 占位文件
- 单测 222 → 255(新增:游标解析、safe-redirect 矩阵、PIN token 伪造/过期/绑定、签名 URL 解析、限流内存兜底)

## 遗留低优先项(已评估,暂不处理)

| 项 | 影响 | 建议 |
|---|---|---|
| i18n 全目录随页面序列化(~51KB/语言) | 每次完整加载的 flight 数据体积 | 按布局/页裁剪命名空间 |
| 时间线无虚拟化 | 数百卡片后 DOM 体积 | react-virtuoso 或 content-visibility:auto |
| admin 投票页查询扇(2P+P×O) | 仅管理员页 | GROUP BY 改写 |
| admin 自定义日期按 UTC 天边界 | UTC+8 有最多 8h 渗入 | 传时区或按本地日聚合 |
| router.refresh() 后已加载页折叠回 50 条 | 滚动位置丢失(状态一致) | 保留已加载页再合并 |
| 同一记录并发保存照片差量非原子 | last-writer-wins 可能互删 | 事务化 RPC |
| 年度报告年界午夜 ± 时区记录归入相邻月份 | 语义边界,无崩溃 | 以本地年界过滤 |
| 匿名投票防刷依赖代理传真实 XFF | 无可信代理时可轮换 | 文档化部署要求 |

## 部署注意事项

1. **迁移必须应用**:`supabase db push` 应用 0050–0054(0050 列授权后 PIN 写入依赖服务端代码,已同步修改,两者需一起上线)
2. **环境变量**:`ENCRYPTION_SECRET`(必需,PIN cookie 签名复用;缺失时 PIN 解锁 fail-closed);`PIN_UNLOCK_SECRET` 可选覆盖;Upstash Redis 可选(缺失时用内存限流,仅单实例有效)
3. 迁移链全新环境引导限制见 `supabase/migrations/README.md`
4. avatars 桶保持 public(设计决策:头像为主动共享的资料图)
