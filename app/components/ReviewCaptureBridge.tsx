"use client";

import { useEffect } from "react";
import type { BoardPosition } from "@/data/comps";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { deriveStageBoardPlans } from "@/lib/stage-board";
import { deriveTacticalBoardPlan, type TacticalRole } from "@/lib/tactical-board";
import type { ReviewDraft, ReviewRef } from "@/lib/review";
import {
  BUILDER_KEY,
  FOCUS_KEY,
  FOCUS_STAGE_OVERRIDES_KEY,
  FOCUS_TRAY_KEY,
  LOCAL_IMPORT_KEY,
  REVIEW_DRAFT_KEY,
  markWorkspaceChanged,
} from "@/lib/workspace";

type FocusState = { sourceId?: string; id?: string; stageIndex?: number; mirrored?: boolean; updatedAt?: number };
type StageOverride = { rolesByName?: Record<string, TacticalRole>; itemsByName?: Record<string, string[]> };
type StageOverrideStore = Record<string, Record<string, StageOverride>>;
type BuilderSnapshot = {
  name?: string;
  sourceId?: string;
  sourceCompId?: string;
  stage?: string;
  board?: BoardPosition[];
  items?: Record<string, string[]>;
  roles?: Record<string, TacticalRole>;
  itemsByName?: Record<string, string[]>;
  rolesByName?: Record<string, TacticalRole>;
  updatedAt?: number;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw) as unknown; } catch { return null; }
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.sourceId === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.board);
}

function isBoardPosition(value: unknown): value is BoardPosition {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<BoardPosition>;
  return typeof entry.unit === "string" && Number.isInteger(entry.row) && Number(entry.row) >= 0 && Number(entry.row) <= 3 && Number.isInteger(entry.col) && Number(entry.col) >= 0 && Number(entry.col) <= 6;
}

function parseCandidateRefs(value: unknown): ReviewRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => entry as Partial<ReviewRef>)
    .filter((entry): entry is ReviewRef => typeof entry.sourceId === "string" && typeof entry.id === "string")
    .slice(0, 3);
}

function parseLevelHint(value: string) {
  const matches = value.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];
  return Math.min(10, Math.max(4, matches.at(-1) ?? 8));
}

