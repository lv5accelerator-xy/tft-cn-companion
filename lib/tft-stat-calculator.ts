import type { ChampionStats } from "@/data/champion-details";
import {
  EMPTY_ITEM_BONUSES,
  type ComputedChampionStats,
  type ItemStatBonuses,
  type StarLevel,
} from "@/data/stat-simulator";

export const STAR_SCALING: Record<StarLevel, { health: number; attackDamage: number }> = {
  1: { health: 1, attackDamage: 1 },
  2: { health: 1.8, attackDamage: 1.5 },
  3: { health: 3.24, attackDamage: 2.25 },
};

export function mergeItemBonuses(bonuses: Array<ItemStatBonuses | null | undefined>): ItemStatBonuses {
  const merged = { ...EMPTY_ITEM_BONUSES };
  for (const bonus of bonuses) {
    if (!bonus) continue;
    merged.attackDamagePct += bonus.attackDamagePct;
    merged.abilityPower += bonus.abilityPower;
    merged.attackSpeedPct += bonus.attackSpeedPct;
    merged.armor += bonus.armor;
    merged.magicResist += bonus.magicResist;
    merged.health += bonus.health;
    merged.maxHealthPct += bonus.maxHealthPct;
    merged.mana += bonus.mana;
    merged.maxManaDelta += bonus.maxManaDelta;
    merged.critChancePct += bonus.critChancePct;
    merged.range += bonus.range;
    merged.damageAmpPct += bonus.damageAmpPct;
    merged.durabilityPct += bonus.durabilityPct;
    merged.omnivampPct += bonus.omnivampPct;
  }
  return merged;
}

function scaled(value: number | undefined, multiplier: number) {
  return value === undefined || value === null ? undefined : value * multiplier;
}

export function computeChampionStats(
  base: ChampionStats | undefined,
  star: StarLevel,
  bonus: ItemStatBonuses = EMPTY_ITEM_BONUSES,
): ComputedChampionStats {
  const scaling = STAR_SCALING[star];
  const starHealth = scaled(base?.hp, scaling.health);
  const starAttackDamage = scaled(base?.damage, scaling.attackDamage);
  const health = starHealth === undefined
    ? undefined
    : (starHealth + bonus.health) * (1 + bonus.maxHealthPct);
  const attackDamage = starAttackDamage === undefined
    ? undefined
    : starAttackDamage * (1 + bonus.attackDamagePct);
  const attackSpeed = base?.attackSpeed === undefined
    ? undefined
    : base.attackSpeed * (1 + bonus.attackSpeedPct);
  const maxMana = base?.mana === undefined
    ? undefined
    : Math.max(0, base.mana + bonus.maxManaDelta);
  const rawInitialMana = base?.initialMana === undefined && bonus.mana === 0
    ? undefined
    : (base?.initialMana ?? 0) + bonus.mana;
  const initialMana = rawInitialMana === undefined
    ? undefined
    : maxMana === undefined ? rawInitialMana : Math.min(maxMana, Math.max(0, rawInitialMana));

  return {
    health,
    attackDamage,
    attackSpeed,
    dps: attackDamage !== undefined && attackSpeed !== undefined ? attackDamage * attackSpeed : undefined,
    abilityPower: 100 + bonus.abilityPower,
    armor: base?.armor === undefined ? undefined : base.armor + bonus.armor,
    magicResist: base?.magicResist === undefined ? undefined : base.magicResist + bonus.magicResist,
    initialMana,
    maxMana,
    critChance: (base?.critChance ?? 0.25) + bonus.critChancePct,
    range: base?.range === undefined ? undefined : Math.max(0, base.range + bonus.range),
    damageAmpPct: bonus.damageAmpPct,
    durabilityPct: bonus.durabilityPct,
    omnivampPct: bonus.omnivampPct,
  };
}
