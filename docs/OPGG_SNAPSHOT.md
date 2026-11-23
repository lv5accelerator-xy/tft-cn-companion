# OP.GG 18.2 排行榜快照

原 README 中的说明，统一 README 版式时原样移至此处。


`data/opgg-meta.generated.json` 收录 15 套 OP/S/A 阵容，与原有 14 套兔顶攻略合并展示；公众号同步脚本不会覆盖此独立快照。

- 来源：https://op.gg/tft/meta-trends/comps
- 版本核对：https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-2/
- 范围：全服务器、全段位、ALL 模式。采用来源页面展示的 `stat.label` 统计，不混用 `stat.deck`。
- 抓取于 2026-09-17；来源只标注约一周前更新，无法确认覆盖 9月14日热修。抓取时间不作为来源更新时间，不能视为实时或 NA 专属排行榜。
- 保留来源 OP/S/A 评级、平均名次、吃鸡率、前四率、登场率、阵容样本量、阵容码、装备和实际提供的站位。5 套来源缺少最终站位，明确提示并保留空棋盘，可在 Builder 手动摆放。
- 过渡阵容仅在来源人口与人数一致且英雄可解析时展示；来源没有回合/经济说明的，不编造固定运营要求。

再次人工更新：先保存公开页面 HTML，再运行 `python scripts/import-opgg.py <saved-page.html>`，检查版本、统计范围与数据后运行 `npm run release:check`。此导入器不会在构建时联网抓取。
