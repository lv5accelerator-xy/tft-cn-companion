export type ItemStatBonuses = {
  attackDamagePct: number;
  abilityPower: number;
  attackSpeedPct: number;
  armor: number;
  magicResist: number;
  health: number;
  maxHealthPct: number;
  mana: number;
  maxManaDelta: number;
  critChancePct: number;
  range: number;
  damageAmpPct: number;
  durabilityPct: number;
  omnivampPct: number;
};

export type ItemEffectRecord = {
  id: string;
  name: string;
  bonuses: ItemStatBonuses;
  rawEffects: Record<string, number>;
};

export type ItemEffectsPayload = {
  source: string;
  updated: string;
  items: ItemEffectRecord[];
};

export type StarLevel = 1 | 2 | 3;

export type ComputedChampionStats = {
  health?: number;
  attackDamage?: number;
  attackSpeed?: number;
  dps?: number;
  abilityPower: number;
  armor?: number;
  magicResist?: number;
  initialMana?: number;
  maxMana?: number;
  critChance?: number;
  range?: number;
  damageAmpPct: number;
  durabilityPct: number;
  omnivampPct: number;
};

export const EMPTY_ITEM_BONUSES: ItemStatBonuses = {
  attackDamagePct: 0,
  abilityPower: 0,
  attackSpeedPct: 0,
  armor: 0,
  magicResist: 0,
  health: 0,
  maxHealthPct: 0,
  mana: 0,
  maxManaDelta: 0,
  critChancePct: 0,
  range: 0,
  damageAmpPct: 0,
  durabilityPct: 0,
  omnivampPct: 0,
};
