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

export type AbilityScale =
  | "AD"
  | "AP"
  | "AS"
  | "Armor"
  | "MR"
  | "Health"
  | "Crit"
  | "CritDamage"
  | "DamageAmp"
  | "DamageReduction"
  | "Omnivamp"
  | "None";

export type AbilityTermKind = "damage" | "shield" | "heal" | "utility";
export type AbilityDamageType = "physical" | "magic" | "true" | "unknown";

export type ChampionAbilityTerm = {
  key: string;
  label: string;
  values: number[];
  scale: AbilityScale;
  kind: AbilityTermKind;
  damageType?: AbilityDamageType;
};

export type ChampionDetail = {
  id: string;
  name: string;
  cost: number;
  traits: string[];
  abilityName?: string;
  abilityDesc?: string;
  abilityIconUrl?: string;
  abilityTerms?: ChampionAbilityTerm[];
  stats?: ChampionStats;
};

export type ChampionDetailsPayload = {
  source: string;
  locale: "zh" | "en";
  set: number;
  updated: string;
  champions: ChampionDetail[];
};
