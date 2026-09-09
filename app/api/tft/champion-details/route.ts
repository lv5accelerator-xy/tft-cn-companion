import { NextRequest, NextResponse } from "next/server";
import { patchInfo } from "@/data/tft";
import type {
  AbilityScale,
  AbilityTermKind,
  ChampionAbilityTerm,
  ChampionDetail,
  ChampionDetailsPayload,
  ChampionStats,
} from "@/data/champion-details";

type CDragonVariable = {
  name?: string;
  value?: number | number[];
};

type CDragonAbility = {
  name?: string;
  desc?: string;
  icon?: string;
  variables?: CDragonVariable[];
};

type CDragonChampion = {
  apiName?: string;
  name?: string;
  cost?: number;
  traits?: string[];
  ability?: CDragonAbility;
  stats?: ChampionStats;
};

type CDragonSet = {
  champions?: CDragonChampion[];
};

type CDragonPayload = {
  sets?: Record<string, CDragonSet>;
};

const CDRAGON = "https://raw.communitydragon.org/latest";

const iconLabels = {
  zh: {
    scaleAD: "攻击力",
    scaleAP: "法强",
    scaleAS: "攻速",
    scaleArmor: "护甲",
    scaleCrit: "暴击",
    scaleCritMult: "暴击伤害",
    scaleDA: "伤害增幅",
    scaleDR: "伤害减免",
    scaleHealth: "生命值",
    scaleMR: "魔抗",
    scaleSV: "全能吸血",
  },
  en: {
    scaleAD: "AD",
    scaleAP: "AP",
    scaleAS: "Attack Speed",
    scaleArmor: "Armor",
    scaleCrit: "Crit Chance",
    scaleCritMult: "Crit Damage",
    scaleDA: "Damage Amp",
    scaleDR: "Damage Reduction",
    scaleHealth: "Health",
    scaleMR: "Magic Resist",
    scaleSV: "Omnivamp",
  },
} as const;

const scaleMap: Record<string, AbilityScale> = {
  scaleAD: "AD",
  scaleAP: "AP",
  scaleAS: "AS",
  scaleArmor: "Armor",
  scaleCrit: "Crit",
  scaleCritMult: "CritDamage",
  scaleDA: "DamageAmp",
  scaleDR: "DamageReduction",
  scaleHealth: "Health",
  scaleMR: "MR",
  scaleSV: "Omnivamp",
};

function setNumber() {
  const match = patchInfo.set.match(/Set\s*(\d+)/i);
  return match ? Number(match[1]) : 18;
}

function assetUrl(path?: string) {
  if (!path) return undefined;
  const normalized = path
    .replace(/^\/+/, "")
    .toLocaleLowerCase("en-US")
    .replace(/\.tex$/i, ".png")
    .replace(/\.dds$/i, ".png");
  return `${CDRAGON}/game/${normalized}`;
}

function formatValue(value: number | number[] | undefined, multiplier = 1) {
  if (typeof value === "number") return String(Math.round(value * multiplier * 100) / 100);
  if (!Array.isArray(value)) return undefined;
  let values = value.filter((entry) => Number.isFinite(entry));
  if (values.length > 3 && values[0] === 0) values = values.slice(1);
  values = values.slice(0, 4);
  if (!values.length) return undefined;
  return values.map((entry) => String(Math.round(entry * multiplier * 100) / 100)).join("/");
}

function resolveVariables(text: string, variables: CDragonVariable[] | undefined) {
  const byName = new Map<string, number | number[]>();
  for (const variable of variables ?? []) {
    if (variable.name && variable.value !== undefined) {
      byName.set(variable.name.toLocaleLowerCase("en-US"), variable.value);
    }
  }

  return text.replace(/@([^@]+)@/g, (_match, rawToken: string) => {
    const multiply = rawToken.match(/^(.+?)\*(\d+(?:\.\d+)?)$/);
    const key = (multiply?.[1] ?? rawToken).trim().toLocaleLowerCase("en-US");
    const multiplier = multiply ? Number(multiply[2]) : 1;
    return formatValue(byName.get(key), multiplier) ?? "?";
  });
}

