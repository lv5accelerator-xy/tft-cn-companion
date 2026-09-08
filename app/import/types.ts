export type Carry = {
  unit: string;
  role: "CARRY" | "TANK" | "SECONDARY";
  items: string[];
  alternatives: string[];
};

export type AnalysisComp = {
  nameZh: string;
  nameEn: string;
  tier: "S" | "A" | "B" | "ACTIVE";
  playstyle: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  coreUnits: string[];
  flexUnits: string[];
  itemFocus: string[];
  traits: string[];
  augments: string[];
  whenToPlay: string;
  keyNotes: string[];
  stages: Array<{ stage: "Stage 2" | "Stage 3" | "Stage 4"; text: string }>;
  board: Array<{ unit: string; row: number; col: number }>;
  positioningNote: string;
  compCode: string;
  carries: Carry[];
  confidence: number;
  warnings: string[];
};

export type AnalysisResult = {
  gameMode: "TFT" | "GOLDEN_SPATULA" | "UNKNOWN";
  sourceName: string;
  patch: string;
  articleTitle: string;
  summary: string;
  warnings: string[];
  comps: AnalysisComp[];
};
