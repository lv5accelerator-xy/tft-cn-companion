export const BUILDER_KEY = "tft-cn-companion-builder-v2";
export const LOCAL_IMPORT_KEY = "tft-cn-companion-image-imports-v1";
export const LOCALE_KEY = "tft-cn-companion-locale-v1";
export const AUTO_SYNC_KEY = "tft-cn-companion-auto-sync-v1";
export const WORKSPACE_UPDATED_KEY = "tft-cn-companion-workspace-updated-v1";
export const WORKSPACE_EVENT = "tft-workspace-changed";
export const FOCUS_KEY = "tft-cn-companion-focus-v1";

export type WorkspaceSnapshot = {
  version: 1;
  savedAt: number;
  builder: unknown | null;
  imports: unknown[];
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

export function getWorkspaceUpdatedAt() {
  if (typeof window === "undefined") return 0;
  const explicit = Number(window.localStorage.getItem(WORKSPACE_UPDATED_KEY) || 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return builderUpdatedAt(safeParse(window.localStorage.getItem(BUILDER_KEY)));
}

export function readWorkspaceSnapshot(): WorkspaceSnapshot {
  if (typeof window === "undefined") {
    return { version: 1, savedAt: 0, builder: null, imports: [], locale: "zh" };
  }
  const builder = safeParse(window.localStorage.getItem(BUILDER_KEY));
  const importsValue = safeParse(window.localStorage.getItem(LOCAL_IMPORT_KEY));
  const localeValue = window.localStorage.getItem(LOCALE_KEY);
  return {
    version: 1,
    savedAt: getWorkspaceUpdatedAt(),
    builder,
    imports: Array.isArray(importsValue) ? importsValue : [],
    locale: localeValue === "en" ? "en" : "zh",
  };
}

export function writeWorkspaceSnapshot(snapshot: WorkspaceSnapshot) {
  if (typeof window === "undefined") return;
  if (snapshot.builder === null) window.localStorage.removeItem(BUILDER_KEY);
  else window.localStorage.setItem(BUILDER_KEY, JSON.stringify(snapshot.builder));
  window.localStorage.setItem(LOCAL_IMPORT_KEY, JSON.stringify(Array.isArray(snapshot.imports) ? snapshot.imports : []));
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
