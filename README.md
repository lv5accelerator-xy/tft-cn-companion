# TFT CN Companion

美服《Teamfight Tactics / 云顶之弈》中文副屏助手。默认中文显示，同时保留 Riot NA 英文名称，面向英文客户端玩家快速查询英雄、装备、羁绊、强化、阵容、站位与运营资料。

## V1.0

- Set 18 · Enchanted Wilds
- Patch 18.2
- Next.js 16 + React 19 + TypeScript
- Riot Data Dragon + CommunityDragon
- OpenAI 图片一图流分析
- Supabase Auth + Postgres workspace sync

## V1.0 核心功能

### OP.GG 风格资料区

- 英雄 / 装备 / 羁绊 / 强化统一中英查询
- Windows 桌面字号优化
- 装备图鉴卡片化 + 右侧详情
- 标准成装、转职纹章、神器装备、战术家装备分类
- Spatula（金铲铲）/ Frying Pan（金锅锅）与 Set 18 转职合成
- 装备合成路径与 Riot 当前说明

### 阵容库

- 多来源阵容结构：兔顶之弈 / 神超不做人 / 林小北Lindo / TFT Academy
- TFT ONLY：拒绝《金铲铲之战》数据
- 4×7 参考站位，前排在上、后排在下
- Stage 2 / Stage 3 / Stage 4 运营摘要
- 一图流手动导入阵容可进入本地阵容库

### Builder Pro

- 最多 10 名英雄
- 4×7 棋盘直接编辑
- 英雄可拖入棋盘，也可先选英雄再点格子
- 左右镜像
- 双击棋子移除
- 每名英雄最多 3 件装备
- 主 C / 主坦 / 副 C 标记
- 当前阵容实时羁绊数量、已激活档位和距离下一档数量
- `TFTC2:` 分享码保存英雄、站位、装备和角色
- 兼容旧 `TFTC1:` 分享码
- 阵容推荐可直接载入 Builder

### AI 一图流导入

- JPG / PNG / WebP
- AI 提取阵容、Tier、英雄、主 C / 主坦、装备、强化、4×7 站位、运营、阵容码
- 人工校正工作台
- 一张汇总图可解析多套阵容
- 图片导入 → Builder 时同步站位、主 C / 主坦和装备
- 金铲铲内容硬过滤

### 中文 / English

右上角可切换中文和 English。英雄、装备、棋盘标签、装备说明、Builder、顶部导航和核心工具页面会按选择切换；底层仍保留中英双字段，因此搜索始终支持两种语言。

### 云同步

V1.0 使用 Supabase：

- Magic Link 邮箱登录
- 每个用户独立 `tft_workspaces` 记录
- PostgreSQL Row Level Security
- 同步 Builder、图片导入阵容和语言偏好
- 支持智能同步、本机 → 云端、云端 → 本机和自动同步

数据库迁移：

```text
supabase/migrations/001_workspace.sql
```

需要的 Vercel 环境变量：

```text
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 页面

```text
/            概览
/comps       当前阵容库
/champions   英雄
/items       装备图鉴 / 合成器
/traits      羁绊
/augments    强化
/builder     Builder Pro
/import      AI 一图流导入
/account     登录与云同步
/sources     数据来源状态
```

## 本地运行

```bash
npm ci
npm run dev
```

生产构建：

```bash
npm run verify:data
npm run verify:meta
npm run build
npm start
```

## 发布流程

`dev` 分支只通过 GitHub Actions 做数据校验和 Next.js Production Build，不触发 Vercel Preview；完整功能通过 CI 后合并到 `main`，由 Vercel 只执行一次 Production Deployment，避免 Hobby 方案 build-rate-limit。

## Riot 使用边界

Live 模式以赛前已存在的静态资料、公开攻略摘要、用户主动保存的阵容规划和快速查询为主。AI 图片模块用于用户主动上传的攻略图与训练/复盘工作流，不自动扫描对手棋盘，也不替用户执行游戏操作。

## Disclaimer

TFT CN Companion is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

## 安全修复与部署配置

- 使用 Node.js 24 和 `npm ci`，依赖版本及 `package-lock.json` 一起提交。
- `npm test` 执行同步冲突、导入数据保留、AI 访问控制和缓存的行为回归测试；CI 会运行这些测试。
- 自动同步通过服务端 `updated_at` 条件更新检查冲突，不再把上传时间当成内容修改时间。不需要数据库迁移。
- 首次在已有云端数据的设备同步，或两台设备都修改后，智能同步会保留双方版本并提示选择方向。手动覆盖和冲突处理前保留最近 5 份本机恢复备份，可在账号页导出。备份位于当前浏览器，不是额外的远程备份；无法保存备份时停止覆盖。
- 用户手动导入的阵容不再因名称、日期或补丁版本被自动删除。

AI 图片分析现在需要已登录的非匿名 Supabase 用户，以及 Upstash Redis REST 配置：

```text
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

这两个值仅供服务端使用，不要加 `NEXT_PUBLIC_` 前缀，也不要提交真实值。原有 `OPENAI_API_KEY` 和 Supabase 公开配置仍然需要。

限额为每位用户每 60 秒 2 次、每 24 小时 10 次、全站每 24 小时 100 次；窗口从第一次调用开始。Redis 脚本原子检查并扣除额度，多个服务实例共享额度。失败请求也计入额度，每次最多调用主模型及一次备用模型。配置缺失或额度服务故障时停止付费调用并返回 503；超额返回 429 和 `Retry-After`。上线前需要配置上述 Redis 环境变量，否则图片分析保持不可用。

本地测试使用模拟的 Supabase/Auth/Redis/OpenAI 响应，不会消耗 AI 额度，也不会写入生产数据库。
