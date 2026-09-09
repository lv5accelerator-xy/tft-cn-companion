import { NextResponse } from "next/server";

type TraitEffect = { minUnits?: number | string };
type DragonRecord = { name?: string; traits?: string[]; effects?: TraitEffect[] };
type DragonPayload = { data?: Record<string, DragonRecord> };
type RealmPayload = { v?: string; n?: Record<string, string> };

const DDRAGON = "https://ddragon.leagueoflegends.com";
const FALLBACK_VERSION = "16.17.1";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: 21600 } });
  if (!response.ok) throw new Error(`Data Dragon request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function isSet18ChampionId(id: string) {
  return /\/Sets\/TFTSet18\/Shop\//i.test(id) || /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
}

function isSet18TraitId(id: string) {
  return /^DA(?:_|$)/i.test(id) || /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
}

export async function GET() {
  try {
    const realm = await getJson<RealmPayload>(`${DDRAGON}/realms/na.json`);
    const version = realm.v || realm.n?.item || FALLBACK_VERSION;
    const base = `${DDRAGON}/cdn/${version}/data`;
    const [champions, traitsEn, traitsZh] = await Promise.all([
      getJson<DragonPayload>(`${base}/en_US/tft-champion.json`),
      getJson<DragonPayload>(`${base}/en_US/tft-trait.json`),
      getJson<DragonPayload>(`${base}/zh_CN/tft-trait.json`),
    ]);

    const championTraits: Record<string, string[]> = {};
    for (const [id, entry] of Object.entries(champions.data ?? {})) {
      if (!entry.name || !isSet18ChampionId(id) || /^Lux \(/i.test(entry.name)) continue;
      championTraits[entry.name] = Array.isArray(entry.traits) ? entry.traits.filter(Boolean) : [];
    }

    const traitMap: Record<string, { nameEn: string; nameZh: string; thresholds: number[] }> = {};
    for (const [id, entry] of Object.entries(traitsEn.data ?? {})) {
      if (!entry.name || !isSet18TraitId(id)) continue;
      const thresholds = Array.from(new Set((entry.effects ?? [])
        .map((effect) => Number(effect.minUnits))
        .filter((value) => Number.isFinite(value) && value > 0)))
        .sort((a, b) => a - b);
      traitMap[entry.name] = {
        nameEn: entry.name,
        nameZh: traitsZh.data?.[id]?.name || entry.name,
        thresholds,
      };
    }

    return NextResponse.json({ version, championTraits, traits: traitMap }, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load trait map" }, { status: 502 });
  }
}
