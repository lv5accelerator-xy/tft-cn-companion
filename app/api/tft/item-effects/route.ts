import { NextResponse } from "next/server";
import { patchInfo } from "@/data/tft";
import {
  EMPTY_ITEM_BONUSES,
  type ItemEffectRecord,
  type ItemEffectsPayload,
  type ItemStatBonuses,
} from "@/data/stat-simulator";

type CDragonItem = {
  apiName?: string;
  name?: string;
  isAugment?: boolean;
  effects?: Record<string, number | string | null | undefined>;
};

type CDragonPayload = {
  items?: CDragonItem[];
};

const CDRAGON = "https://raw.communitydragon.org/latest";

function normalizedKey(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "");
}

function asNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asFraction(value: number) {
  return Math.abs(value) > 1.5 ? value / 100 : value;
}

function addStaticBonus(target: ItemStatBonuses, key: string, value: number) {
  const normalized = normalizedKey(key);

  if (["ad", "attackdamage", "bonusattackdamage", "attackdamagepercent"].includes(normalized)) {
    target.attackDamagePct += asFraction(value);
    return true;
  }
  if (["ap", "abilitypower", "spellpower"].includes(normalized)) {
    target.abilityPower += value;
    return true;
  }
  if (["as", "attackspeed", "bonusattackspeed", "attackspeedpercent"].includes(normalized)) {
    target.attackSpeedPct += asFraction(value);
    return true;
  }
  if (["armor", "bonusarmor"].includes(normalized)) {
    target.armor += value;
    return true;
  }
  if (["mr", "magicresist", "bonusmagicresist"].includes(normalized)) {
    target.magicResist += value;
    return true;
  }
  if (["health", "hp", "bonushealth"].includes(normalized)) {
    target.health += value;
    return true;
  }
  if (["bonuspercenthp", "healthpercent", "maxhealthpercent", "bonusmaxhealthpercent", "percentmaxhealth"].includes(normalized)) {
    target.maxHealthPct += asFraction(value);
    return true;
  }
  if (["mana", "startingmana", "initialmana"].includes(normalized)) {
    target.mana += value;
    return true;
  }
  if (["manareduction", "maxmanareduction", "manacostreduction"].includes(normalized)) {
    target.maxManaDelta -= Math.abs(value);
    return true;
  }
  if (["maxmanaincrease", "bonusmaxmana"].includes(normalized)) {
    target.maxManaDelta += value;
    return true;
  }
  if (["crit", "critchance", "criticalstrikechance"].includes(normalized)) {
    target.critChancePct += asFraction(value);
    return true;
  }
  if (["range", "attackrange", "rangeincrease", "bonusattackrange"].includes(normalized)) {
    target.range += value;
    return true;
  }
  if (["damageamp", "damageamplification", "bonusdamageamp"].includes(normalized)) {
    target.damageAmpPct += asFraction(value);
    return true;
  }
  if (["durability", "damagereduction"].includes(normalized)) {
    target.durabilityPct += asFraction(value);
    return true;
  }
  if (["omnivamp", "omnivamppercent"].includes(normalized)) {
    target.omnivampPct += asFraction(value);
    return true;
  }
  return false;
}

function itemRecord(item: CDragonItem): ItemEffectRecord | null {
  if (!item.apiName || !item.name || item.isAugment) return null;
  if (!/(?:^|_)Item_/i.test(item.apiName)) return null;

  const bonuses = { ...EMPTY_ITEM_BONUSES };
  const rawEffects: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(item.effects ?? {})) {
    const value = asNumber(rawValue);
    if (value === null) continue;
    rawEffects[key] = value;
    addStaticBonus(bonuses, key, value);
  }

  return {
    id: item.apiName,
    name: item.name,
    bonuses,
    rawEffects,
  };
}

export async function GET() {
  try {
    const response = await fetch(`${CDRAGON}/cdragon/tft/en_us.json`, {
      next: { revalidate: 21600 },
      headers: { "User-Agent": "TFT-CN-Companion/1.0" },
    });
    if (!response.ok) throw new Error(`CommunityDragon request failed: ${response.status}`);

    const raw = await response.json() as CDragonPayload;
    const records = (raw.items ?? [])
      .map(itemRecord)
      .filter((item): item is ItemEffectRecord => Boolean(item));

    if (records.length < 50) throw new Error(`Incomplete item-effect data: ${records.length}`);

    const payload: ItemEffectsPayload = {
      source: "CommunityDragon",
      updated: patchInfo.updated,
      items: records,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load TFT item effects" },
      { status: 502 },
    );
  }
}
