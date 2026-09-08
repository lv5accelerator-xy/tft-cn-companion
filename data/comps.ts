export type CompTier = "A" | "B" | "ACTIVE";

export type StagePlan = {
  stage: "Stage 2" | "Stage 3" | "Stage 4";
  text: string;
};

export type MetaComp = {
  id: string;
  name: string;
  nameZh: string;
  tier: CompTier;
  patch: string;
  playstyle: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  coreUnits: string[];
  flexUnits: string[];
  itemFocus: string[];
  traits: string[];
  whenToPlay: string;
  keyNotes: string[];
  stages: StagePlan[];
  source: string;
  sourceUrl: string;
};

export const metaUpdatedAt = "2026-09-08";
export const metaPatch = "18.1d";

export const metaComps: MetaComp[] = [
  {
    id: "malphite-ap-flex",
    name: "Malphite AP Flex",
    nameZh: "墨菲特 AP 灵活阵",
    tier: "A",
    patch: metaPatch,
    playstyle: "4-Cost Fast 8",
    difficulty: "MEDIUM",
    coreUnits: ["Malphite", "Azir"],
    flexUnits: ["Ahri", "Zyra", "Ezreal", "Lillia", "Amumu", "Kennen", "Maokai", "Fiddlesticks", "Cassiopeia"],
    itemFocus: ["Malphite tank/carry", "Generic AP"],
    traits: ["Flora Fatalis", "Blossom"],
    whenToPlay: "有强 AP 开局、能做通用法系装，且中期血量允许在 8 级寻找四费核心时。",
    keyNotes: [
      "核心思路是 Malphite + Azir，并补 2 Flora Fatalis 提供治疗。",
      "额外输出可在 Ahri / Zyra / Ezreal 中灵活选择。",
      "前排支援可根据来牌使用 Lillia / Amumu / Kennen / Maokai。",
      "不要在 8 级搜牌时只盯一套固定牌；优先使用你先两星的高质量单位。",
    ],
    stages: [
      { stage: "Stage 2", text: "用强 AP 开局，优先 Blossom；通用 AP 装和 Malphite 可用装备可以直接合成争连胜。" },
      { stage: "Stage 3", text: "加入 Fiddlesticks、Cassiopeia、Azir 等高质量三费并围绕其羁绊过渡，装备优先给已升级单位。" },
      { stage: "Stage 4", text: "升级人口并开始找 Malphite；根据实际抽到的四费灵活重组前排与副 C。" },
    ],
    source: "TFT Academy",
    sourceUrl: "https://tftacademy.com/tierlist/comps/set-18-soraka-flex",
  },
  {
    id: "primal-flex",
    name: "Primal Flex",
    nameZh: "Primal 灵活阵",
    tier: "A",
    patch: metaPatch,
    playstyle: "4-Cost Fast 8",
    difficulty: "MEDIUM",
    coreUnits: ["Nidalee", "Sivir", "Kog'Maw", "Amumu"],
    flexUnits: ["Malphite", "Maokai", "Ashe", "Kennen", "Gnar", "Taric"],
    itemFocus: ["Nidalee", "Sivir", "Tank"],
    traits: ["Primal", "Vanguard"],
    whenToPlay: "AD 装充足、前期能靠 Riftbeast / Cinderling 等单位稳住节奏，并准备在 8 级找 Nidalee 与 Sivir 时。",
    keyNotes: [
      "装备优先级 Nidalee > Sivir；Kog'Maw 自带破甲/魔抗削减功能。",
      "前排可以围绕 Amumu + Vanguard 构建，不必死锁单一坦克组合。",
      "高上限可以逐步放弃低质量 Riftbeast，换入 Maokai / Ashe / Kennen；另一版本上限也可使用 Gnar / Ashe / Taric。",
      "Hunter 徽章给 Nidalee 的收益很高。",
    ],
    stages: [
      { stage: "Stage 2", text: "围绕 Cinderling 2 + Riftbeast 的强 AD 开局，AD 与坦克装积极合成争连胜。" },
      { stage: "Stage 3", text: "这套阵容很吃大剑；选秀和装备类强化可优先补大剑与通用 AD 装。" },
      { stage: "Stage 4", text: "8 级寻找 Nidalee、Sivir 与主坦；Malphite 被抢时可切 Sentinel 或 Krug 类前排。" },
    ],
    source: "TFT Academy",
    sourceUrl: "https://tftacademy.com/tierlist/comps/set-18-primal-jungle-copy",
  },
  {
    id: "invoker-nidalee",
    name: "Invoker Nidalee",
    nameZh: "Invoker 奈德丽",
    tier: "ACTIVE",
    patch: metaPatch,
    playstyle: "4-Cost Fast 8",
    difficulty: "MEDIUM",
    coreUnits: ["Nidalee", "Morgana", "Kog'Maw"],
    flexUnits: ["Kayle", "Master Yi", "Pebbles"],
    itemFocus: ["Nidalee", "Morellonomicon on Morgana", "Tank", "AP on Morgana"],
    traits: ["Invoker", "Primal"],
    whenToPlay: "法棒多、能做 Rageblade/AP 过渡，且 8 级有条件寻找 4 Invoker 时。",
    keyNotes: [
      "装备优先 Nidalee，其次 Morgana 的 Morellonomicon 与前排装，剩余 AP 再给 Morgana。",
      "Kog'Maw 提供免费的 Sunder / Shred。",
      "Nidalee 在高血量状态下可考虑 Phoenix Primal；血量压力大时优先 Execute Primal。",
      "前排不要只锁 4 Vanguard，也可以根据来牌切 Brawler 或 Juggernaut。",
    ],
    stages: [
      { stage: "Stage 2", text: "用任意强 Rageblade/AP 开局，例如 Kayle、Master Yi 或 Spellweaver，过渡非常灵活。" },
      { stage: "Stage 3", text: "阵容非常需要 Rod，强化和选秀有机会就补；不走 Invoker 时可先留 Pebbles 等低费连接牌。" },
      { stage: "Stage 4", text: "升 8 搜 4 Invoker 框架；根据前排质量在 Vanguard、Brawler、Juggernaut 间灵活切换。" },
    ],
    source: "TFT Academy",
    sourceUrl: "https://tftacademy.com/tierlist/comps/set-18-adaptor-nidalee",
  },
  {
    id: "yi-rengar",
    name: "Yi Rengar",
    nameZh: "易 / 雷恩加尔追三",
    tier: "A",
    patch: metaPatch,
    playstyle: "3-Cost Reroll",
    difficulty: "MEDIUM",
    coreUnits: ["Master Yi", "Rengar", "Nidalee"],
    flexUnits: ["Vi", "Krug", "Kog'Maw"],
    itemFocus: ["Master Yi / Rengar", "Tank", "Nidalee"],
    traits: ["Adaptor", "Primal", "Blossom"],
    whenToPlay: "前期较早拿到 Rengar / Master Yi 与适配装备，且经济允许 7 级慢搜三费追三时。",
    keyNotes: [
      "Yi 与 Rengar 的核心装备需求几乎相同；优先给先升级的那个，Yi 通常上限更高。",
      "有合适 Artifact 时整体强度会明显提升。",
      "Vi 3 通常强于 Krug 3，但 Vi 热门时更难追。",
      "Primal 选择同样遵循：领先可 Phoenix，否则偏 Execute / Healing。",
    ],
    stages: [
      { stage: "Stage 2", text: "理想是 Rengar 开局并能连胜；Blossom 能帮助获得经济或装备 Wisp。" },
      { stage: "Stage 3", text: "逐步补 Adaptor 与前排，Stage 3 结束前尽量完成 Yi / Rengar 的主装备。" },
      { stage: "Stage 4", text: "7 级搜 Yi 2、Rengar 2 与 Juggernaut 坦克，随后回经济慢搜三星；8 级补 Kog'Maw 或其他高质量单位。" },
    ],
    source: "TFT Academy",
    sourceUrl: "https://tftacademy.com/tierlist/comps/set-18-adaptor-reroll-copy",
  },
  {
    id: "adaptor-reroll",
    name: "Adaptor Reroll",
    nameZh: "Adaptor 易大师追三",
    tier: "A",
    patch: metaPatch,
    playstyle: "3-Cost Reroll",
    difficulty: "MEDIUM",
    coreUnits: ["Master Yi", "Kog'Maw", "Nidalee"],
    flexUnits: ["Vi", "Krug", "Gromp"],
    itemFocus: ["Master Yi", "Tank", "Kog'Maw", "Nidalee"],
    traits: ["Adaptor", "Primal", "Blossom"],
    whenToPlay: "Master Yi 来得早、装备适合持续输出，并有经济在 7 级慢搜三费时。",
    keyNotes: [
      "装备优先 Yi > 坦克 > Kog'Maw > Nidalee。",
      "有 Artifact 或 Brawler 徽章时强度能再提升一个档次。",
      "Vi 3 更强但更容易被同行卡；Krug 是更现实的替代前排。",
      "7 级先成型，不需要强行塞 Gromp；8 级再补 Gromp 或其他 flex。",
    ],
    stages: [
      { stage: "Stage 2", text: "围绕早期 Master Yi 打强势过渡；Blossom 同样可帮助经济与装备。" },
      { stage: "Stage 3", text: "增加 Adaptors 和前排，Stage 3 结束前优先把 Yi 装备做完整。" },
      { stage: "Stage 4", text: "7 级搜 Yi 2、Kog'Maw 2 与 Juggernaut 坦克，之后存钱慢搜三星；8 级再补 Gromp/flex。" },
    ],
    source: "TFT Academy",
    sourceUrl: "https://tftacademy.com/tierlist/comps/set-18-adaptor-reroll",
  },
  {
    id: "lunarwood-khazix",
    name: "Lunarwood Kha'Zix",
    nameZh: "Lunarwood 卡兹克追三",
    tier: "ACTIVE",
    patch: metaPatch,
    playstyle: "3-Cost Reroll",
    difficulty: "MEDIUM",
    coreUnits: ["Kha'Zix", "Rengar"],
    flexUnits: ["Lux", "Ivern", "Alune", "Diana"],
    itemFocus: ["Kha'Zix", "Rengar Rageblade", "Tank", "Leftover AP on Diana"],
    traits: ["Lunar", "Rival", "Executioner"],
    whenToPlay: "必须是较早的 Kha'Zix + 合适装备，能依靠 Rival 滚雪球时；不建议无条件硬玩。",
    keyNotes: [
      "Kha'Zix 理想击杀成长顺序：Ravager > Executioner > Rapidfire > Spellweaver。",
      "Alune 前可用第 3 Executioner、Lux、Ivern 或其他 Executioner 过渡。",
      "这套更依赖早期 Kha'Zix 和装备优势，不满足条件时不要强行转。",
      "剩余 AP 装可以交给 Diana。",
    ],
    stages: [
      { stage: "Stage 2", text: "只有早 Kha'Zix + 装备时才玩；用升级前排拖时间，让 Rengar 的 Rageblade 有叠层空间。" },
      { stage: "Stage 3", text: "6 级若关键对子很多可以小搜提质量，否则优先攒经济上 7。" },
      { stage: "Stage 4", text: "7 级慢搜你要追的三费三星；根据来牌决定 Executioner/Lux/Ivern 等 flex。" },
    ],
    source: "TFT Academy",
    sourceUrl: "https://tftacademy.com/tierlist/comps/set-18-lunarwood-khazix",
  },
  {
    id: "aphelios-nidalee",
    name: "Aphelios Nidalee",
    nameZh: "厄斐琉斯 / 奈德丽",
    tier: "ACTIVE",
    patch: metaPatch,
    playstyle: "4-Cost Fast 8",
    difficulty: "MEDIUM",
    coreUnits: ["Aphelios", "Nidalee", "Kog'Maw"],
    flexUnits: ["Amumu", "Hecarim", "Mama Beak"],
    itemFocus: ["Red Buff on Aphelios", "Rageblade alternative", "Tank"],
    traits: ["Rapidfire", "Primal"],
    whenToPlay: "前期有强 Rapidfire AD 节奏，能积极合成装备保持血量，并准备 8 级大搜四费时。",
    keyNotes: [
      "Red Buff 是 Aphelios 的高优先装备，也可以走 Rageblade 构筑。",
      "升级后的 Amumu + Hecarim 可以替代低质量的一星 Riftbeast 前排。",
      "Kog'Maw 提供免费的 Shred + Sunder。",
      "这套不需要为了完美神装牺牲节奏，能保连胜的装备可以积极合。",
    ],
    stages: [
      { stage: "Stage 2", text: "围绕 Rapidfire 的强 AD 开局打连胜；不要过度等神装，优先合成能提升即时战力的装备。" },
      { stage: "Stage 3", text: "阵容吃多种装备；装备不足时强化可以补装备，Riftbeast 在线时 Mama Beak 也能承担输出。" },
      { stage: "Stage 4", text: "8 级重搜 Aphelios 与四费核心；多数四费两星后再考虑上 9。" },
    ],
    source: "TFT Academy",
    sourceUrl: "https://tftacademy.com/tierlist/comps/set-18-aphelios-nidalee",
  },
];
