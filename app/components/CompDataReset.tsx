"use client";

import { useEffect } from "react";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import {
  FAVORITE_COMPS_KEY,
  FOCUS_COMP_STATES_KEY,
  FOCUS_KEY,
  FOCUS_STAGE_OVERRIDES_KEY,
  FOCUS_TRAY_KEY,
  LOCAL_IMPORT_KEY,
  RECENT_COMPS_KEY,
  WORKSPACE_EVENT,
  WORKSPACE_UPDATED_KEY,
  compRefKey,
} from "@/lib/workspace";

type CompRef = { sourceId: string; id: string };

const DATA_PATCH = "18.2";
const DATA_CUTOFF = "2026-09-15";

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw) as unknown; } catch { return null; }
}

function isRef(value: unknown): value is CompRef {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const ref = value as Partial<CompRef>;
  return typeof ref.sourceId === "string" && typeof ref.id === "string";
}

function isCurrentManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const comp = value as Partial<UnifiedMetaComp>;
  if (comp.gameMode !== "TFT" || comp.syncOrigin !== "manual") return false;
  if (typeof comp.sourceId !== "string" || typeof comp.id !== "string") return false;
  if (comp.patch !== DATA_PATCH || String(comp.sourceUpdatedAt ?? "") < DATA_CUTOFF) return false;

  const name = `${comp.name ?? ""} ${comp.nameZh ?? ""}`.toLocaleLowerCase("en-US");
  // The reviewed 18.2 德子九五 now lives in the official 兔顶之弈 feed.
  // Never let an older/manual Draven Fast 9 shadow or duplicate that canonical record.
  if (name.includes("德子九五") || name.includes("draven fast 9") || name.includes("draven fast9")) return false;
  return true;
}

function writeJsonIfChanged(key: string, value: unknown) {
  const next = JSON.stringify(value);
  if (window.localStorage.getItem(key) === next) return false;
  window.localStorage.setItem(key, next);
  return true;
}

function cleanupCompData() {
  let changed = false;
  const rawImports = safeParse(window.localStorage.getItem(LOCAL_IMPORT_KEY));
  const imports = Array.isArray(rawImports) ? rawImports.filter(isCurrentManualComp) : [];
  if (Array.isArray(rawImports) || window.localStorage.getItem(LOCAL_IMPORT_KEY)) {
    changed = writeJsonIfChanged(LOCAL_IMPORT_KEY, imports) || changed;
  }

  const allowed = new Set(metaComps.map((comp) => compRefKey(comp)));
  imports.forEach((comp) => allowed.add(compRefKey(comp)));
  const allowedRef = (value: unknown) => isRef(value) && allowed.has(compRefKey(value));

  for (const key of [FAVORITE_COMPS_KEY, RECENT_COMPS_KEY]) {
    const raw = safeParse(window.localStorage.getItem(key));
    if (!Array.isArray(raw)) continue;
    changed = writeJsonIfChanged(key, raw.filter(allowedRef)) || changed;
  }

  const rawTray = safeParse(window.localStorage.getItem(FOCUS_TRAY_KEY));
  if (Array.isArray(rawTray)) {
    const tray = [0, 1, 2].map((index) => allowedRef(rawTray[index]) ? rawTray[index] : null);
    changed = writeJsonIfChanged(FOCUS_TRAY_KEY, tray) || changed;
  }

  for (const key of [FOCUS_COMP_STATES_KEY, FOCUS_STAGE_OVERRIDES_KEY]) {
    const raw = safeParse(window.localStorage.getItem(key));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const filtered = Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([refKey]) => allowed.has(refKey)));
    changed = writeJsonIfChanged(key, filtered) || changed;
  }

  const focus = safeParse(window.localStorage.getItem(FOCUS_KEY));
  if (focus && !allowedRef(focus)) {
    window.localStorage.removeItem(FOCUS_KEY);
    changed = true;
  }

  if (changed) window.localStorage.setItem(WORKSPACE_UPDATED_KEY, String(Date.now()));
  return changed;
}

export default function CompDataReset() {
  useEffect(() => {
    let reloading = false;
    const run = () => {
      if (reloading) return;
      try {
        if (cleanupCompData()) {
          reloading = true;
          window.setTimeout(() => window.location.reload(), 40);
        }
      } catch {
        // Data cleanup must never block the application when storage is unavailable.
      }
    };

    run();
    window.addEventListener(WORKSPACE_EVENT, run);
    return () => window.removeEventListener(WORKSPACE_EVENT, run);
  }, []);

  return null;
}
