export type ChampionStats = {
  hp?: number;
  mana?: number;
  initialMana?: number;
  armor?: number;
  magicResist?: number;
  damage?: number;
  attackSpeed?: number;
  critChance?: number;
  range?: number;
};

export type ChampionDetail = {
  id: string;
  name: string;
  cost: number;
  traits: string[];
  abilityName?: string;
  abilityDesc?: string;
  abilityIconUrl?: string;
  stats?: ChampionStats;
};

export type ChampionDetailsPayload = {
  source: string;
  locale: "zh" | "en";
  set: number;
  updated: string;
  champions: ChampionDetail[];
};
