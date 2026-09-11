export const BUILDER_KEY = "tft-cn-companion-builder-v2";
export const LOCAL_IMPORT_KEY = "tft-cn-companion-image-imports-v1";
export const LOCALE_KEY = "tft-cn-companion-locale-v1";
export const AUTO_SYNC_KEY = "tft-cn-companion-auto-sync-v1";
export const WORKSPACE_UPDATED_KEY = "tft-cn-companion-workspace-updated-v1";
export const WORKSPACE_EVENT = "tft-workspace-changed";
export const FOCUS_KEY = "tft-cn-companion-focus-v1";
export const FOCUS_TRAY_KEY = "tft-cn-companion-focus-tray-v1";
export const FOCUS_COMPACT_KEY = "tft-cn-companion-focus-compact-v1";
export const FOCUS_STAGE_OVERRIDES_KEY = "tft-cn-companion-focus-stage-overrides-v1";
export const FOCUS_COMP_STATES_KEY = "tft-cn-companion-focus-comp-states-v1";
export const FAVORITE_COMPS_KEY = "tft-cn-companion-favorite-comps-v1";
export const RECENT_COMPS_KEY = "tft-cn-companion-recent-comps-v1";
export const OPENING_SESSION_KEY = "tft-cn-companion-opening-session-v1";
export const REVIEW_HISTORY_KEY = "tft-cn-companion-review-history-v1";
export const REVIEW_DRAFT_KEY = "tft-cn-companion-review-draft-v1";

export type StoredCompRef = {
  sourceId: string;
  id: string;
  usedAt?: number;
};

export type StoredFocusCompState = {
  stageIndex: number;
  mirrored: boolean;
  updatedAt: number;
};

export type StoredFocusCompStateStore = Record<string, StoredFocusCompState>;

export type WorkspaceSnapshot = {
  version: 1;
  savedAt: number;
  builder: unknown | null;
  imports: unknown[];
  reviews: unknown[];
  favorites: unknown[];
  recents: unknown[];
  focusStates: Record<string, unknown>;
  tray?: unknown[];
  opening?: unknown | null;
  locale: "zh" | "en";
};

function safeParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function builderUpdatedAt(builder: unknown) {
  if (!builder || typeof builder !== "object") return 0;
  const value = Number((builder as { updatedAt?: unknown }).updatedAt);
  return Number.isFinite(value) ? value : 0;
}

export function compRefKey(ref: Pick<StoredCompRef, "sourceId" | "id">) {
  return `${ref.sourceId}:${ref.id}`;
}

export function parseStoredCompRefs(value: unknown, limit = 20): StoredCompRef[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: StoredCompRef[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const ref = entry as Partial<StoredCompRef>;
    if (typeof ref.sourceId !== "string" || typeof ref.id !== "string") continue;
    const key = compRefKey({ sourceId: ref.sourceId, id: ref.id });
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      sourceId: ref.sourceId,
      id: ref.id,
      usedAt: Number.isFinite(Number(ref.usedAt)) ? Number(ref.usedAt) : undefined,
    });
    if (result.length >= limit) break;
  }
  return result;
}

export function parseFocusCompStates(value: unknown): StoredFocusCompStateStore {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: StoredFocusCompStateStore = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const state = raw as Partial<StoredFocusCompState>;
    const stageIndex = Number(state.stageIndex);
    if (!Number.isInteger(stageIndex) || stageIndex < 0) return;
    result[key] = {
      stageIndex,
      mirrored: Boolean(state.mirrored),
      updatedAt: Number.isFinite(Number(state.updatedAt)) ? Number(state.updatedAt) : 0,
    };
  });
  return result;
}

export function readStoredCompRefs(key: string, limit = 20) {
  if (typeof window === "undefined") return [];
  return parseStoredCompRefs(safeParse(window.localStorage.getItem(key)), limit);
}

export function readFocusCompStates() {
  if (typeof window === "undefined") return {};
  return parseFocusCompStates(safeParse(window.localStorage.getItem(FOCUS_COMP_STATES_KEY)));
}

