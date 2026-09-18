import type { UnifiedMetaComp } from "@/data/meta";
import type { CatalogEntry } from "@/data/tft";

export type LocalizedOpeningSignal = { zh: string; en: string };

export type OpeningRuleContext = {
  selectedChampions: Array<{ champion: CatalogEntry; count: number }>;
  componentCounts: Map<string, number>;
  craftableItems: CatalogEntry[];
};

export type OpeningRuleResult = {
  score: number;
  reasons: LocalizedOpeningSignal[];
  cautions: LocalizedOpeningSignal[];
};

export const REVIEWED_OPENING_RULE_IDS = [
  "tuding-182-dragon-fast9",
  "tuding-182-draven-fast9",
  "tuding-182-nidalee-aphelios",
  "tuding-182-thorn-soraka",
  "tuding-182-rift-blue",
  "tuding-182-invoker-ahri",
  "tuding-182-baby-akali",
  "tuding-182-primal-double-carry",
  "tuding-182-primal-lotus",
  "tuding-182-brawler-yi",
  "tuding-182-eclipse-reroll",
  "tuding-182-overlord-caitlyn",
  "tuding-182-fae-veigar",
  "tuding-182-vanguard-aphelios",
  "tuding-182b-juggernaut-zyra",
  "tuding-182b-ashe-fast9",
  "tuding-182b-executioner-zyra",
  "tuding-182b-swiftshot-aphelios",
  "tuding-182b-juggernaut-sivir",
  "tuding-182b-sivir-nidalee-flex",
  "tuding-182b-faerie-rengar-tristana",
  "tuding-182b-eclipse-yunara",
] as const;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function championAliases(champion: CatalogEntry) {
  return [champion.id, champion.nameEn, champion.nameZh, ...(champion.aliases ?? [])].filter(Boolean).map(normalize);
}

function unitCopies(context: OpeningRuleContext, ...names: string[]) {
  const wanted = new Set(names.map(normalize));
  return context.selectedChampions.reduce((sum, entry) => championAliases(entry.champion).some((alias) => wanted.has(alias)) ? sum + entry.count : sum, 0);
}

function componentCopies(context: OpeningRuleContext, ...names: string[]) {
  return names.reduce((sum, name) => sum + (context.componentCounts.get(normalize(name)) ?? 0), 0);
}

function hasCraftable(context: OpeningRuleContext, ...names: string[]) {
  const wanted = new Set(names.map(normalize));
  return context.craftableItems.some((item) => [item.id, item.nameEn, item.nameZh, ...(item.aliases ?? [])].filter(Boolean).map(normalize).some((alias) => wanted.has(alias)));
}

function lowCostPairCount(context: OpeningRuleContext) {
  return context.selectedChampions.filter((entry) => (entry.champion.tier ?? 9) <= 3 && entry.count >= 2).length;
}

function lowCostCopyCount(context: OpeningRuleContext) {
  return context.selectedChampions.filter((entry) => (entry.champion.tier ?? 9) <= 3).reduce((sum, entry) => sum + entry.count, 0);
}

function adComponentCount(context: OpeningRuleContext) {
  return componentCopies(context, "B.F. Sword", "Recurve Bow", "Sparring Gloves");
}

function apComponentCount(context: OpeningRuleContext) {
  return componentCopies(context, "Needlessly Large Rod", "Tear of the Goddess");
}

