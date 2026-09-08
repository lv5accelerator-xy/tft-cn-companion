import { NextResponse } from "next/server";
import {
  componentNames,
  itemLegacyAliases,
  patchInfo,
  recipes,
  set18EmblemNames,
  standardItemNames,
  tacticianItemNames,
  type CatalogEntry,
  type ItemSubtype,
} from "@/data/tft";

type DragonImage = {
  full?: string;
};

type DragonRecord = {
  id?: string;
  name?: string;
  tier?: number | string;
  image?: DragonImage;
};

type DragonPayload = {
  data?: Record<string, DragonRecord>;
};

type RealmPayload = {
  v?: string;
  n?: Record<string, string>;
};

const DDRAGON = "https://ddragon.leagueoflegends.com";
const CDRAGON = "https://raw.communitydragon.org/latest";
const FALLBACK_VERSION = "16.17.1";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: 21600 } });
  if (!response.ok) {
    throw new Error(`Data Dragon request failed: ${response.status} ${url}`);
  }
  return response.json() as Promise<T>;
}

function isSet18ChampionId(id: string) {
  return /\/Sets\/TFTSet18\/Shop\//i.test(id) || /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
}

function isSet18TraitId(id: string) {
  return /^DA(?:_|$)/i.test(id) || /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
}

function isSet18AugmentId(id: string) {
  return /^DA_18_/i.test(id);
}

function imageUrl(version: string, group: string, image?: DragonImage) {
  if (!image?.full) return undefined;
  return `${DDRAGON}/cdn/${version}/img/${group}/${image.full}`;
}

function tftShopPortraitUrl(image?: DragonImage) {
  const full = image?.full;
  if (!full) return undefined;

  const lower = full.toLocaleLowerCase("en-US");
  const splashIndex = lower.indexOf("_splash");
  const stem = (splashIndex > 0 ? full.slice(0, splashIndex) : full.replace(/\.[^.]+$/, ""))
    .toLocaleLowerCase("en-US");

  if (!stem.startsWith("tft18_")) return undefined;
  return `${CDRAGON}/game/assets/characters/${stem}/${stem}_square.png`;
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ");
}

function pairLocalizedEntries(
  version: string,
  type: CatalogEntry["type"],
  enPayload: DragonPayload,
  zhPayload: DragonPayload,
  group: string,
  filter: (id: string, entry: DragonRecord) => boolean,
): CatalogEntry[] {
  const enData = enPayload.data ?? {};
  const zhData = zhPayload.data ?? {};

  return Object.entries(enData)
    .filter(([id, entry]) => entry.name && filter(id, entry))
    .map(([id, entry]) => {
      const zh = zhData[id];
      const tierNumber = Number(entry.tier);
      const defaultImage = imageUrl(version, group, entry.image);
      return {
        id,
        type,
        nameEn: entry.name as string,
        nameZh: zh?.name || entry.name || id,
        imageUrl: type === "英雄" ? tftShopPortraitUrl(entry.image) ?? defaultImage : defaultImage,
        tier: Number.isFinite(tierNumber) ? tierNumber : undefined,
      } satisfies CatalogEntry;
    })
    .sort((a, b) => {
      if (type === "英雄" && a.tier !== b.tier) return (a.tier ?? 99) - (b.tier ?? 99);
      return a.nameEn.localeCompare(b.nameEn);
    });
}

