# TFT CN Companion

美服《云顶之弈》中文副屏助手。目标是让英文客户端玩家在对局中更快查询英雄、装备、羁绊与阵容信息，并为后续截图/VOD复盘模块预留结构。

## 当前版本

- V0.1
- Set 18 · Enchanted Wilds
- Patch 18.1
- Next.js 16 + React 19 + TypeScript

## 已完成

- 中英文统一搜索
- 阵容 / 英雄 / 装备 / 羁绊分类筛选
- 深色副屏 UI
- 手机与窄屏响应式布局
- 当前补丁标记
- AI Coach 与阵容规划器预留区

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

## 下一步

1. 接入 Set 18 完整英雄、装备、羁绊数据
2. 建立中英名称映射
3. 增加装备合成器
4. 增加阵容收藏与局内简化视图
5. 增加截图/VOD复盘入口
6. 部署到 Vercel

## Riot 使用边界

Live 模式以静态查询和赛前已存在的信息为主；截图/VOD分析优先用于训练与赛后复盘，避免把产品设计成根据当前局内状态实时替玩家做决策的自动化工具。

## Disclaimer

TFT CN Companion is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
