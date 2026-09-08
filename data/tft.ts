export type EntryType = "英雄" | "装备" | "羁绊" | "强化";

export type CatalogEntry = {
  id: string;
  type: EntryType;
  nameZh: string;
  nameEn: string;
  imageUrl?: string;
  tier?: number;
  subtype?: "component" | "completed";
  aliases?: string[];
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
] as const;

export const itemLegacyAliases: Record<string, string[]> = {
  "Kraken's Fury": ["Runaan's Hurricane", "卢安娜的飓风"],
  "Spirit Visage": ["Redemption", "救赎"],
  "Striker's Flail": ["Guardbreaker", "破防者"],
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
  { a: "Recurve Bow", b: "Tear of the Goddess", result: "Statikk Shiv" },
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
];

export const standardItemNames = Array.from(
  new Set([...componentNames, ...recipes.map((recipe) => recipe.result)]),
);

export const fallbackEntries: CatalogEntry[] = [
  { id: "fallback-shojin", type: "装备", nameZh: "朔极之矛", nameEn: "Spear of Shojin", subtype: "completed" },
  { id: "fallback-rageblade", type: "装备", nameZh: "鬼索的狂暴之刃", nameEn: "Guinsoo's Rageblade", subtype: "completed" },
  { id: "fallback-ie", type: "装备", nameZh: "无尽之刃", nameEn: "Infinity Edge", subtype: "completed" },
];