function dedupeByVisibleName(entries: CatalogEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${normalizeName(entry.nameEn)}|${normalizeName(entry.nameZh)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isArtifactItemId(id: string) {
  return /(?:ornn|artifact)/i.test(id)
    && !/(radiant|support|augment)/i.test(id);
}

function aliasesForItem(name: string) {
  const normalized = normalizeName(name);
  const match = Object.entries(itemLegacyAliases)
    .find(([key]) => normalizeName(key) === normalized);
  return match?.[1];
}

function normalizeItems(
  version: string,
  enPayload: DragonPayload,
  zhPayload: DragonPayload,
): CatalogEntry[] {
  const wanted = new Set(standardItemNames.map(normalizeName));
  const components = new Set(componentNames.map(normalizeName));
  const emblems = new Set(set18EmblemNames.map(normalizeName));
  const tacticianItems = new Set(tacticianItemNames.map(normalizeName));
  const enData = enPayload.data ?? {};
  const zhData = zhPayload.data ?? {};
  const byName = new Map<string, CatalogEntry>();

  for (const [id, entry] of Object.entries(enData)) {
    if (!entry.name) continue;
    const key = normalizeName(entry.name);
    const isArtifact = isArtifactItemId(id);
    if (!wanted.has(key) && !isArtifact) continue;

    let subtype: ItemSubtype = "completed";
    if (components.has(key)) subtype = "component";
    else if (emblems.has(key)) subtype = "emblem";
    else if (tacticianItems.has(key)) subtype = "tactician";
    else if (isArtifact) subtype = "artifact";

    const zh = zhData[id];
    const candidate: CatalogEntry = {
      id,
      type: "装备",
      nameEn: entry.name,
      nameZh: zh?.name || entry.name,
      imageUrl: imageUrl(version, "tft-item", entry.image),
      subtype,
      aliases: aliasesForItem(entry.name),
    };

    const current = byName.get(key);
    const candidateIsGeneric = id.startsWith("TFT_Item_");
    const currentIsGeneric = current?.id.startsWith("TFT_Item_") ?? false;
    if (!current || (candidateIsGeneric && !currentIsGeneric)) {
      byName.set(key, candidate);
    }
  }

  const order: Record<ItemSubtype, number> = {
    component: 0,
    completed: 1,
    emblem: 2,
    tactician: 3,
    artifact: 4,
  };

  return Array.from(byName.values()).sort((a, b) => {
    const aOrder = a.subtype ? order[a.subtype] : 99;
    const bOrder = b.subtype ? order[b.subtype] : 99;
    return aOrder - bOrder || a.nameEn.localeCompare(b.nameEn);
  });
}

export async function GET() {
  try {
    const realm = await getJson<RealmPayload>(`${DDRAGON}/realms/na.json`);
    const version = realm.v || realm.n?.item || FALLBACK_VERSION;
    const base = `${DDRAGON}/cdn/${version}/data`;

    const [
      enChampions,
      zhChampions,
      enItems,
      zhItems,
      enTraits,
      zhTraits,
      enAugments,
      zhAugments,
    ] = await Promise.all([
      getJson<DragonPayload>(`${base}/en_US/tft-champion.json`),
      getJson<DragonPayload>(`${base}/zh_CN/tft-champion.json`),
      getJson<DragonPayload>(`${base}/en_US/tft-item.json`),
      getJson<DragonPayload>(`${base}/zh_CN/tft-item.json`),
      getJson<DragonPayload>(`${base}/en_US/tft-trait.json`),
      getJson<DragonPayload>(`${base}/zh_CN/tft-trait.json`),
      getJson<DragonPayload>(`${base}/en_US/tft-augments.json`),
      getJson<DragonPayload>(`${base}/zh_CN/tft-augments.json`),
    ]);

    const champions = pairLocalizedEntries(
      version,
      "英雄",
      enChampions,
      zhChampions,
      "tft-champion",
      (id, entry) =>
        isSet18ChampionId(id) && !/^Lux \(/i.test(entry.name ?? ""),
    );

    const traits = pairLocalizedEntries(
      version,
      "羁绊",
      enTraits,
      zhTraits,
      "tft-trait",
      (id) => isSet18TraitId(id),
    );

    const augments = dedupeByVisibleName(
      pairLocalizedEntries(
        version,
        "强化",
        enAugments,
        zhAugments,
        "tft-augment",
        (id) => isSet18AugmentId(id),
      ),
    );

    const items = normalizeItems(version, enItems, zhItems);
    const components = componentNames
      .map((name) => items.find((item) => normalizeName(item.nameEn) === normalizeName(name)))
      .filter((item): item is CatalogEntry => Boolean(item));

    if (champions.length < 50 || traits.length < 5 || augments.length < 30 || components.length < 10) {
      throw new Error(
        `Incomplete TFT catalog: champions=${champions.length}, traits=${traits.length}, augments=${augments.length}, components=${components.length}`,
      );
    }

    return NextResponse.json(
      {
        source: "Riot Data Dragon + CommunityDragon",
        dataDragonVersion: version,
        tftPatch: patchInfo.patch,
        set: patchInfo.set,
        updated: patchInfo.updated,
        champions,
        items,
        traits,
        augments,
        components,
        recipes,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load TFT catalog",
      },
      { status: 502 },
    );
  }
}