export function rememberRecentComp(ref: Pick<StoredCompRef, "sourceId" | "id">, limit = 8) {
  if (typeof window === "undefined") return;
  const next: StoredCompRef[] = [
    { sourceId: ref.sourceId, id: ref.id, usedAt: Date.now() },
    ...readStoredCompRefs(RECENT_COMPS_KEY, limit).filter((entry) => compRefKey(entry) !== compRefKey(ref)),
  ].slice(0, limit);
  try {
    window.localStorage.setItem(RECENT_COMPS_KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

export function getWorkspaceUpdatedAt() {
  if (typeof window === "undefined") return 0;
  const explicit = Number(window.localStorage.getItem(WORKSPACE_UPDATED_KEY) || 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return builderUpdatedAt(safeParse(window.localStorage.getItem(BUILDER_KEY)));
}

export function readWorkspaceSnapshot(): WorkspaceSnapshot {
  if (typeof window === "undefined") {
    return { version: 1, savedAt: 0, builder: null, imports: [], reviews: [], favorites: [], recents: [], focusStates: {}, tray: [], opening: null, locale: "zh" };
  }
  const builder = safeParse(window.localStorage.getItem(BUILDER_KEY));
  const importsValue = safeParse(window.localStorage.getItem(LOCAL_IMPORT_KEY));
  const reviewsValue = safeParse(window.localStorage.getItem(REVIEW_HISTORY_KEY));
  const favoritesValue = safeParse(window.localStorage.getItem(FAVORITE_COMPS_KEY));
  const recentsValue = safeParse(window.localStorage.getItem(RECENT_COMPS_KEY));
  const focusStatesValue = safeParse(window.localStorage.getItem(FOCUS_COMP_STATES_KEY));
  const trayValue = safeParse(window.localStorage.getItem(FOCUS_TRAY_KEY));
  const openingValue = safeParse(window.localStorage.getItem(OPENING_SESSION_KEY));
  const localeValue = window.localStorage.getItem(LOCALE_KEY);
  return {
    version: 1,
    savedAt: getWorkspaceUpdatedAt(),
    builder,
    imports: Array.isArray(importsValue) ? importsValue : [],
    reviews: Array.isArray(reviewsValue) ? reviewsValue : [],
    favorites: Array.isArray(favoritesValue) ? favoritesValue : [],
    recents: Array.isArray(recentsValue) ? recentsValue : [],
    focusStates: focusStatesValue && typeof focusStatesValue === "object" && !Array.isArray(focusStatesValue) ? focusStatesValue as Record<string, unknown> : {},
    tray: Array.isArray(trayValue) ? trayValue : [],
    opening: openingValue,
    locale: localeValue === "en" ? "en" : "zh",
  };
}

export function writeWorkspaceSnapshot(snapshot: WorkspaceSnapshot) {
  if (typeof window === "undefined") return;
  if (snapshot.builder === null) window.localStorage.removeItem(BUILDER_KEY);
  else window.localStorage.setItem(BUILDER_KEY, JSON.stringify(snapshot.builder));
  window.localStorage.setItem(LOCAL_IMPORT_KEY, JSON.stringify(Array.isArray(snapshot.imports) ? snapshot.imports : []));
  window.localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(Array.isArray(snapshot.reviews) ? snapshot.reviews : []));
  window.localStorage.setItem(FAVORITE_COMPS_KEY, JSON.stringify(Array.isArray(snapshot.favorites) ? snapshot.favorites : []));
  window.localStorage.setItem(RECENT_COMPS_KEY, JSON.stringify(Array.isArray(snapshot.recents) ? snapshot.recents : []));
  window.localStorage.setItem(FOCUS_COMP_STATES_KEY, JSON.stringify(snapshot.focusStates && typeof snapshot.focusStates === "object" ? snapshot.focusStates : {}));
  window.localStorage.setItem(FOCUS_TRAY_KEY, JSON.stringify(Array.isArray(snapshot.tray) ? snapshot.tray : []));
  if (snapshot.opening === null || snapshot.opening === undefined) window.localStorage.removeItem(OPENING_SESSION_KEY);
  else window.localStorage.setItem(OPENING_SESSION_KEY, JSON.stringify(snapshot.opening));
  window.localStorage.setItem(LOCALE_KEY, snapshot.locale === "en" ? "en" : "zh");
  window.localStorage.setItem(WORKSPACE_UPDATED_KEY, String(snapshot.savedAt || Date.now()));
  window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: { restored: true } }));
}

export function markWorkspaceChanged() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  try {
    window.localStorage.setItem(WORKSPACE_UPDATED_KEY, String(now));
  } catch {
    // The local UI still works when persistence is blocked.
  }
  window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: { savedAt: now } }));
}
