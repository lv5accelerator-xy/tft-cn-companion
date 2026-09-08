# TFT CN Companion

美服《云顶之弈》中文副屏助手。目标是让英文客户端玩家在对局中更快查询英雄、装备、羁绊、强化与当前版本阵容信息，并为后续截图 / VOD 复盘模块预留结构。

## 当前版本

- V0.4
- Set 18 · Enchanted Wilds
- TFT Patch 18.1 / 阵容层按 18.1d 筛选
- Next.js 16 + React 19 + TypeScript

## V0.4 已完成

- Riot 官方 Data Dragon（NA）数据接口
- Set 18 英雄英文名 ↔ 中文名自动配对
- Set 18 羁绊英文名 ↔ 中文名自动配对
- **Set 18 强化符文英文名 ↔ 中文名自动配对（当前 34 条 `DA_18_*`）**
- 英雄 / 装备 / 羁绊 / 强化统一中英搜索
- 标准 8 散件与 36 个基础成装双语查询
- 36 种基础散件组合的装备合成器
- 近期改名装备支持旧英文名 / 旧中文名搜索
- 英雄按费用显示
- 阵容规划器：最多选择 10 名英雄
- 阵容收藏：使用浏览器 LocalStorage 本地保存
- 当前版本阵容库 `/comps`
- 阵容 Fast 8 / 追三筛选
- 每套阵容提供“什么时候玩、核心棋子、装备优先、关键说明、Stage 2–4 运营”
- 当前阵容核心棋子自动匹配 Riot Data Dragon 中文名和头像
- 紧凑副屏模式
- `/` 快捷键聚焦搜索，`Esc` 清空搜索
- 手机、平板、窄屏响应式布局
- GitHub Actions：自动校验 Riot 在线数据并执行生产构建

## 强化符文数据

Riot 官方 Data Dragon 的 `tft-augments.json` 提供强化 ID、翻译名称和图标。V0.4 同时读取 `en_US` 与 `zh_CN`，并只收录当前 Set 18 的 `DA_18_*` 记录，避免把旧赛季强化混进对局查询。

当前 Data Dragon 16.17.1 实测：

- Set 18 强化：34
- `zh_CN` 对应：34 / 34

例如：`Blossom's Call`、`Nature's Shelter`、`Beast Within`、`Master of All Origins` 等均可直接用英文或中文搜索。

## 当前阵容库

V0.4 当前按 Patch 18.1d 的活跃 Set 18 攻略人工筛选，包含：

- Malphite AP Flex
- Primal Flex
- Invoker Nidalee
- Yi Rengar
- Adaptor Reroll
- Lunarwood Kha'Zix
- Aphelios Nidalee

阵容层不是自动抓取后直接展示，而是人工核对当前补丁攻略后，把来源能够证明的核心棋子、灵活单位和运营节点整理为副屏快速阅读格式。网站中每张阵容卡保留原始来源入口。

## 当前装备名称变化

Data Dragon 16.17.1 中，下列基础成装使用了新的英文名称：

- `Kraken's Fury`（旧称 `Runaan's Hurricane`）
- `Spirit Visage`（旧称 `Redemption`）
- `Striker's Flail`（旧称 `Guardbreaker`）

项目以 Riot 当前 NA Data Dragon 名称为准，同时保留旧称别名。

## 数据自检

```bash
npm run verify:data
```

该命令会连接 Riot NA Data Dragon，确认当前 Set 18 英雄、羁绊、强化、8 个基础散件、36 个基础成装以及对应的 `zh_CN` 数据均可读取。GitHub Actions 会在每次推送后自动执行此检查，然后执行生产构建。

## 页面

```text
/        资料助手 / 装备合成 / 强化查询 / 个人阵容规划
/comps   Patch 18.1d 当前阵容快速查看
```

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:3000
```

生产构建：

```bash
npm run build
npm start
```

## Vercel

项目代码本身可直接部署到 Vercel，V0.4 不需要环境变量。当前连接器曾返回一个 `INITIALIZING` Preview 记录，但随后 Vercel 项目 / Deployment 查询接口无法找到该记录，因此该次尝试不视为成功部署。

## 下一步

1. 加入 Spatula / Frying Pan 与转职合成
2. 为当前阵容补站位示意和更完整的替代分支
3. 建立强化符文与阵容的静态关联提示
4. 加入个人 Riot ID 战绩导入与赛后复盘
5. 建立截图 / VOD Coach 模块，用于训练和赛后分析
6. Windows Tauri 悬浮小窗

## Riot 使用边界

Live 模式只提供赛前已知的静态资料、当前补丁公开攻略摘要、用户自己预先保存的阵容规划和快速查询，不读取当前棋盘来动态改变建议，不追踪对手棋盘，也不预测对手下一步。Riot 当前政策明确允许游戏内提供赛前已存在的静态数据，但不允许基于当前游戏状态提供动态实时指令。

## Disclaimer

TFT CN Companion is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