export function scoreSourceOpeningRule(comp: Pick<UnifiedMetaComp, "id">, context: OpeningRuleContext): OpeningRuleResult {
  let score = 0;
  const reasons: LocalizedOpeningSignal[] = [];
  const cautions: LocalizedOpeningSignal[] = [];
  const add = (value: number, zh: string, en: string) => {
    score += value;
    reasons.push({ zh, en });
  };
  const warn = (zh: string, en: string) => cautions.push({ zh, en });
  const pairs = lowCostPairCount(context);
  const lowCopies = lowCostCopyCount(context);

  switch (comp.id) {
    case "tuding-182b-juggernaut-zyra": {
      if (unitCopies(context, "婕拉") > 0) add(8, "已拿到婕拉，命中目标主C。", "The target carry is already available.");
      warn("法系装备开局，主宰召唤或莲华过渡，能在8级稳血后继续上9。 开局助手不读取实时经济或强化选择。", "Check the source opening conditions; live economy and augments are not read by this assistant.");
      break;
    }
    case "tuding-182b-ashe-fast9": {
      if (unitCopies(context, "艾希") > 0) add(8, "已拿到艾希，命中目标主C。", "The target carry is already available.");
      warn("彩色经济或高质量连胜，有足够血量和经济上9时。 开局助手不读取实时经济或强化选择。", "Check the source opening conditions; live economy and augments are not read by this assistant.");
      break;
    }
    case "tuding-182b-executioner-zyra": {
      if (unitCopies(context, "婕拉") > 0) add(8, "已拿到婕拉，命中目标主C。", "The target carry is already available.");
      warn("有裁决转或合适强化更佳，法系装备配前排质量。 开局助手不读取实时经济或强化选择。", "Check the source opening conditions; live economy and augments are not read by this assistant.");
      break;
    }
    case "tuding-182b-swiftshot-aphelios": {
      if (unitCopies(context, "厄斐琉斯") > 0) add(8, "已拿到厄斐琉斯，命中目标主C。", "The target carry is already available.");
      warn("有迅捷转、雪莲转或对应特殊条件时考虑。 开局助手不读取实时经济或强化选择。", "Check the source opening conditions; live economy and augments are not read by this assistant.");
      break;
    }
    case "tuding-182b-juggernaut-sivir": {
      if (unitCopies(context, "希维尔") > 0) add(8, "已拿到希维尔，命中目标主C。", "The target carry is already available.");
      warn("物理装备合适、希维尔来牌多，或正好白嫖艾希。 开局助手不读取实时经济或强化选择。", "Check the source opening conditions; live economy and augments are not read by this assistant.");
      break;
    }
    case "tuding-182b-sivir-nidalee-flex": {
      if (unitCopies(context, "奈德丽") > 0) add(8, "已拿到奈德丽，命中目标主C。", "The target carry is already available.");
      warn("战士装备起手能连胜，豹女和前排质量较好时。 开局助手不读取实时经济或强化选择。", "Check the source opening conditions; live economy and augments are not read by this assistant.");
      break;
    }
    case "tuding-182b-faerie-rengar-tristana": {
      if (unitCopies(context, "雷恩加尔") > 0) add(8, "已拿到雷恩加尔，命中目标主C。", "The target carry is already available.");
      warn("开局有仙灵转或狮子狗来牌好，装备适合物理战士。 开局助手不读取实时经济或强化选择。", "Check the source opening conditions; live economy and augments are not read by this assistant.");
      break;
    }
    case "tuding-182b-eclipse-yunara": {
      if (unitCopies(context, "芸阿娜") > 0) add(8, "已拿到芸阿娜，命中目标主C。", "The target carry is already available.");
      warn("开局至少两张芸阿娜、装备契合，并有合适强化时考虑。 开局助手不读取实时经济或强化选择。", "Check the source opening conditions; live economy and augments are not read by this assistant.");
      break;
    }

    case "tuding-182-dragon-fast9": {
      if (unitCopies(context, "Elder Dragon", "远古巨龙") > 0) add(12, "已直接拿到远古巨龙，和最终主C完全一致。", "You already have Elder Dragon, the final primary carry.");
      warn("这套更依赖连胜、血量和经济质量；开局助手不会读取这些实时状态。", "This line depends heavily on streak, HP and economy quality, which Opening Assistant does not read live.");
      break;
    }
    case "tuding-182-draven-fast9": {
      if (hasCraftable(context, "Guinsoo's Rageblade")) add(10, "当前散件能直接合羊刀，命中德子九五最关键的开局条件。", "Your components can make Guinsoo's Rageblade, the clearest Draven Fast 9 opening signal.");
      else if (componentCopies(context, "Recurve Bow") > 0) add(4, "已有反曲弓，接近德莱文羊刀启动条件。", "You already have a Recurve Bow, moving toward Draven's Rageblade setup.");
      warn("最终仍要求前中期能稳住连胜与经济后冲9。", "The final condition is still enough early strength and economy to reach level 9.");
      break;
    }
    case "tuding-182-nidalee-aphelios": {
      const nidalee = unitCopies(context, "Nidalee", "奈德丽");
      if (nidalee) add(nidalee >= 2 ? 11 : 8, nidalee >= 2 ? "豹女已有对子，明显符合这套8级启动阵容。" : "开局已拿到豹女，直接命中主C。", nidalee >= 2 ? "Nidalee pair strongly fits this level-8 line." : "Nidalee is already present, directly hitting the primary carry.");
      if (unitCopies(context, "Aphelios", "厄斐琉斯") > 0) add(4, "已经拿到月男，副C条件同步命中。", "Aphelios is already present, hitting the secondary carry too.");
      if (adComponentCount(context) >= 2) add(5, "AD散件数量适合优先做豹女装备。", "Your AD component count supports prioritizing Nidalee items.");
      break;
    }
    case "tuding-182-thorn-soraka": {
      if (unitCopies(context, "Soraka", "索拉卡") > 0) add(8, "已拿到索拉卡，直接命中主C。", "Soraka is already present, directly hitting the primary carry.");
      if (unitCopies(context, "Zyra", "婕拉") > 0) add(5, "婕拉已到手，副C框架提前成形。", "Zyra is already present, giving the secondary damage line a head start.");
      if (unitCopies(context, "Malphite", "墨菲特") > 0) add(3, "墨菲特已到手，主坦框架更顺。", "Malphite is already present, improving the main-tank setup.");
      if (apComponentCount(context) >= 2) add(4, "法系散件数量适合索拉卡/婕拉双法系输出。", "Your AP component count fits Soraka/Zyra spell damage itemization.");
      break;
    }
    case "tuding-182-rift-blue": {
      const blue = unitCopies(context, "Pebbles", "苍蓝哨戒", "小蓝");
      if (blue) add(blue >= 2 ? 14 : 10, blue >= 2 ? "小蓝已有对子，是这套5人口慢D最强的直接信号。" : "已拿到小蓝，直接命中追三核心。", blue >= 2 ? "A Pebbles pair is the strongest direct signal for this level-5 reroll line." : "Pebbles is already present, directly hitting the 3-star reroll core.");
      if (pairs >= 2) add(4, "低费对子较多，符合慢D追三星环境。", "Multiple low-cost pairs support a slow-roll environment.");
      break;
    }
    case "tuding-182-invoker-ahri": {
      if (unitCopies(context, "Ahri", "阿狸") > 0) add(9, "已拿到阿狸，直接命中主C。", "Ahri is already present, directly hitting the primary carry.");
      if (unitCopies(context, "Morgana", "莫甘娜") > 0) add(5, "莫甘娜已到手，多C框架更容易展开。", "Morgana is already present, helping the multi-carry setup come online.");
      if (apComponentCount(context) >= 3) add(4, "法系散件较充足，符合这套多C吃装备的特点。", "You have enough AP components for this item-hungry multi-carry line.");
      else warn("神谕阿狸是多C阵容，装备量不足时要谨慎。", "Invoker Ahri is a multi-carry comp and is weaker when item volume is low.");
      break;
    }
    case "tuding-182-baby-akali": {
      if (unitCopies(context, "Akali", "阿卡丽") > 0) add(8, "阿卡丽已到手，命中这套多三星核心。", "Akali is already present, hitting the multi-3-star core.");
      if (pairs >= 2) add(6, "低费对子很多，符合多张一起追三星的条件。", "You have several low-cost pairs, fitting a multi-unit 3-star reroll line.");
      if (lowCopies >= 6) add(4, "低费来牌密度高，继续停低人口D牌更有价值。", "High low-cost unit density makes staying low level to reroll more valuable.");
      break;
    }
    case "tuding-182-primal-double-carry": {
      if (unitCopies(context, "Nidalee", "奈德丽") > 0) add(7, "已拿到豹女，命中双C之一。", "Nidalee is already present, hitting one of the two carries.");
      if (unitCopies(context, "Sivir", "希维尔") > 0) add(7, "已拿到希维尔，命中双C之一。", "Sivir is already present, hitting one of the two carries.");
      if (adComponentCount(context) >= 3) add(4, "AD散件充足，能同时支撑豹女和希维尔。", "Your AD components can support both Nidalee and Sivir.");
      break;
    }
    case "tuding-182-primal-lotus": {
      if (unitCopies(context, "Ahri", "阿狸") > 0) add(9, "阿狸已到手，直接命中主C。", "Ahri is already present, directly hitting the primary carry.");
      if (unitCopies(context, "Sett", "瑟提") > 0) add(5, "瑟提已到手，8级前排框架更顺。", "Sett is already present, making the level-8 frontline easier to assemble.");
      if (apComponentCount(context) >= 2) add(4, "法系散件符合阿狸主C装备方向。", "Your AP components fit Ahri's primary-carry item direction.");
      break;
    }
    case "tuding-182-brawler-yi": {
      if (unitCopies(context, "Master Yi", "易") > 0) add(11, "剑圣已到手，直接命中7级追三主C。", "Master Yi is already present, directly hitting the level-7 reroll carry.");
      if (unitCopies(context, "Krug", "远古石甲虫", "石甲虫") > 0) add(4, "石甲虫已到手，前排与追三目标同步命中。", "Krug is already present, hitting an important frontline/reroll piece.");
      warn("这套真正的高优先级条件是斗士转职；当前开局助手暂不录强化。", "The strongest condition is a Brawler emblem; Opening Assistant does not currently record augments/emblems.");
      break;
    }
    case "tuding-182-eclipse-reroll": {
      if (unitCopies(context, "Kayle", "凯尔") > 0) add(8, "凯尔已到手，命中日蚀低费核心。", "Kayle is already present, hitting the low-cost Eclipse core.");
      if (pairs >= 2) add(6, "低费对子数量适合多三星慢D。", "Multiple low-cost pairs fit the multi-3-star slow-roll plan.");
      if (componentCopies(context, "Recurve Bow") > 0) add(4, "已有反曲弓，符合凯尔体系常见启动装备。", "You already have a Recurve Bow, fitting the common Kayle setup.");
      break;
    }
    case "tuding-182-overlord-caitlyn": {
      if (unitCopies(context, "Caitlyn", "凯特琳") > 0) add(9, "女警已到手，直接命中三星主C。", "Caitlyn is already present, directly hitting the 3-star carry.");
      if (componentCopies(context, "Recurve Bow") > 0) add(4, "反曲弓较早到手，符合这套开局装备方向。", "An early Recurve Bow fits this line's opening item direction.");
      if (pairs >= 2) add(4, "低费对子较多，收菜后转追三更顺。", "Several low-cost pairs make the post-cashout reroll transition smoother.");
      warn("魔女层数/连败收菜属于对局条件，开局助手不会自动读取。", "Witch stacks and loss-streak cashout are game-state conditions that Opening Assistant does not read automatically.");
      break;
    }
    case "tuding-182-fae-veigar": {
      const veigar = unitCopies(context, "Veigar", "维迦");
      if (veigar) add(veigar >= 2 ? 15 : 11, veigar >= 2 ? "小法已有对子，是5人口慢D的强信号。" : "已拿到小法，直接命中追三主C。", veigar >= 2 ? "A Veigar pair is a strong signal for the level-5 slow-roll line." : "Veigar is already present, directly hitting the 3-star carry.");
      if (apComponentCount(context) >= 2) add(4, "法系散件适合优先完成小法装备。", "Your AP components fit prioritizing Veigar's items.");
      if (pairs >= 2) add(3, "额外低费对子能提高同步追三收益。", "Extra low-cost pairs improve the value of rerolling multiple units together.");
      break;
    }
    case "tuding-182-vanguard-aphelios": {
      if (unitCopies(context, "Aphelios", "厄斐琉斯") > 0) add(11, "月男已到手，直接命中主C。", "Aphelios is already present, directly hitting the primary carry.");
      if (unitCopies(context, "Blue Sentinel", "苍蓝雕纹魔像", "蓝霸符") > 0) add(4, "蓝BUFF野怪体系单位已到手，前排/体系更顺。", "A Blue Sentinel setup piece is already present, improving the frontline/synergy path.");
      if (adComponentCount(context) >= 3) add(4, "AD散件数量适合月男持续输出装备。", "Your AD component count supports Aphelios sustained-damage itemization.");
      break;
    }
  }

  return { score: Math.max(0, Math.min(18, score)), reasons, cautions };
}
