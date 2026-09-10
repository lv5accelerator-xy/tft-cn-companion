import type { UnifiedMetaComp } from "@/data/meta";
import type { CatalogEntry, Recipe } from "@/data/tft";

export type OpeningChampionPick = { id: string; count: number };
export type OpeningComponentPick = { nameEn: string; count: number };

export type OpeningCompMatch = {
  comp: UnifiedMetaComp;
  score: number;
  unitScore: number;
  itemScore: number;
  metaScore: number;
  coreMatches: Array<{ champion: CatalogEntry; count: number }>;
  flexMatches: Array<{ champion: CatalogEntry; count: number }>;
  craftableItemMatches: CatalogEntry[];
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function aliases(entry: CatalogEntry) {
  return [entry.id, entry.nameEn, entry.nameZh, ...(entry.aliases ?? [])].filter(Boolean).map(normalize);
}

function canCraft(recipe: Recipe, counts: Map<string, number>) {
  const a = normalize(recipe.a);
  const b = normalize(recipe.b);
  if (a === b) return (counts.get(a) ?? 0) >= 2;
  return (counts.get(a) ?? 0) >= 1 && (counts.get(b) ?? 0) >= 1;
}

export function rankOpeningComps({
  comps,
  champions,
  items,
  recipes,
  championPicks,
  componentPicks,
}: {
  comps: UnifiedMetaComp[];
  champions: CatalogEntry[];
  items: CatalogEntry[];
  recipes: Recipe[];
  championPicks: OpeningChampionPick[];
  componentPicks: OpeningComponentPick[];
}): OpeningCompMatch[] {
  const championLookup = new Map<string, CatalogEntry>();
  champions.forEach((champion) => aliases(champion).forEach((alias) => championLookup.set(alias, champion)));
  const itemLookup = new Map<string, CatalogEntry>();
  items.forEach((item) => aliases(item).forEach((alias) => itemLookup.set(alias, item)));

  const selectedChampions = championPicks
    .map((pick) => ({ champion: championLookup.get(normalize(pick.id)), count: Math.max(1, Math.min(3, Math.round(pick.count))) }))
    .filter((entry): entry is { champion: CatalogEntry; count: number } => Boolean(entry.champion));
  const componentCounts = new Map(componentPicks.map((pick) => [normalize(pick.nameEn), Math.max(1, Math.min(4, Math.round(pick.count)))]));
  const craftable = recipes
    .filter((recipe) => canCraft(recipe, componentCounts))
    .map((recipe) => itemLookup.get(normalize(recipe.result)))
    .filter((entry): entry is CatalogEntry => Boolean(entry))
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index);

  const totalChampionCopies = selectedChampions.reduce((sum, entry) => sum + entry.count, 0);
  const totalComponents = componentPicks.reduce((sum, entry) => sum + entry.count, 0);
  const hasSignals = totalChampionCopies > 0 || totalComponents > 0;

  return comps.map((comp) => {
    const coreNames = new Set(comp.coreUnits.map(normalize));
    const flexNames = new Set(comp.flexUnits.map(normalize));
    const coreMatches: OpeningCompMatch["coreMatches"] = [];
    const flexMatches: OpeningCompMatch["flexMatches"] = [];
    let unitScore = 0;

    selectedChampions.forEach(({ champion, count }) => {
      const names = aliases(champion);
      if (names.some((name) => coreNames.has(name))) {
        coreMatches.push({ champion, count });
        unitScore += 16 + Math.min(2, count - 1) * 7;
      } else if (names.some((name) => flexNames.has(name))) {
        flexMatches.push({ champion, count });
        unitScore += 8 + Math.min(2, count - 1) * 3;
      }
    });
    unitScore = Math.min(54, unitScore);

    const itemText = normalize([...comp.itemFocus, ...comp.keyNotes].join(" "));
    const craftableItemMatches = craftable.filter((item) => aliases(item).some((alias) => alias.length >= 3 && itemText.includes(alias)));
    let itemScore = Math.min(32, craftableItemMatches.length * 11);
    componentPicks.forEach((pick) => {
      const component = itemLookup.get(normalize(pick.nameEn));
      if (component && aliases(component).some((alias) => alias.length >= 3 && itemText.includes(alias))) itemScore += 3;
    });
    itemScore = Math.min(35, itemScore);

    const metaScore = comp.tier === "S" ? 8 : comp.tier === "A" ? 6 : comp.tier === "ACTIVE" ? 5 : 3;
    const denominator = Math.max(1,
      Math.min(54, totalChampionCopies * 16)
      + (totalComponents >= 2 ? 35 : totalComponents * 8)
      + 8,
    );
    const score = hasSignals ? Math.min(96, Math.round(((unitScore + itemScore + metaScore) / denominator) * 100)) : 0;

    return { comp, score, unitScore, itemScore, metaScore, coreMatches, flexMatches, craftableItemMatches };
  }).sort((left, right) => right.score - left.score || right.unitScore - left.unitScore || right.itemScore - left.itemScore || right.metaScore - left.metaScore);
}
