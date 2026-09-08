export type EntryType = "英雄" | "装备" | "羁绊" | "强化";

export type ItemSubtype = "component" | "completed" | "artifact" | "emblem" | "tactician";

export type CatalogEntry = {
  id: string;
  type: EntryType;
  nameZh: string;
  nameEn: string;
  imageUrl?: string;
  tier?: number;
  subtype?: ItemSubtype;
  aliases?: string[];
  descriptionZh?: string;
  descriptionEn?: string;
};

export type Recipe = {
  a: string;
  b: string;
  result: string;
};

export type TftCatalogPayload = {
  source: string;
  dataDragonVersion: string;
  tftPatch: string;
  set: string;
  updated: string;
  champions: CatalogEntry[];
  items: CatalogEntry[];
  traits: CatalogEntry[];
  augments: CatalogEntry[];
  components: CatalogEntry[];
  recipes: Recipe[];
};

export const patchInfo = {
  set: "Set 18 · Enchanted Wilds",
  patch: "18.1",
  updated: "2026-09-08",
};

export const componentNames = [
  "B.F. Sword",
  "Recurve Bow",
  "Needlessly Large Rod",
  "Tear of the Goddess",
  "Chain Vest",
  "Negatron Cloak",
  "Giant's Belt",
  "Sparring Gloves",
  "Spatula",
  "Frying Pan",
] as const;

export const set18EmblemNames = [
  "Fae Emblem",
  "Inferno Emblem",
  "Blossom Emblem",
  "Lunar Emblem",
  "Elderwood Emblem",
  "Sprykin Emblem",
  "Blackthorn Emblem",
  "Primal Emblem",
  "Hunter Emblem",
  "Rapidfire Emblem",
  "Spellweaver Emblem",
  "Invoker Emblem",
  "Vanguard Emblem",
  "Ravager Emblem",
  "Brawler Emblem",
  "Executioner Emblem",
] as const;

export const tacticianItemNames = [
  "Tactician's Crown",
  "Tactician's Cape",
  "Tactician's Shield",
] as const;

export const itemLegacyAliases: Record<string, string[]> = {
  "Kraken's Fury": ["Runaan's Hurricane", "卢安娜的飓风"],
  "Spirit Visage": ["Redemption", "救赎"],
  "Striker's Flail": ["Guardbreaker", "破防者"],
  "Tactician's Crown": ["Tacticians Crown"],
  "Tactician's Shield": ["Tacticians Shield"],
};