function cleanAbilityDescription(value: string | undefined, variables: CDragonVariable[] | undefined, locale: "zh" | "en") {
  if (!value) return undefined;
  const labels = iconLabels[locale] as Record<string, string>;
  const resolved = resolveVariables(value, variables)
    .replace(/%i:([^%]+)%/g, (_match, icon: string) => labels[icon] ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return resolved || undefined;
}

function starValues(value: number | number[] | undefined, multiplier = 1) {
  if (typeof value === "number") return [value * multiplier, value * multiplier, value * multiplier];
  if (!Array.isArray(value)) return [];
  let values = value.filter((entry) => Number.isFinite(entry));
  if (values.length >= 4 && values[0] === 0) values = values.slice(1);
  values = values.slice(0, 3);
  if (!values.length) return [];
  while (values.length < 3) values.push(values[values.length - 1]);
  return values.map((entry) => Math.round(entry * multiplier * 10000) / 10000);
}

function termLabel(key: string) {
  return key
    .replace(/^m(?=[A-Z])/, "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function termKind(label: string): AbilityTermKind {
  const normalized = label.toLocaleLowerCase("en-US");
  if (/(shield|barrier)/.test(normalized)) return "shield";
  if (/(heal|healing|restore health|health restore)/.test(normalized)) return "heal";
  if (/(damage|dmg|strike|hit damage|bonus damage|physical|magic)/.test(normalized)) return "damage";
  return "utility";
}

function parseAbilityTerms(desc: string | undefined, variables: CDragonVariable[] | undefined): ChampionAbilityTerm[] {
  if (!desc || !variables?.length) return [];

  const byName = new Map<string, CDragonVariable>();
  for (const variable of variables) {
    if (variable.name && variable.value !== undefined) byName.set(variable.name.toLocaleLowerCase("en-US"), variable);
  }

  const terms: ChampionAbilityTerm[] = [];
  const seen = new Set<string>();
  for (const match of desc.matchAll(/@([^@]+)@([^@]*)/g)) {
    const rawToken = match[1].trim();
    const multiply = rawToken.match(/^(.+?)\*(\d+(?:\.\d+)?)$/);
    const variableKey = (multiply?.[1] ?? rawToken).trim();
    const multiplier = multiply ? Number(multiply[2]) : 1;
    const variable = byName.get(variableKey.toLocaleLowerCase("en-US"));
    if (!variable) continue;

    const values = starValues(variable.value, multiplier);
    if (!values.length) continue;

    const following = match[2] ?? "";
    const icon = following.match(/%i:(scaleAD|scaleAP|scaleAS|scaleArmor|scaleCrit|scaleCritMult|scaleDA|scaleDR|scaleHealth|scaleMR|scaleSV)%/)?.[1];
    const scale = icon ? scaleMap[icon] ?? "None" : "None";
    const label = termLabel(variableKey) || variableKey;
    const signature = `${variableKey}|${scale}|${values.join(",")}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    terms.push({ key: variableKey, label, values, scale, kind: termKind(label) });
  }

  return terms.slice(0, 16);
}

function normalizeChampion(champion: CDragonChampion, locale: "zh" | "en"): ChampionDetail | null {
  if (!champion.apiName || !champion.name) return null;
  if (!Array.isArray(champion.traits) || champion.traits.length === 0) return null;
  const cost = Number(champion.cost);
  if (!Number.isFinite(cost) || cost < 1 || cost > 5) return null;

  return {
    id: champion.apiName,
    name: champion.name,
    cost,
    traits: champion.traits,
    abilityName: champion.ability?.name,
    abilityDesc: cleanAbilityDescription(champion.ability?.desc, champion.ability?.variables, locale),
    abilityIconUrl: assetUrl(champion.ability?.icon),
    abilityTerms: parseAbilityTerms(champion.ability?.desc, champion.ability?.variables),
    stats: champion.stats ? {
      hp: champion.stats.hp,
      mana: champion.stats.mana,
      initialMana: champion.stats.initialMana,
      armor: champion.stats.armor,
      magicResist: champion.stats.magicResist,
      damage: champion.stats.damage,
      attackSpeed: champion.stats.attackSpeed,
      critChance: champion.stats.critChance,
      range: champion.stats.range,
    } : undefined,
  };
}

export async function GET(request: NextRequest) {
  const locale: "zh" | "en" = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const cdragonLocale = locale === "en" ? "en_us" : "zh_cn";
  const currentSet = setNumber();

  try {
    const response = await fetch(`${CDRAGON}/cdragon/tft/${cdragonLocale}.json`, {
      next: { revalidate: 21600 },
      headers: { "User-Agent": "TFT-CN-Companion/1.0" },
    });
    if (!response.ok) throw new Error(`CommunityDragon request failed: ${response.status}`);
    const raw = await response.json() as CDragonPayload;
    const set = raw.sets?.[String(currentSet)];
    if (!set?.champions?.length) throw new Error(`Set ${currentSet} champion details unavailable`);

    const champions = set.champions
      .map((champion) => normalizeChampion(champion, locale))
      .filter((champion): champion is ChampionDetail => Boolean(champion))
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

    if (champions.length < 50) throw new Error(`Incomplete champion details: ${champions.length}`);

    const payload: ChampionDetailsPayload = {
      source: "CommunityDragon",
      locale,
      set: currentSet,
      updated: patchInfo.updated,
      champions,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load champion details" },
      { status: 502 },
    );
  }
}
