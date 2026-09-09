import type { ComputedChampionStats } from "@/data/stat-simulator";
import { resistanceMultiplier } from "@/lib/tft-ability-calculator";

export type DefensiveProjection = {
  health?: number;
  armor?: number;
  magicResist?: number;
  durabilityPct: number;
  physicalTakenMultiplier?: number;
  magicTakenMultiplier?: number;
  physicalEhp?: number;
  magicEhp?: number;
  mixedEhp?: number;
  postMitigationDps?: number;
  survivalSeconds?: number;
};

function durabilityMultiplier(durabilityPct: number) {
  if (!Number.isFinite(durabilityPct)) return 1;
  // Keep static-sheet math finite even if upstream data is malformed.
  const clamped = Math.min(0.95, Math.max(0, durabilityPct));
  return 1 - clamped;
}

export function projectDefense(
  stats: ComputedChampionStats,
  incomingPhysicalDps: number,
  incomingMagicDps: number,
): DefensiveProjection {
  const health = stats.health;
  const armor = stats.armor;
  const magicResist = stats.magicResist;
  const durabilityPct = Math.max(0, stats.durabilityPct || 0);
  const durability = durabilityMultiplier(durabilityPct);

  const physicalTakenMultiplier = armor === undefined
    ? undefined
    : resistanceMultiplier(armor) * durability;
  const magicTakenMultiplier = magicResist === undefined
    ? undefined
    : resistanceMultiplier(magicResist) * durability;

  const physicalEhp = health !== undefined && physicalTakenMultiplier !== undefined && physicalTakenMultiplier > 0
    ? health / physicalTakenMultiplier
    : undefined;
  const magicEhp = health !== undefined && magicTakenMultiplier !== undefined && magicTakenMultiplier > 0
    ? health / magicTakenMultiplier
    : undefined;

  const physicalDps = Math.max(0, Number.isFinite(incomingPhysicalDps) ? incomingPhysicalDps : 0);
  const magicDps = Math.max(0, Number.isFinite(incomingMagicDps) ? incomingMagicDps : 0);
  const rawDps = physicalDps + magicDps;

  const postMitigationDps = physicalTakenMultiplier === undefined || magicTakenMultiplier === undefined
    ? undefined
    : physicalDps * physicalTakenMultiplier + magicDps * magicTakenMultiplier;

  const weightedTakenMultiplier = rawDps > 0 && physicalTakenMultiplier !== undefined && magicTakenMultiplier !== undefined
    ? postMitigationDps! / rawDps
    : undefined;
  const mixedEhp = health !== undefined && weightedTakenMultiplier !== undefined && weightedTakenMultiplier > 0
    ? health / weightedTakenMultiplier
    : undefined;
  const survivalSeconds = health !== undefined && postMitigationDps !== undefined && postMitigationDps > 0
    ? health / postMitigationDps
    : undefined;

  return {
    health,
    armor,
    magicResist,
    durabilityPct,
    physicalTakenMultiplier,
    magicTakenMultiplier,
    physicalEhp,
    magicEhp,
    mixedEhp,
    postMitigationDps,
    survivalSeconds,
  };
}
