export type CompTier = "A" | "B" | "ACTIVE";

export type StagePlan = {
  stage: "Stage 2" | "Stage 3" | "Stage 4";
  text: string;
};

export type BoardPosition = {
  unit: string;
  row: 0 | 1 | 2 | 3;
  col: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

export type MetaComp = {
  id: string;
  name: string;
  nameZh: string;
  tier: CompTier;
  patch: string;
  playstyle: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  coreUnits: string[];
  flexUnits: string[];
  itemFocus: string[];
  traits: string[];
  whenToPlay: string;
  keyNotes: string[];
  stages: StagePlan[];
  board: BoardPosition[];
  positioningNote: string;
  source: string;
  sourceUrl: string;
};

// Curated catalog intentionally reset on 2026-09-15.
// New comps will be reintroduced only after source-image review and validation.
export const metaUpdatedAt = "2026-09-15";
export const metaPatch = "18.1d";
export const metaComps: MetaComp[] = [];
