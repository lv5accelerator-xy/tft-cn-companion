import { NextResponse } from "next/server";
import {
  componentNames,
  patchInfo,
  recipes,
  standardItemNames,
  type CatalogEntry,
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
const FALLBACK_VERSION = "16.17.1";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: 21600 } });
  if (!response.ok) {
    throw new Error(`Data Dragon request failed: ${response.status} ${url}`);
  }
  return response.json() as Promise<T>;
}

function set18Id(id: string) {
  return /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
}

function imageUrl(version: string, group: string, image?: DragonImage) {
  if (!image?.full) return undefined;
  return `${DDRAGON}/cdn/${version}/img/${group}/${image.full}`;
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function pairLocalizedEntries(
  version: string,
  type: CatalogEntry["type"],
  enPayload: DragonPayload,
  zhPayload: DragonPayload,
  group: string,
  filter: (entry: DragonRecord) => boolean,
): CatalogEntry[] {
  const enData = enPayload.data ?? {};
  const zhData = zhPayload.data ?? {};

  return Object.values(enData)
    .filter((entry) => entry.id && entry.name && filter(entry))
    .map((entry) => {
      const id = entry.id as string;
      const zh = zhData[id];
      const tierNumber = Number(entry.tier);
      return {
        id,
        type,
        nameEn: entry.name as string,
        nameZh: zh?.name || entry.name || id,
        imageUrl: imageUrl(version, group, entry.image),
        tier: Number.isFinite(tierNumber) ? tierNumber : undefined,
      } satisfies CatalogEntry;
    })
    .sort((a, b) => {
      if (type === "英雄" && a.tier !== b.tier) return (a.tier ?? 99) - (b.tier ?? 99);
      return a.nameEn.localeCompare(b.nameEn);
    });
}

function normalizeItems(
  version: string,
  enPayload: DragonPayload,
  zhPayload: DragonPayload,
): CatalogEntry[] {
  const wanted = new Set(standardItemNames.map(normalizeName));
  const enData = enPayload.data ?? {};
  const zhData = zhPayload.data ?? {};
  const byName = new Map<string, CatalogEntry>();

  for (const entry of Object.values(enData)) {
    if (!entry.id || !entry.name) continue;
    const key = normalizeName(entry.name);
    if (!wanted.has(key)) continue;

    const zh = zhData[entry.id];
    const candidate: CatalogEntry = {
      id: entry.id,
      type: "装备",
      nameEn: entry.name,
      nameZh: zh?.name || entry.name,
      imageUrl: imageUrl(version, "tft-item", entry.image),
      subtype: componentNames.includes(entry.name as (typeof componentNames)[number])
        ? "component"
        : "completed",
    };

    const current = byName.get(key);
    const candidateIsGeneric = entry.id.startsWith("TFT_Item_");
    const currentIsGeneric = current?.id.startsWith("TFT_Item_") ?? false;
    if (!current || (candidateIsGeneric && !currentIsGeneric)) {
      byName.set(key, candidate);
    }
  }

  return Array.from(byName.values()).sort((a, b) => {
    if (a.subtype !== b.subtype) return a.subtype === "component" ? -1 : 1;
    return a.nameEn.localeCompare(b.nameEn);
  });
}

export async function GET() {
  try {
    const realm = await getJson<RealmPayload>(`${DDRAGON}/realms/na.json`);
    const version = realm.v || realm.n?.item || FALLBACK_VERSION;
    const base = `${DDRAGON}/cdn/${version}/data`;

    const [enChampions, zhChampions, enItems, zhItems, enTraits, zhTraits] = await Promise.all([
      getJson<DragonPayload>(`${base}/en_US/tft-champion.json`),
      getJson<DragonPayload>(`${base}/zh_CN/tft-champion.json`),
      getJson<DragonPayload>(`${base}/en_US/tft-item.json`),
      getJson<DragonPayload>(`${base}/zh_CN/tft-item.json`),
      getJson<DragonPayload>(`${base}/en_US/tft-trait.json`),
      getJson<DragonPayload>(`${base}/zh_CN/tft-trait.json`),
    ]);

    const champions = pairLocalizedEntries(
      version,
      "英雄",
      enChampions,
      zhChampions,
      "tft-champion",
      (entry) => Boolean(entry.id && set18Id(entry.id)),
    );

    const traits = pairLocalizedEntries(
      version,
      "羁绊",
      enTraits,
      zhTraits,
      "tft-trait",
      (entry) => Boolean(entry.id && set18Id(entry.id)),
    );

    const items = normalizeItems(version, enItems, zhItems);
    const components = componentNames
      .map((name) => items.find((item) => normalizeName(item.nameEn) === normalizeName(name)))
      .filter((item): item is CatalogEntry => Boolean(item));

    return NextResponse.json(
      {
        source: "Riot Data Dragon",
        dataDragonVersion: version,
        tftPatch: patchInfo.patch,
        set: patchInfo.set,
        updated: patchInfo.updated,
        champions,
        items,
        traits,
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
