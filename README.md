# TFT CN Companion

美服《云顶之弈》中文副屏助手。目标是让英文客户端玩家在对局中更快查询英雄、装备、羁绊与阵容信息，并为后续截图 / VOD 复盘模块预留结构。

## 当前版本

- V0.2
- Set 18 · Enchanted Wilds
- TFT Patch 18.1
- Next.js 16 + React 19 + TypeScript

## V0.2 已完成

- Riot 官方 Data Dragon（NA）数据接口
- Set 18 英雄英文名 ↔ 中文名自动配对
- Set 18 羁绊英文名 ↔ 中文名自动配对
- 标准 8 散件与基础成装双语查询
- 36 种基础散件组合的装备合成器
- 自动适配当前装备英文名称，并为近期改名装备保留旧称映射
- 英文 / 中文统一搜索
- 英雄按费用显示
- 英雄、装备、羁绊分类筛选
- 阵容规划器：最多选择 10 名英雄
- 阵容收藏：使用浏览器 LocalStorage 本地保存
- 紧凑副屏模式
- `/` 快捷键聚焦搜索，`Esc` 清空搜索
- 手机、平板、窄屏响应式布局
- Riot 数据不可用时的本地回退状态
- GitHub Actions：自动校验 Riot 在线数据并执行生产构建

## 当前装备名称变化

Data Dragon 16.17.1 中，下列基础成装使用了新的英文名称：

- `Kraken's Fury`（旧称 `Runaan's Hurricane`）
- `Spirit Visage`（旧称 `Redemption`）
- `Striker's Flail`（旧称 `Guardbreaker`）

项目以 Riot 当前 NA Data Dragon 名称为准，并在数据层保留旧称，方便后续兼容旧攻略搜索。

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
3. 不需要环境变量即可运行 V0.2
4. 部署完成后即可得到公开网址

## 下一步

1. 接入当前版本主流阵容数据库
2. 为阵容加入核心棋子、主 C / 主坦、装备优先级和站位
3. 加入强化符文双语查询
4. 加入 Spatula / Frying Pan 与转职合成
5. 加入个人 Riot ID 战绩导入与赛后复盘
6. 建立截图 / VOD Coach 模块，用于训练和赛后分析
7. Windows Tauri 悬浮小窗

## Riot 使用边界

Live 模式只提供赛前已知的静态资料、用户自己预先保存的阵容规划和快速查询，不读取当前棋盘来动态改变建议，不追踪对手棋盘，也不预测对手下一步。截图 / VOD Coach 优先用于训练和赛后复盘。

## Disclaimer

TFT CN Companion is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
