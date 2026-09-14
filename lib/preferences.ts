export const PREFERENCES_KEY = "tft-cn-companion-preferences-v1";

export type TempoPreference = "auto" | "fast8" | "reroll" | "flex";
export type RiskPreference = "safe" | "balanced" | "ceiling";
export type LearningGoal = "consistency" | "top4" | "experiment";
export type OpeningCostPreference = "low" | "all";

export type UserPreferences = {
  tempo: TempoPreference;
  risk: RiskPreference;
  goal: LearningGoal;
  openingCosts: OpeningCostPreference;
  prioritizeFamiliar: boolean;
  preferSimpleExecution: boolean;
  updatedAt: number;
};

export const defaultPreferences: UserPreferences = {
  tempo: "auto",
  risk: "balanced",
  goal: "consistency",
  openingCosts: "low",
  prioritizeFamiliar: true,
  preferSimpleExecution: false,
  updatedAt: 0,
};

export function parsePreferences(value: unknown): UserPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...defaultPreferences };
  const raw = value as Partial<UserPreferences>;
  return {
    tempo: raw.tempo === "fast8" || raw.tempo === "reroll" || raw.tempo === "flex" ? raw.tempo : "auto",
    risk: raw.risk === "safe" || raw.risk === "ceiling" ? raw.risk : "balanced",
    goal: raw.goal === "top4" || raw.goal === "experiment" ? raw.goal : "consistency",
    openingCosts: raw.openingCosts === "all" ? "all" : "low",
    prioritizeFamiliar: typeof raw.prioritizeFamiliar === "boolean" ? raw.prioritizeFamiliar : true,
    preferSimpleExecution: typeof raw.preferSimpleExecution === "boolean" ? raw.preferSimpleExecution : false,
    updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : 0,
  };
}

export function readPreferences(storage: Pick<Storage, "getItem"> | null | undefined): UserPreferences {
  if (!storage) return { ...defaultPreferences };
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    return parsePreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...defaultPreferences };
  }
}
