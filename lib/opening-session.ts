import type { OpeningChampionPick, OpeningComponentPick } from "@/lib/opening-assistant";

export type OpeningSession = {
  championPicks: OpeningChampionPick[];
  componentPicks: OpeningComponentPick[];
  updatedAt: number;
};

export function parseOpeningSession(value: unknown): OpeningSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { championPicks: [], componentPicks: [], updatedAt: 0 };
  }
  const raw = value as Partial<OpeningSession>;
  const championPicks = Array.isArray(raw.championPicks)
    ? raw.championPicks
        .filter((entry): entry is OpeningChampionPick => Boolean(entry && typeof entry.id === "string" && Number.isFinite(Number(entry.count))))
        .map((entry) => ({ id: entry.id, count: Math.max(1, Math.min(3, Math.round(Number(entry.count)))) }))
    : [];
  const componentPicks = Array.isArray(raw.componentPicks)
    ? raw.componentPicks
        .filter((entry): entry is OpeningComponentPick => Boolean(entry && typeof entry.nameEn === "string" && Number.isFinite(Number(entry.count))))
        .map((entry) => ({ nameEn: entry.nameEn, count: Math.max(1, Math.min(4, Math.round(Number(entry.count)))) }))
    : [];
  return {
    championPicks,
    componentPicks,
    updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : 0,
  };
}
