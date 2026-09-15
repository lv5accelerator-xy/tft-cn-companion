# Set 18 Rift unit supplement

Patch 18.2 reviewed comps from 兔顶之弈 use several playable Rift monsters that Riot's standard `tft-champion` Data Dragon payload does not consistently expose.

The runtime catalog supplements only the reviewed units referenced by the 14 current comps. Their aliases are source-facing names such as `蓝霸符`, `石甲虫`, `迅捷蟹`, `红霸符` and `锋喙鸟`.

`npm run verify:data` must resolve every `coreUnits`, `flexUnits` and board unit in `data/live-meta.generated.json`; a missing unit blocks release. Portrait crops in `public/special-units/` are derived from the user-provided 兔顶之弈 infographics for this reviewed data set.

This supplement does not restore any old comp records. The only canonical 德子九五 remains the Patch 18.2 record in the reviewed meta snapshot.
