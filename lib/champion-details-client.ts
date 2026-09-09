import type { CatalogEntry } from "@/data/tft";
import type { ChampionDetail, ChampionDetailsPayload } from "@/data/champion-details";

export type ChampionDetailIndex = {
  byId: Map<string, ChampionDetail>;
  byName: Map<string, ChampionDetail>;
};

const cache = new Map<"zh" | "en", Promise<ChampionDetailIndex>>();

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’']/g, "").replace(/\s+/g, " ");
}

export function loadChampionDetails(locale: "zh" | "en") {
  const existing = cache.get(locale);
  if (existing) return existing;

  const request = fetch(`/api/tft/champion-details?locale=${locale}`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Champion detail request failed: ${response.status}`);
      return response.json() as Promise<ChampionDetailsPayload>;
    })
    .then((payload) => {
      const byId = new Map<string, ChampionDetail>();
      const byName = new Map<string, ChampionDetail>();
      for (const champion of payload.champions) {
        byId.set(normalize(champion.id), champion);
        byName.set(normalize(champion.name), champion);
      }
      return { byId, byName };
    });

  cache.set(locale, request);
  request.catch(() => cache.delete(locale));
  return request;
}

export function detailForEntry(index: ChampionDetailIndex | null, entry: CatalogEntry) {
  if (!index) return null;
  return index.byId.get(normalize(entry.id))
    ?? index.byName.get(normalize(entry.nameEn))
    ?? index.byName.get(normalize(entry.nameZh))
    ?? null;
}
