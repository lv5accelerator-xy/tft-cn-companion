import snapshot from "./rankings.generated.json";
import { metaComps, type UnifiedMetaComp } from "./meta";

export type RankingSourceId = "tft-academy" | "metatft";
export type RankingEntry = {
  id: string; sourceId: RankingSourceId; name: string; nameZh: string;
  tier: string; conditionalTier: string | null; trend: string | null;
  url: string; units: string[]; patch: string;
  stats: { averagePlacement: number; top4Rate: number; winRate: number } | null;
};
export const rankingSnapshot = snapshot;
export const rankingEntries = snapshot.records as RankingEntry[];
export const rankingSources = snapshot.sources;

function matchesGuide(ref: (typeof snapshot.groups)[number]["guides"][number], comp: UnifiedMetaComp) {
  return comp.syncOrigin !== "manual" && ref.sourceId === comp.sourceId && ref.id === comp.id && ref.patch === comp.patch
    && JSON.stringify(ref.units) === JSON.stringify([...comp.coreUnits, ...comp.flexUnits].sort());
}

export function rankingGroupForComp(comp: UnifiedMetaComp) {
  return snapshot.groups.find(group => group.guides.some(ref => matchesGuide(ref, comp)));
}

export function comparisonsForComp(comp: UnifiedMetaComp) {
  const group = rankingGroupForComp(comp);
  return group ? rankingEntries.filter(entry => group.entries.includes(entry.id)) : [];
}

export function relatedGuides(comp: UnifiedMetaComp) {
  const group = rankingGroupForComp(comp);
  return group ? metaComps.filter(guide => group.guides.some(ref => matchesGuide(ref, guide))) : [comp];
}

// Reviewed references are bounded by patch AND lineup, never fuzzy name matching.
export function groupCompGuides(comps: UnifiedMetaComp[]) {
  const groups = new Map<string, UnifiedMetaComp[]>();
  for (const comp of comps) {
    const key = rankingGroupForComp(comp)?.id ?? `${comp.sourceId}:${comp.id}:${comp.patch}`;
    groups.set(key, [...(groups.get(key) ?? []), comp]);
  }
  return [...groups.values()].map(guides => guides.find(comp => comp.sourceId === "tuding") ?? guides[0]);
}

export const rankedGroups = (() => {
  const result = new Map<string, { id: string; entries: RankingEntry[]; guides: UnifiedMetaComp[] }>();
  for (const entry of rankingEntries) {
    const reviewed = snapshot.groups.find(group => group.entries.includes(entry.id));
    const id = reviewed?.id ?? `${entry.sourceId}:${entry.id}`;
    const group = result.get(id) ?? { id, entries: [], guides: reviewed ? metaComps.filter(comp => reviewed.guides.some(ref => matchesGuide(ref, comp))) : [] };
    group.entries.push(entry);
    result.set(id, group);
  }
  return [...result.values()];
})();
