import type { AbilityDamageType, AbilityScale, ChampionAbilityTerm } from "@/data/champion-details";
import type { ComputedChampionStats, StarLevel } from "@/data/stat-simulator";

export type AbilityProjection = {
  raw: number;
  scale: AbilityScale;
  sourceStat?: number;
  contribution?: number;
  afterDamageAmp?: number;
};

export type EstimatedDamageProjection = {
  damageType: AbilityDamageType;
  preMitigation: number;
  postMitigation?: number;
  resistance?: number;
  multiplier?: number;
};

function sourceStatForScale(scale: AbilityScale, stats: ComputedChampionStats) {
  switch (scale) {
    case "AD": return stats.attackDamage;
    case "AP": return stats.abilityPower;
    case "AS": return stats.attackSpeed;
    case "Armor": return stats.armor;
    case "MR": return stats.magicResist;
    case "Health": return stats.health;
    case "Crit": return stats.critChance;
    case "DamageAmp": return stats.damageAmpPct;
    case "DamageReduction": return stats.durabilityPct;
    case "Omnivamp": return stats.omnivampPct;
    default: return undefined;
  }
}

export function abilityValueAtStar(term: ChampionAbilityTerm, star: StarLevel) {
  const index = star - 1;
  return term.values[index] ?? term.values[term.values.length - 1] ?? 0;
}

export function projectAbilityTerm(
  term: ChampionAbilityTerm,
  star: StarLevel,
  stats: ComputedChampionStats,
): AbilityProjection {
  const raw = abilityValueAtStar(term, star);
  const sourceStat = sourceStatForScale(term.scale, stats);
  if (term.scale === "None" || term.scale === "CritDamage" || sourceStat === undefined) {
    return { raw, scale: term.scale };
  }

  // CommunityDragon's TFT scale icons express percentage coefficients.
  // Example: 145 with scaleAD means 145% of the champion's current AD.
  const contribution = sourceStat * (raw / 100);
  const afterDamageAmp = term.kind === "damage"
    ? contribution * (1 + stats.damageAmpPct)
    : undefined;

  return {
    raw,
    scale: term.scale,
    sourceStat,
    contribution,
    afterDamageAmp,
  };
}

export function resistanceMultiplier(resistance: number) {
  if (!Number.isFinite(resistance)) return 1;
  if (resistance >= 0) return 100 / (100 + resistance);
  return 2 - (100 / (100 - resistance));
}

export function estimateAbilityDamageTerm(
  term: ChampionAbilityTerm,
  star: StarLevel,
  stats: ComputedChampionStats,
  targetArmor: number,
  targetMagicResist: number,
): EstimatedDamageProjection | null {
  if (term.kind !== "damage") return null;
  const projected = projectAbilityTerm(term, star, stats);
  const base = projected.contribution ?? projected.raw;
  const preMitigation = projected.afterDamageAmp ?? base * (1 + stats.damageAmpPct);
  const damageType = term.damageType ?? "unknown";

  if (damageType === "true") {
    return { damageType, preMitigation, postMitigation: preMitigation, multiplier: 1 };
  }
  if (damageType === "unknown") {
    return { damageType, preMitigation };
  }

  const resistance = damageType === "physical" ? targetArmor : targetMagicResist;
  const multiplier = resistanceMultiplier(resistance);
  return {
    damageType,
    preMitigation,
    postMitigation: preMitigation * multiplier,
    resistance,
    multiplier,
  };
}

export function estimateAutoDps(stats: ComputedChampionStats, targetArmor: number) {
  if (stats.dps === undefined) return undefined;
  return stats.dps * (1 + stats.damageAmpPct) * resistanceMultiplier(targetArmor);
}

export function scaleLabel(scale: AbilityScale, locale: "zh" | "en") {
  const labels: Record<AbilityScale, [string, string]> = {
    AD: ["攻击力", "AD"],
    AP: ["法强", "AP"],
    AS: ["攻速", "AS"],
    Armor: ["护甲", "Armor"],
    MR: ["魔抗", "MR"],
    Health: ["生命", "Health"],
    Crit: ["暴击", "Crit"],
    CritDamage: ["暴击伤害", "Crit Damage"],
    DamageAmp: ["伤害增幅", "Damage Amp"],
    DamageReduction: ["减伤", "Damage Reduction"],
    Omnivamp: ["全能吸血", "Omnivamp"],
    None: ["固定值", "Flat"],
  };
  return labels[scale][locale === "zh" ? 0 : 1];
}

export function damageTypeLabel(type: AbilityDamageType | undefined, locale: "zh" | "en") {
  const labels: Record<AbilityDamageType, [string, string]> = {
    physical: ["物理", "Physical"],
    magic: ["魔法", "Magic"],
    true: ["真实", "True"],
    unknown: ["类型未知", "Unknown type"],
  };
  return labels[type ?? "unknown"][locale === "zh" ? 0 : 1];
}

export function termKindLabel(kind: ChampionAbilityTerm["kind"], locale: "zh" | "en") {
  const labels: Record<ChampionAbilityTerm["kind"], [string, string]> = {
    damage: ["伤害", "Damage"],
    shield: ["护盾", "Shield"],
    heal: ["治疗", "Heal"],
    utility: ["技能变量", "Ability value"],
  };
  return labels[kind][locale === "zh" ? 0 : 1];
}
