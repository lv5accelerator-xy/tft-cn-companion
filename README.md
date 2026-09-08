# TFT CN Companion

美服《云顶之弈》中文副屏助手。目标是让英文客户端玩家在对局中更快查询英雄、装备、羁绊与当前版本阵容信息，并为后续截图 / VOD 复盘模块预留结构。

## 当前版本

- V0.3
- Set 18 · Enchanted Wilds
- TFT Patch 18.1 / 阵容层按 18.1d 筛选
- Next.js 16 + React 19 + TypeScript

## V0.3 已完成

- Riot 官方 Data Dragon（NA）数据接口
- Set 18 英雄英文名 ↔ 中文名自动配对
- Set 18 羁绊英文名 ↔ 中文名自动配对
- 标准 8 散件与 36 个基础成装双语查询
- 36 种基础散件组合的装备合成器
- 自动适配当前装备英文名称
- 近期改名装备支持旧英文名 / 旧中文名搜索
- 英文 / 中文统一搜索
- 英雄按费用显示
- 英雄、装备、羁绊分类筛选
- 阵容规划器：最多选择 10 名英雄
- 阵容收藏：使用浏览器 LocalStorage 本地保存
- 当前版本阵容库 `/comps`
- 阵容 Fast 8 / 追三筛选
- 每套阵容提供“什么时候玩、核心棋子、装备优先、关键说明、Stage 2–4 运营”
- 当前阵容核心棋子自动匹配 Riot Data Dragon 中文名和头像
- 紧凑副屏模式
- `/` 快捷键聚焦搜索，`Esc` 清空搜索
- 手机、平板、窄屏响应式布局
- Riot 数据不可用时的本地回退状态
- GitHub Actions：自动校验 Riot 在线数据并执行生产构建

## 当前阵容库

V0.3 第一批按 Patch 18.1d 的活跃 Set 18 攻略人工筛选，当前包含：

- Malphite AP Flex
- Primal Flex
- Invoker Nidalee
- Yi Rengar
- Adaptor Reroll
- Lunarwood Kha'Zix
- Aphelios Nidalee

阵容层不是根据名称自动抓取后直接展示，而是人工核对当前补丁攻略后，把来源能够证明的核心棋子、灵活单位和运营节点整理为副屏快速阅读格式。这样可以避免旧赛季阵容或已经跌出环境的攻略冒充当前 Meta。

当前阵容摘要主要参考 TFT Academy 的 Patch 18.1d 活跃 Set 18 指南；网站中每张阵容卡保留原始来源入口。评级属于第三方 Meta 参考，不是 Riot 官方排名。

## 当前装备名称变化

Data Dragon 16.17.1 中，下列基础成装使用了新的英文名称：

- `Kraken's Fury`（旧称 `Runaan's Hurricane`）
- `Spirit Visage`（旧称 `Redemption`）
- `Striker's Flail`（旧称 `Guardbreaker`）

项目以 Riot 当前 NA Data Dragon 名称为准，同时保留旧称别名。因此在资料助手中输入 `Redemption`、`Guardbreaker` 等旧攻略名称仍能找到当前装备。

## 数据来源

主要静态数据来自 Riot Games 官方 Data Dragon：

- `realms/na.json` 获取 NA 当前 Data Dragon 版本
- `tft-champion.json`
- `tft-item.json`
- `tft-trait.json`
- 同时读取 `en_US` 与 `zh_CN`，使用相同 ID 建立中英名称映射

Data Dragon 的 TFT 数据由 Riot 维护，但官方说明其更新是人工流程，因此极短时间内可能晚于刚发布的补丁。项目在界面中显示实际加载到的 Data Dragon 版本，方便核对。

### 数据自检

```bash
npm run verify:data
```

该命令会连接 Riot NA Data Dragon，确认当前 Set 18 英雄、羁绊、8 个基础散件、36 个基础成装以及 `zh_CN` 对应数据均可读取。GitHub Actions 会在每次推送后自动执行此检查，然后再执行生产构建。

## 页面

```text
/        资料助手 / 装备合成 / 个人阵容规划
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

## 推荐部署

项目可以直接导入 Vercel：

1. 在 Vercel 选择 `lv5accelerator-xy/tft-cn-companion`
2. Framework Preset 选择 Next.js（通常会自动识别）
3. V0.3 不需要环境变量即可运行
4. 部署完成后即可得到公开网址

## 下一步

1. 加入强化符文双语查询与阵容关联
2. 加入 Spatula / Frying Pan 与转职合成
3. 为当前阵容补站位示意和更多可靠的替代分支
4. 加入个人 Riot ID 战绩导入与赛后复盘
5. 建立截图 / VOD Coach 模块，用于训练和赛后分析
6. Windows Tauri 悬浮小窗

## Riot 使用边界

Live 模式只提供赛前已知的静态资料、当前补丁公开攻略摘要、用户自己预先保存的阵容规划和快速查询，不读取当前棋盘来动态改变建议，不追踪对手棋盘，也不预测对手下一步。截图 / VOD Coach 优先用于训练和赛后复盘。

## Disclaimer

TFT CN Companion is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