export default function ReviewCaptureBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") !== "1") return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/tft", { cache: "no-store" });
        if (!response.ok) throw new Error(`catalog ${response.status}`);
        const catalog = await response.json() as TftCatalogPayload;
        if (cancelled) return;

        const importedValue = safeParse(window.localStorage.getItem(LOCAL_IMPORT_KEY));
        const localComps = Array.isArray(importedValue) ? importedValue.filter(isManualComp) : [];
        const allComps = [...localComps, ...metaComps];
        const focus = (safeParse(window.localStorage.getItem(FOCUS_KEY)) ?? {}) as FocusState;
        if (!focus.sourceId || !focus.id) {
          window.location.replace("/review");
          return;
        }
        const comp = allComps.find((entry) => entry.sourceId === focus.sourceId && entry.id === focus.id);
        if (!comp) {
          window.location.replace("/review");
          return;
        }

        const champions = catalog.champions ?? [];
        const items = catalog.items ?? [];
        const championLookup = new Map<string, CatalogEntry>();
        champions.forEach((champion) => [champion.id, champion.nameEn, champion.nameZh, ...(champion.aliases ?? [])].forEach((name) => { if (name) championLookup.set(normalize(name), champion); }));
        const itemLookup = new Map<string, CatalogEntry>();
        items.forEach((item) => [item.id, item.nameEn, item.nameZh, ...(item.aliases ?? [])].forEach((name) => { if (name) itemLookup.set(normalize(name), item); }));

        const tactical = deriveTacticalBoardPlan(comp, champions, items);
        const stagePlans = deriveStageBoardPlans(comp, champions, tactical);
        const stageIndex = Math.max(0, Math.min(Number(focus.stageIndex) || 0, Math.max(0, stagePlans.length - 1)));
        const stagePlan = stagePlans[stageIndex] ?? stagePlans.at(-1);
        const activeStage = comp.stages[stageIndex] ?? comp.stages.at(-1);
        const overrideValue = safeParse(window.localStorage.getItem(FOCUS_STAGE_OVERRIDES_KEY));
        const overrideStore = overrideValue && typeof overrideValue === "object" && !Array.isArray(overrideValue) ? overrideValue as StageOverrideStore : {};
        const override = activeStage ? overrideStore[`${comp.sourceId}:${comp.id}`]?.[activeStage.stage] : undefined;
        const mirrored = Boolean(focus.mirrored);
        const focusBoard = (stagePlan?.board ?? comp.board).map((position) => mirrored ? { ...position, col: (6 - position.col) as BoardPosition["col"] } : { ...position });
        let finalBoard = focusBoard;
        let rolesByName = { ...(override?.rolesByName ?? stagePlan?.rolesByName ?? tactical.rolesByName) };
        let itemsByName = Object.fromEntries(Object.entries(override?.itemsByName ?? stagePlan?.itemsByName ?? tactical.itemsByName).map(([unit, values]) => [unit, [...values].slice(0, 3)]));
        let captureSource: ReviewDraft["captureSource"] = "focus";
        let focusStage: ReviewDraft["focusStage"] = activeStage?.stage ?? stagePlan?.stage ?? "Stage 4";

        const builderValue = safeParse(window.localStorage.getItem(BUILDER_KEY));
        const builder = builderValue && typeof builderValue === "object" && !Array.isArray(builderValue) ? builderValue as BuilderSnapshot : null;
        const builderBoard = builder?.board?.filter(isBoardPosition) ?? [];
        const builderName = normalize(builder?.name ?? "");
        const compNames = [comp.name, comp.nameZh].map(normalize).filter(Boolean);
        const builderMatches = Boolean(builder && ((builder.sourceId === comp.sourceId && builder.sourceCompId === comp.id) || compNames.some((name) => name.length >= 2 && builderName.includes(name))));
        const focusUpdatedAt = Number(focus.updatedAt) || 0;
        const builderUpdatedAt = Number(builder?.updatedAt) || 0;

        if (builder && builderMatches && builderBoard.length && builderUpdatedAt >= focusUpdatedAt) {
          finalBoard = builderBoard.map((position) => {
            const champion = championLookup.get(normalize(position.unit));
            return champion ? { ...position, unit: champion.nameEn } : { ...position };
          });
          const nextRoles: Record<string, TacticalRole> = {};
          [builder.roles ?? {}, builder.rolesByName ?? {}].forEach((source) => Object.entries(source).forEach(([key, role]) => {
            const champion = championLookup.get(normalize(key));
            if (champion && (role === "CARRY" || role === "TANK" || role === "SECONDARY" || role === "FLEX")) nextRoles[champion.nameEn] = role;
          }));
          const nextItems: Record<string, string[]> = {};
          [builder.items ?? {}, builder.itemsByName ?? {}].forEach((source) => Object.entries(source).forEach(([key, values]) => {
            const champion = championLookup.get(normalize(key));
            if (!champion || !Array.isArray(values)) return;
            const resolved = values.map((value) => itemLookup.get(normalize(value))?.nameEn ?? value).filter(Boolean).slice(0, 3);
            if (resolved.length) nextItems[champion.nameEn] = Array.from(new Set(resolved));
          }));
          if (Object.keys(nextRoles).length) rolesByName = nextRoles;
          if (Object.keys(nextItems).length) itemsByName = nextItems;
          captureSource = "builder";
          if (builder.stage === "Stage 2" || builder.stage === "Stage 3" || builder.stage === "Stage 4") focusStage = builder.stage;
        }

        const levelHint = stagePlan?.level ?? "8";
        const now = Date.now();
        const draft: ReviewDraft = {
          sourceId: comp.sourceId,
          compId: comp.id,
          patch: comp.patch,
          plannedNameZh: comp.nameZh,
          plannedNameEn: comp.name,
          source: comp.source,
          playstyle: comp.playstyle,
          plannedBoard: comp.board.map((position) => ({ ...position })),
          finalBoard,
          rolesByName,
          itemsByName,
          candidateRefs: parseCandidateRefs(safeParse(window.localStorage.getItem(FOCUS_TRAY_KEY))),
          focusStage,
          levelHint,
          captureSource,
          capturedAt: now,
          placement: 4,
          level: parseLevelHint(levelHint),
          endStage: "",
          tags: [],
          note: "",
          updatedAt: now,
        };
        window.localStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify(draft));
        markWorkspaceChanged();
        window.location.replace("/review");
      } catch {
        if (!cancelled) window.location.replace("/review");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}
