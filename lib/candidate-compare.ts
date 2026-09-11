import type { UnifiedMetaComp } from "@/data/meta";
import type { CatalogEntry } from "@/data/tft";

export type CandidateSnapshot = {
  comp: UnifiedMetaComp;
  core: CatalogEntry[];
  flex: CatalogEntry[];
  recommendedItems: CatalogEntry[];
  rollLevel: number | null;
};

export type TransitionAssessment = {
  score: number;
  band: "LOW" | "MEDIUM" | "HIGH";
  sharedUnits: CatalogEntry[];
  sharedCore: CatalogEntry[];
  sharedItems: CatalogEntry[];
  sameTempo: boolean;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function aliases(entry: CatalogEntry) {
  return [entry.id, entry.nameEn, entry.nameZh, ...(entry.aliases ?? [])]
    .filter(Boolean)
    .map(normalize);
}

function buildLookup(entries: CatalogEntry[]) {
  const map = new Map<string, CatalogEntry>();
  entries.forEach((entry) => aliases(entry).forEach((alias) => map.set(alias, entry)));
  return map;
}

function resolveNames(names: string[], lookup: Map<string, CatalogEntry>) {
  return names
    .map((name) => lookup.get(normalize(name)))
    .filter((entry): entry is CatalogEntry => Boolean(entry))
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index);
}

function extractRecommendedItems(comp: UnifiedMetaComp, items: CatalogEntry[]) {
  const text = normalize([...comp.itemFocus, ...comp.keyNotes].join(" "));
  return items
    .filter((item) => item.subtype !== "component" && item.subtype !== "tactician")
    .filter((item) => aliases(item).some((alias) => alias.length >= 3 && text.includes(alias)))
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index);
}

function deriveRollLevel(comp: UnifiedMetaComp) {
  const stageText = [...comp.stages].reverse().map((stage) => stage.text).join(" ");
  const match = stageText.match(/(?:level|lv\.?)[\s-]*([5-9])|([5-9])\s*级|([5-9])级/i);
  const value = Number(match?.[1] ?? match?.[2] ?? match?.[3]);
  return Number.isFinite(value) ? value : null;
}

function tempoFamily(playstyle: string) {
  const value = normalize(playstyle);
  if (value.includes("reroll")) return "reroll";
  if (value.includes("fast 8") || value.includes("fast8")) return "fast8";
  if (value.includes("fast 9") || value.includes("fast9")) return "fast9";
  return value;
}

function intersectById(left: CatalogEntry[], right: CatalogEntry[]) {
  const rightIds = new Set(right.map((entry) => entry.id));
  return left.filter((entry) => rightIds.has(entry.id));
}

export function buildCandidateSnapshots(comps: UnifiedMetaComp[], champions: CatalogEntry[], items: CatalogEntry[]): CandidateSnapshot[] {
  const championLookup = buildLookup(champions);
  return comps.map((comp) => ({
    comp,
    core: resolveNames(comp.coreUnits, championLookup),
    flex: resolveNames(comp.flexUnits, championLookup),
    recommendedItems: extractRecommendedItems(comp, items),
    rollLevel: deriveRollLevel(comp),
  }));
}

export function sharedChampionsAcrossAll(snapshots: CandidateSnapshot[]) {
  if (!snapshots.length) return [];
  return snapshots.slice(1).reduce(
    (shared, snapshot) => intersectById(shared, [...snapshot.core, ...snapshot.flex]),
    [...snapshots[0].core, ...snapshots[0].flex],
  );
}

export function sharedItemsAcrossAll(snapshots: CandidateSnapshot[]) {
  if (!snapshots.length) return [];
  return snapshots.slice(1).reduce(
    (shared, snapshot) => intersectById(shared, snapshot.recommendedItems),
    [...snapshots[0].recommendedItems],
  );
}

export function uniqueChampionsFor(snapshot: CandidateSnapshot, snapshots: CandidateSnapshot[]) {
  const otherIds = new Set(
    snapshots
      .filter((candidate) => candidate.comp.sourceId !== snapshot.comp.sourceId || candidate.comp.id !== snapshot.comp.id)
      .flatMap((candidate) => [...candidate.core, ...candidate.flex])
      .map((entry) => entry.id),
  );
  return [...snapshot.core, ...snapshot.flex].filter((entry) => !otherIds.has(entry.id));
}

export function assessTransition(from: CandidateSnapshot, to: CandidateSnapshot): TransitionAssessment {
  const fromUnits = [...from.core, ...from.flex];
  const toUnits = [...to.core, ...to.flex];
  const sharedUnits = intersectById(fromUnits, toUnits);
  const sharedCore = intersectById(from.core, to.core);
  const sharedItems = intersectById(from.recommendedItems, to.recommendedItems);
  const sameTempo = tempoFamily(from.comp.playstyle) === tempoFamily(to.comp.playstyle);
  const score = Math.min(100,
    sharedUnits.length * 10
    + sharedCore.length * 8
    + sharedItems.length * 18
    + (sameTempo ? 16 : 0),
  );
  const band: TransitionAssessment["band"] = score >= 55 ? "LOW" : score >= 30 ? "MEDIUM" : "HIGH";
  return { score, band, sharedUnits, sharedCore, sharedItems, sameTempo };
}