export const recipes: Recipe[] = [
  { a: "B.F. Sword", b: "B.F. Sword", result: "Deathblade" },
  { a: "B.F. Sword", b: "Recurve Bow", result: "Giant Slayer" },
  { a: "B.F. Sword", b: "Needlessly Large Rod", result: "Hextech Gunblade" },
  { a: "B.F. Sword", b: "Tear of the Goddess", result: "Spear of Shojin" },
  { a: "B.F. Sword", b: "Chain Vest", result: "Edge of Night" },
  { a: "B.F. Sword", b: "Negatron Cloak", result: "Bloodthirster" },
  { a: "B.F. Sword", b: "Giant's Belt", result: "Sterak's Gage" },
  { a: "B.F. Sword", b: "Sparring Gloves", result: "Infinity Edge" },
  { a: "Recurve Bow", b: "Recurve Bow", result: "Red Buff" },
  { a: "Recurve Bow", b: "Needlessly Large Rod", result: "Guinsoo's Rageblade" },
  { a: "Recurve Bow", b: "Tear of the Goddess", result: "Void Staff" },
  { a: "Recurve Bow", b: "Chain Vest", result: "Titan's Resolve" },
  { a: "Recurve Bow", b: "Negatron Cloak", result: "Kraken's Fury" },
  { a: "Recurve Bow", b: "Giant's Belt", result: "Nashor's Tooth" },
  { a: "Recurve Bow", b: "Sparring Gloves", result: "Last Whisper" },
  { a: "Needlessly Large Rod", b: "Needlessly Large Rod", result: "Rabadon's Deathcap" },
  { a: "Needlessly Large Rod", b: "Tear of the Goddess", result: "Archangel's Staff" },
  { a: "Needlessly Large Rod", b: "Chain Vest", result: "Crownguard" },
  { a: "Needlessly Large Rod", b: "Negatron Cloak", result: "Ionic Spark" },
  { a: "Needlessly Large Rod", b: "Giant's Belt", result: "Morellonomicon" },
  { a: "Needlessly Large Rod", b: "Sparring Gloves", result: "Jeweled Gauntlet" },
  { a: "Tear of the Goddess", b: "Tear of the Goddess", result: "Blue Buff" },
  { a: "Tear of the Goddess", b: "Chain Vest", result: "Protector's Vow" },
  { a: "Tear of the Goddess", b: "Negatron Cloak", result: "Adaptive Helm" },
  { a: "Tear of the Goddess", b: "Giant's Belt", result: "Spirit Visage" },
  { a: "Tear of the Goddess", b: "Sparring Gloves", result: "Hand of Justice" },
  { a: "Chain Vest", b: "Chain Vest", result: "Bramble Vest" },
  { a: "Chain Vest", b: "Negatron Cloak", result: "Gargoyle Stoneplate" },
  { a: "Chain Vest", b: "Giant's Belt", result: "Sunfire Cape" },
  { a: "Chain Vest", b: "Sparring Gloves", result: "Steadfast Heart" },
  { a: "Negatron Cloak", b: "Negatron Cloak", result: "Dragon's Claw" },
  { a: "Negatron Cloak", b: "Giant's Belt", result: "Evenshroud" },
  { a: "Negatron Cloak", b: "Sparring Gloves", result: "Quicksilver" },
  { a: "Giant's Belt", b: "Giant's Belt", result: "Warmog's Armor" },
  { a: "Giant's Belt", b: "Sparring Gloves", result: "Striker's Flail" },
  { a: "Sparring Gloves", b: "Sparring Gloves", result: "Thief's Gloves" },

  // Set 18 craftable Spatula emblems.
  { a: "Spatula", b: "B.F. Sword", result: "Fae Emblem" },
  { a: "Spatula", b: "Recurve Bow", result: "Inferno Emblem" },
  { a: "Spatula", b: "Needlessly Large Rod", result: "Blossom Emblem" },
  { a: "Spatula", b: "Tear of the Goddess", result: "Lunar Emblem" },
  { a: "Spatula", b: "Chain Vest", result: "Elderwood Emblem" },
  { a: "Spatula", b: "Negatron Cloak", result: "Sprykin Emblem" },
  { a: "Spatula", b: "Giant's Belt", result: "Blackthorn Emblem" },
  { a: "Spatula", b: "Sparring Gloves", result: "Primal Emblem" },

  // Set 18 craftable Frying Pan emblems.
  { a: "Frying Pan", b: "B.F. Sword", result: "Hunter Emblem" },
  { a: "Frying Pan", b: "Recurve Bow", result: "Rapidfire Emblem" },
  { a: "Frying Pan", b: "Needlessly Large Rod", result: "Spellweaver Emblem" },
  { a: "Frying Pan", b: "Tear of the Goddess", result: "Invoker Emblem" },
  { a: "Frying Pan", b: "Chain Vest", result: "Vanguard Emblem" },
  { a: "Frying Pan", b: "Negatron Cloak", result: "Ravager Emblem" },
  { a: "Frying Pan", b: "Giant's Belt", result: "Brawler Emblem" },
  { a: "Frying Pan", b: "Sparring Gloves", result: "Executioner Emblem" },

  // Team-size items.
  { a: "Spatula", b: "Spatula", result: "Tactician's Crown" },
  { a: "Spatula", b: "Frying Pan", result: "Tactician's Cape" },
  { a: "Frying Pan", b: "Frying Pan", result: "Tactician's Shield" },
];

export const standardItemNames = Array.from(
  new Set([...componentNames, ...recipes.map((recipe) => recipe.result)]),
);

export const fallbackEntries: CatalogEntry[] = [
  { id: "fallback-shojin", type: "装备", nameZh: "朔极之矛", nameEn: "Spear of Shojin", subtype: "completed" },
  { id: "fallback-rageblade", type: "装备", nameZh: "鬼索的狂暴之刃", nameEn: "Guinsoo's Rageblade", subtype: "completed" },
  { id: "fallback-ie", type: "装备", nameZh: "无尽之刃", nameEn: "Infinity Edge", subtype: "completed" },
];
