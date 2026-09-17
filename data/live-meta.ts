import opggSnapshot from "./opgg-meta.generated.json";
import generatedSnapshot from "./live-meta.generated.json";
import type { MetaSourceId } from "./meta-sources";

export type LiveBoardPosition = {
  unit: string;
  row: number;
  col: number;
};

export type LiveStagePlan = {
  stage: "Stage 2" | "Stage 3" | "Stage 4";
  text: string;
};

export type CompRanking = {
  sourceTier: "OP" | "S" | "A";
  sourceOrder: number;
  averagePlacement: number;
  winRate: number;
  top4Rate: number;
  pickRate: number;
  games: number;
  totalGames: number;
  capturedAt: string;
  sourceUpdatedLabel: string;
  scope: string;
  statisticsBasis: string;
  teamCode: string;
};

export type LiveMetaRecord = {
  ranking?: CompRanking;
  id: string;
  sourceId: MetaSourceId;
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  publishedAt: string;
  updatedAt: string;
  contentHash: string;
  patch: string;
  name: string;
  nameZh: string;
  tier: "S" | "A" | "B" | "ACTIVE";
  playstyle: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  coreUnits: string[];
  flexUnits: string[];
  itemFocus: string[];
  traits: string[];
  whenToPlay: string;
  keyNotes: string[];
  stages: LiveStagePlan[];
  board: LiveBoardPosition[];
  positioningNote: string;
  gameMode: "TFT";
};

export type LiveArticle = {
  id: string;
  sourceId: MetaSourceId;
  title: string;
  url: string;
  publishedAt: string;
  updatedAt: string;
  contentHash: string;
  status: "synced" | "parsed" | "filtered" | "error";
  gameMode: "TFT";
};

export type LiveSourceState = {
  sourceId: MetaSourceId;
  status: "awaiting_feed" | "ready" | "error" | "curated";
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  message: string;
};

export type LiveMetaSnapshot = {
  schemaVersion: 1;
  generatedAt: string | null;
  sourceStates: LiveSourceState[];
  articles: LiveArticle[];
  records: LiveMetaRecord[];
};

// scripts/sync-meta-sources.mjs updates only the JSON file. External feeds are never required during a Next.js build.
export const liveMetaSnapshot: LiveMetaSnapshot = {
  schemaVersion: 1,
  generatedAt: [generatedSnapshot.generatedAt, opggSnapshot.generatedAt].sort().at(-1) ?? null,
  sourceStates: [...opggSnapshot.sourceStates, ...generatedSnapshot.sourceStates] as LiveSourceState[],
  articles: [...opggSnapshot.articles, ...generatedSnapshot.articles] as LiveArticle[],
  records: [...opggSnapshot.records, ...generatedSnapshot.records] as LiveMetaRecord[],
};
