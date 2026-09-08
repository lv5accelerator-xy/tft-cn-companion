export type MetaSourceId = "tuding" | "shenchao" | "lindo" | "tft-academy";

export type MetaSource = {
  id: MetaSourceId;
  name: string;
  channel: "WeChat" | "Web";
  description: string;
  feedEnv?: string;
  priority: number;
  game: "TFT";
};

export const metaSources: MetaSource[] = [
  {
    id: "tuding",
    name: "兔顶之弈",
    channel: "WeChat",
    description: "公众号阵容一图流、阵容码、站位与运营攻略。",
    feedEnv: "TUDING_FEED_URL",
    priority: 1,
    game: "TFT",
  },
  {
    id: "shenchao",
    name: "神超不做人",
    channel: "WeChat",
    description: "神超阵容教学、装备选择、强化与站位内容。",
    feedEnv: "SHENCHAO_FEED_URL",
    priority: 2,
    game: "TFT",
  },
  {
    id: "lindo",
    name: "林小北Lindo",
    channel: "WeChat",
    description: "林小北Lindo 的云顶阵容、运营与版本理解内容。",
    feedEnv: "LINDO_FEED_URL",
    priority: 3,
    game: "TFT",
  },
  {
    id: "tft-academy",
    name: "TFT Academy",
    channel: "Web",
    description: "英文 Meta 阵容与运营参考，作为国际服补充来源。",
    priority: 4,
    game: "TFT",
  },
];

export const tftOnlyPolicy = {
  game: "Teamfight Tactics",
  allowSignals: ["TFT", "Teamfight Tactics", "云顶之弈", "云顶", "TFTSet18", "Set 18", "S18"],
  blockedSignals: ["金铲铲", "金铲铲之战"],
} as const;

export function isBlockedGoldenSpatulaText(value: string) {
  return tftOnlyPolicy.blockedSignals.some((keyword) => value.includes(keyword));
}

export function getMetaSource(id: MetaSourceId) {
  return metaSources.find((source) => source.id === id);
}
