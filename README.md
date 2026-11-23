# 云顶中文助手：TFT CN Companion

[![CI](https://github.com/lv5accelerator-xy/tft-cn-companion/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/lv5accelerator-xy/tft-cn-companion/actions/workflows/ci.yml)

美服《Teamfight Tactics / 云顶之弈》中文副屏助手。默认中文显示，同时保留 Riot NA 英文名称，面向英文客户端玩家快速查询英雄、装备、羁绊、强化、阵容、站位与运营资料。

**[▶ 在线使用](https://tft-cn-companion-web.vercel.app)**

## 功能

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

- Supabase Magic Link 邮箱登录，每个用户独立 `tft_workspaces` 记录，PostgreSQL Row Level Security。
- 同步 Builder、图片导入阵容和语言偏好；支持智能同步、本机 → 云端、云端 → 本机和自动同步。
- 冲突时保留双方版本并提示选择方向，覆盖前在本机保留最近 5 份恢复备份。

### 页面


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


## 当前版本

<!-- CURRENT_VERSION_START -->
**V1.0** · Set 18 · Enchanted Wilds · Patch 18.2
阵容库合并 14 套兔顶攻略与 15 套 OP.GG 18.2 排行榜快照（抓取于 2026-09-17，见[快照说明](docs/OPGG_SNAPSHOT.md)）。
<!-- CURRENT_VERSION_END -->

技术栈：Next.js 16 + React 19 + TypeScript；Riot Data Dragon + CommunityDragon；OpenAI 图片分析；Supabase Auth + Postgres。

## 本地运行

需要 Node.js 24。

```bash
npm ci
npm run dev
```

生产构建：`npm run verify:data && npm run verify:meta && npm run build && npm start`。

### 环境变量

```text
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Upstash 两项只供服务端使用，不要加 `NEXT_PUBLIC_` 前缀，也不要提交真实值；缺少时图片分析保持不可用。数据库迁移在 `supabase/migrations/001_workspace.sql`。AI 图片分析的登录要求与限额见[安全与部署配置](docs/SECURITY_AND_DEPLOY.md)。

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| `app/` | Next.js 页面与 API 路由 |
| `lib/` | 同步、开局助手、复盘、计算器等业务逻辑 |
| `data/` | 英雄、装备、羁绊、强化、阵容与排行榜快照数据 |
| `public/` | 静态图片 |
| `scripts/` | 数据校验、发布检查与 OP.GG 快照导入 |
| `supabase/` | 数据库迁移 |
| `tests/` | Node 行为回归测试（模拟 Supabase/Auth/Redis/OpenAI，不消耗额度） |
| `docs/` | V1.0 计划、状态、检查清单与数据来源说明 |
| `.github/` | CI 与阵容数据同步工作流 |

## 开发与测试

```bash
npm test                  # 同步冲突、导入数据保留、AI 访问控制和缓存的行为回归
npm run release:check     # 测试 + 全部数据/界面/发布校验 + 生产构建
```

## 发布

`dev` 分支只通过 GitHub Actions 做数据校验和 Next.js 生产构建，不触发 Vercel Preview；功能通过 CI 后合并到 `main`，由 Vercel 只执行一次 Production Deployment，避免 Hobby 方案 build-rate-limit。

## 文档

- [V1.0 状态](docs/V1.0-STATUS.md) · [V1.0 计划](docs/V1.0-PLAN.md) · [V1.0 检查清单](docs/V1.0-CHECKLIST.md) · [V1.0 说明](docs/V1.0-NOTES.md)
- [排行榜来源](docs/ranking-sources.md) · [OP.GG 18.2 快照](docs/OPGG_SNAPSHOT.md) · [发布安全](docs/release-safety.md) · [安全与部署配置](docs/SECURITY_AND_DEPLOY.md)

## Riot 使用边界与授权

Live 模式以赛前已存在的静态资料、公开攻略摘要、用户主动保存的阵容规划和快速查询为主。AI 图片模块用于用户主动上传的攻略图与训练/复盘工作流，不自动扫描对手棋盘，也不替用户执行游戏操作。

TFT CN Companion is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

仓库当前未附带开源许可证。仓库公开可见不代表代码可被任意复制、修改或再发布；如需使用，请先联系仓库所有者取得授权。
