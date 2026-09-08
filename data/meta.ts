import { metaComps as curatedMetaComps, metaPatch, metaUpdatedAt, type BoardPosition, type MetaComp, type StagePlan } from "./comps";
import { liveMetaSnapshot } from "./live-meta";
import { getMetaSource, isBlockedGoldenSpatulaText, type MetaSourceId } from "./meta-sources";

export type UnifiedCompTier = "S" | "A" | "B" | "ACTIVE";

export type UnifiedMetaComp = Omit<MetaComp, "tier"> & {
  tier: UnifiedCompTier;
  sourceId: MetaSourceId;
  sourcePublishedAt: string;
  sourceUpdatedAt: string;
  sourceArticleTitle: string;
  gameMode: "TFT";
  syncOrigin: "curated" | "feed" | "manual";
};

function normalizeBoard(positions: Array<{ unit: string; row: number; col: number }>): BoardPosition[] {
  return positions
    .filter((position) => position.row >= 0 && position.row <= 3 && position.col >= 0 && position.col <= 6)
    .map((position) => ({
      unit: position.unit,
      row: position.row as BoardPosition["row"],
      col: position.col as BoardPosition["col"],
    }));
}

function isTftOnlyComp(comp: {
  name: string;
  nameZh: string;
  articleTitle?: string;
  whenToPlay?: string;
  keyNotes?: string[];
  gameMode?: string;
}) {
  if (comp.gameMode && comp.gameMode !== "TFT") return false;
  const text = [comp.name, comp.nameZh, comp.articleTitle ?? "", comp.whenToPlay ?? "", ...(comp.keyNotes ?? [])].join(" ");
  return !isBlockedGoldenSpatulaText(text);
}

const curated: UnifiedMetaComp[] = curatedMetaComps
  .map((comp) => ({
    ...comp,
    sourceId: "tft-academy" as const,
    sourcePublishedAt: metaUpdatedAt,
    sourceUpdatedAt: metaUpdatedAt,
    sourceArticleTitle: `${comp.name} · Patch ${comp.patch}`,
    gameMode: "TFT" as const,
    syncOrigin: "curated" as const,
  }))
  .filter(isTftOnlyComp);

const live: UnifiedMetaComp[] = liveMetaSnapshot.records
  .filter(isTftOnlyComp)
  .map((record) => {
    const source = getMetaSource(record.sourceId);
    return {
      id: record.id,
      name: record.name,
      nameZh: record.nameZh,
      tier: record.tier,
      patch: record.patch,
      playstyle: record.playstyle,
      difficulty: record.difficulty,
      coreUnits: record.coreUnits,
      flexUnits: record.flexUnits,
      itemFocus: record.itemFocus,
      traits: record.traits,
      whenToPlay: record.whenToPlay,
      keyNotes: record.keyNotes,
      stages: record.stages as StagePlan[],
      board: normalizeBoard(record.board),
      positioningNote: record.positioningNote,
      source: source?.name ?? record.sourceId,
      sourceUrl: record.articleUrl,
      sourceId: record.sourceId,
      sourcePublishedAt: record.publishedAt,
      sourceUpdatedAt: record.updatedAt,
      sourceArticleTitle: record.articleTitle,
      gameMode: "TFT" as const,
      syncOrigin: "feed" as const,
    };
  });

function dedupeComps(comps: UnifiedMetaComp[]) {
  const seen = new Set<string>();
  return comps.filter((comp) => {
    const key = `${comp.sourceId}:${comp.id}:${comp.patch}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const metaComps = dedupeComps([...live, ...curated]);
export { metaPatch, metaUpdatedAt };

export function compsForSource(sourceId: MetaSourceId | "all") {
  if (sourceId === "all") return metaComps;
  return metaComps.filter((comp) => comp.sourceId === sourceId);
}
