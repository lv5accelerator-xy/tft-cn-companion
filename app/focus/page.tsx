"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import BoardPreview from "../components/BoardPreview";
import UnitIcon from "../components/UnitIcon";
import { useLocale } from "../components/LocaleProvider";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { deriveStageBoardPlans, type RollMode } from "@/lib/stage-board";
import { deriveTacticalBoardPlan, type TacticalRole } from "@/lib/tactical-board";
import {
  BUILDER_KEY,
  FOCUS_COMPACT_KEY,
  FOCUS_KEY,
  FOCUS_STAGE_OVERRIDES_KEY,
  FOCUS_TRAY_KEY,
  LOCAL_IMPORT_KEY,
  markWorkspaceChanged,
} from "@/lib/workspace";
import styles from "./focus.module.css";

type FocusRef = { sourceId: string; id: string };
type CandidateSlot = FocusRef | null;

type FocusState = FocusRef & {
  stageIndex?: number;
  mirrored?: boolean;
  updatedAt?: number;
};

type StageOverride = {
  rolesByName: Record<string, TacticalRole>;
  itemsByName: Record<string, string[]>;
  updatedAt: number;
};

type StageOverrideStore = Record<string, Record<string, StageOverride>>;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.sourceId === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.board);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function sameRef(left: FocusRef | null, right: FocusRef | null) {
  return Boolean(left && right && left.sourceId === right.sourceId && left.id === right.id);
}

function parseCandidateSlots(raw: string | null): CandidateSlot[] {
  const empty: CandidateSlot[] = [null, null, null];
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return empty;
    return [0, 1, 2].map((index) => {
      const value = parsed[index];
      if (!value || typeof value !== "object") return null;
      const ref = value as Partial<FocusRef>;
      return typeof ref.sourceId === "string" && typeof ref.id === "string" ? { sourceId: ref.sourceId, id: ref.id } : null;
    });
  } catch {
    return empty;
  }
}

function parseStageOverrides(raw: string | null): StageOverrideStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as StageOverrideStore : {};
  } catch {
    return {};
  }
}

function copyItems(values: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(values).map(([unit, items]) => [unit, [...items].slice(0, 3)]));
}

function rollText(mode: RollMode, locale: "zh" | "en") {
  const zh: Record<RollMode, string> = {
    hold: "以攒钱升人口为主，质量不足时只小D止血",
    stabilize: "补关键二星稳血，保经济准备下一阶段",
    reroll: "7级主搜三星核心，成型后再考虑上人口",
    fast8: "升8后启动主搜，优先完成主C与主坦二星",
    finish: "根据血量与对子在7–8级完成主框架",
  };
  const en: Record<RollMode, string> = {
    hold: "Prioritize economy and levels; only roll lightly to stabilize",
    stabilize: "Find key 2-stars, stabilize, then preserve economy",
    reroll: "Main reroll window at level 7; level after the core hits",
    fast8: "Go level 8 and roll for the primary carry and tank upgrades",
    finish: "Finish the core board at level 7–8 based on HP and pairs",
  };
  return locale === "zh" ? zh[mode] : en[mode];
}

function roleText(role: TacticalRole, locale: "zh" | "en") {
  const labels: Record<TacticalRole, [string, string]> = {
    CARRY: ["主 C", "Carry"],
    TANK: ["主坦", "Tank"],
    SECONDARY: ["副 C", "Secondary"],
    FLEX: ["Flex", "Flex"],
  };
  return labels[role][locale === "zh" ? 0 : 1];
}

export default function FocusPage() {
  const router = useRouter();
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [requested, setRequested] = useState<FocusRef | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [candidateSlots, setCandidateSlots] = useState<CandidateSlot[]>([null, null, null]);
  const [compact, setCompact] = useState(false);
  const [stageOverrides, setStageOverrides] = useState<StageOverrideStore>({});
  const [selectedUnitName, setSelectedUnitName] = useState("");
  const [itemPickerValue, setItemPickerValue] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()).then(setCatalog).catch(() => setCatalog(null));

    const params = new URLSearchParams(window.location.search);
    const sourceId = params.get("source");
    const id = params.get("id");

    try {
      const imported = JSON.parse(window.localStorage.getItem(LOCAL_IMPORT_KEY) || "[]") as unknown[];
      setLocalComps(imported.filter(isManualComp));
      setCandidateSlots(parseCandidateSlots(window.localStorage.getItem(FOCUS_TRAY_KEY)));
      setStageOverrides(parseStageOverrides(window.localStorage.getItem(FOCUS_STAGE_OVERRIDES_KEY)));

      const compactValue = window.localStorage.getItem(FOCUS_COMPACT_KEY);
      setCompact(compactValue === null ? window.innerWidth >= 1200 && window.innerHeight <= 1100 : compactValue === "1");

      if (sourceId && id) {
        setRequested({ sourceId, id });
        setStageIndex(0);
        setMirrored(false);
      } else {
        const saved = JSON.parse(window.localStorage.getItem(FOCUS_KEY) || "null") as FocusState | null;
        if (saved?.sourceId && saved?.id) {
          setRequested({ sourceId: saved.sourceId, id: saved.id });
          setStageIndex(Number.isInteger(saved.stageIndex) ? Math.max(0, Number(saved.stageIndex)) : 0);
          setMirrored(Boolean(saved.mirrored));
        }
      }
    } catch {
      setLocalComps([]);
      if (sourceId && id) setRequested({ sourceId, id });
    } finally {
      setReady(true);
    }
  }, []);

  const allComps = useMemo(() => {
    const seen = new Set<string>();
    return [...localComps, ...metaComps].filter((entry) => {
      const key = `${entry.sourceId}:${entry.id}:${entry.patch}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localComps]);

  const comp = useMemo(() => {
    if (!ready) return null;
    if (requested) return allComps.find((entry) => entry.sourceId === requested.sourceId && entry.id === requested.id) ?? allComps[0] ?? null;
    return allComps[0] ?? null;
  }, [allComps, ready, requested]);

  const trayComps = useMemo(() => candidateSlots.map((ref) => ref ? allComps.find((entry) => sameRef(ref, entry)) ?? null : null), [allComps, candidateSlots]);
  const champions = catalog?.champions ?? [];
  const allItems = catalog?.items ?? [];
  const championByName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => {
      [champion.id, champion.nameEn, champion.nameZh, ...(champion.aliases ?? [])].forEach((name) => {
        if (name) map.set(normalize(name), champion);
      });
    });
    return map;
  }, [champions]);

  const units = useMemo(() => !comp ? [] : [...comp.coreUnits, ...comp.flexUnits]
    .map((name) => championByName.get(normalize(name)))
    .filter((entry): entry is CatalogEntry => Boolean(entry))
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index)
    .slice(0, 10), [championByName, comp]);

  const tacticalPlan = useMemo(() => comp ? deriveTacticalBoardPlan(comp, champions, allItems) : null, [allItems, champions, comp]);
  const stagePlans = useMemo(() => comp && tacticalPlan ? deriveStageBoardPlans(comp, champions, tacticalPlan) : [], [champions, comp, tacticalPlan]);
  const safeStageIndex = comp?.stages.length ? Math.min(stageIndex, comp.stages.length - 1) : 0;
  const activeStage = comp?.stages[safeStageIndex] ?? comp?.stages[0] ?? null;
  const activeStagePlan = stagePlans[safeStageIndex] ?? null;
  const compOverrideKey = comp ? `${comp.sourceId}:${comp.id}` : "";
  const stageOverride = activeStage && compOverrideKey ? stageOverrides[compOverrideKey]?.[activeStage.stage] : undefined;
  const activeRoles = stageOverride?.rolesByName ?? activeStagePlan?.rolesByName ?? tacticalPlan?.rolesByName ?? {};
  const activeItems = stageOverride?.itemsByName ?? activeStagePlan?.itemsByName ?? tacticalPlan?.itemsByName ?? {};
  const baseBoard = activeStagePlan?.board ?? comp?.board ?? [];
  const board = useMemo<BoardPosition[]>(() => mirrored ? baseBoard.map((position) => ({ ...position, col: (6 - position.col) as BoardPosition["col"] })) : baseBoard, [baseBoard, mirrored]);
  const stageUnits = useMemo(() => board
    .map((position) => championByName.get(normalize(position.unit)))
    .filter((entry): entry is CatalogEntry => Boolean(entry))
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index), [board, championByName]);
  const primaryCarryName = Object.entries(activeRoles).find(([, role]) => role === "CARRY")?.[0];
  const primaryCarry = primaryCarryName ? championByName.get(normalize(primaryCarryName)) ?? null : null;
  const currentRef = comp ? { sourceId: comp.sourceId, id: comp.id } : null;
  const selectedUnit = selectedUnitName ? championByName.get(normalize(selectedUnitName)) ?? null : null;
  const selectedItems = selectedUnit ? activeItems[selectedUnit.nameEn] ?? [] : [];
  const equipableItems = useMemo(() => allItems.filter((item) => item.subtype !== "component" && item.subtype !== "tactician"), [allItems]);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(FOCUS_TRAY_KEY, JSON.stringify(candidateSlots)); } catch {}
  }, [candidateSlots, ready]);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(FOCUS_COMPACT_KEY, compact ? "1" : "0"); } catch {}
  }, [compact, ready]);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(FOCUS_STAGE_OVERRIDES_KEY, JSON.stringify(stageOverrides)); } catch {}
  }, [ready, stageOverrides]);

  useEffect(() => {
    if (!ready || !comp) return;
    if (safeStageIndex !== stageIndex) setStageIndex(safeStageIndex);
    try {
      window.localStorage.setItem(FOCUS_KEY, JSON.stringify({ sourceId: comp.sourceId, id: comp.id, stageIndex: safeStageIndex, mirrored, updatedAt: Date.now() } satisfies FocusState));
    } catch {}
  }, [comp, mirrored, ready, safeStageIndex, stageIndex]);

  useEffect(() => {
    setSelectedUnitName("");
    setItemPickerValue("");
  }, [compOverrideKey, safeStageIndex]);

  const switchComp = useCallback((ref: FocusRef) => {
    setRequested(ref);
    setStageIndex(0);
    setMirrored(false);
    const nextUrl = `/focus?source=${encodeURIComponent(ref.sourceId)}&id=${encodeURIComponent(ref.id)}`;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const openBuilder = useCallback(() => {
    if (!comp || !activeStage) return;
    try {
      const allowedNames = new Set(stageUnits.map((unit) => normalize(unit.nameEn)));
      const builderRolesByName = Object.fromEntries(Object.entries(activeRoles).filter(([unit, role]) => role !== "FLEX" && allowedNames.has(normalize(unit))));
      const builderItemsByName = Object.fromEntries(Object.entries(activeItems).filter(([unit]) => allowedNames.has(normalize(unit))));
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({
        name: `${locale === "zh" ? comp.nameZh : comp.name} · ${activeStage.stage}`,
        championIds: stageUnits.map((unit) => unit.id),
        champions: stageUnits.map((unit) => unit.nameEn),
        board,
        itemsByName: builderItemsByName,
        rolesByName: builderRolesByName,
        sourceCompId: comp.id,
        sourceId: comp.sourceId,
        stage: activeStage.stage,
        updatedAt: Date.now(),
      }));
      markWorkspaceChanged();
    } catch {}
    router.push("/builder");
  }, [activeItems, activeRoles, activeStage, board, comp, locale, router, stageUnits]);

  function saveCurrentToSlot(index: number) {
    if (!currentRef) return;
    setCandidateSlots((current) => current.map((slot, slotIndex) => {
      if (slotIndex === index) return currentRef;
      return sameRef(slot, currentRef) ? null : slot;
    }));
  }

  function removeCandidate(index: number) {
    setCandidateSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? null : slot));
  }

  function saveActiveOverride(nextRoles: Record<string, TacticalRole>, nextItems: Record<string, string[]>) {
    if (!comp || !activeStage) return;
    const key = `${comp.sourceId}:${comp.id}`;
    setStageOverrides((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? {}),
        [activeStage.stage]: {
          rolesByName: { ...nextRoles },
          itemsByName: copyItems(nextItems),
          updatedAt: Date.now(),
        },
      },
    }));
  }

  function setSelectedRole(role: TacticalRole) {
    if (!selectedUnit) return;
    const nextRoles: Record<string, TacticalRole> = { ...activeRoles };
    if (role !== "FLEX") {
      Object.keys(nextRoles).forEach((unit) => {
        if (nextRoles[unit] === role) nextRoles[unit] = "FLEX";
      });
    }
    nextRoles[selectedUnit.nameEn] = role;
    saveActiveOverride(nextRoles, activeItems);
  }

  function addSelectedItem(event: ChangeEvent<HTMLSelectElement>) {
    const item = allItems.find((entry) => entry.id === event.target.value);
    setItemPickerValue("");
    if (!selectedUnit || !item) return;
    const current = activeItems[selectedUnit.nameEn] ?? [];
    if (current.some((value) => normalize(value) === normalize(item.nameEn)) || current.length >= 3) return;
    saveActiveOverride(activeRoles, { ...activeItems, [selectedUnit.nameEn]: [...current, item.nameEn] });
  }

  function removeSelectedItem(itemName: string) {
    if (!selectedUnit) return;
    const current = activeItems[selectedUnit.nameEn] ?? [];
    saveActiveOverride(activeRoles, { ...activeItems, [selectedUnit.nameEn]: current.filter((value) => normalize(value) !== normalize(itemName)) });
  }

  function resetStageOverride() {
    if (!comp || !activeStage) return;
    const key = `${comp.sourceId}:${comp.id}`;
    setStageOverrides((current) => {
      const next = { ...current };
      const compStages = { ...(next[key] ?? {}) };
      delete compStages[activeStage.stage];
      if (Object.keys(compStages).length) next[key] = compStages;
      else delete next[key];
      return next;
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!comp || isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "m") {
        event.preventDefault();
        setMirrored((value) => !value);
        return;
      }
      if (key === "b") {
        event.preventDefault();
        openBuilder();
        return;
      }
      if (key === "c") {
        event.preventDefault();
        setCompact((value) => !value);
        return;
      }
      const stageKeys = ["q", "w", "e"];
      const stageKeyIndex = stageKeys.indexOf(key);
      if (stageKeyIndex >= 0 && stageKeyIndex < comp.stages.length) {
        event.preventDefault();
        setStageIndex(stageKeyIndex);
        return;
      }
      const numeric = Number(key);
      if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 3) {
        const ref = candidateSlots[numeric - 1];
        if (ref) {
          event.preventDefault();
          switchComp(ref);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [candidateSlots, comp, openBuilder, switchComp]);

  if (!ready) return <div className={styles.empty}><strong>{tr("正在恢复上次对局…", "Restoring your last game…")}</strong></div>;
  if (!comp) return <div className={styles.empty}><strong>{tr("暂无可用阵容", "No comps available")}</strong><Link href="/comps">{tr("返回阵容库", "Back to comps")}</Link></div>;

  const handoffText = activeStagePlan?.handoffs.length
    ? activeStagePlan.handoffs.map((handoff) => `${handoff.from} → ${handoff.to}`).join(" · ")
    : tr("当前阶段无明确接棒", "No explicit handoff for this stage");
  const provenanceText = activeStagePlan?.provenance === "source-final"
    ? tr("来源最终站位", "Source final board")
    : tr("过渡参考 · 按当前阵容费用与站位生成", "Transition reference · derived from current comp costs and positioning");

  return (
    <div className={`${styles.page} ${compact ? styles.compact : ""}`}>
      <header className={styles.heading}>
        <div>
          <div className={styles.titleMeta}><span className={styles.focusBadge}>STAGE BOARD</span><span>Patch {comp.patch}</span><span>{comp.source}</span></div>
          <div className={styles.titleLine}><span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span><div><h1>{locale === "zh" ? comp.nameZh : comp.name}</h1><p>{locale === "zh" ? comp.name : comp.nameZh} · {comp.playstyle}</p></div></div>
        </div>
        <div className={styles.headingActions}>
          <button className={compact ? styles.compactActive : ""} onClick={() => setCompact((value) => !value)} title={tr("快捷键 C", "Shortcut C")}>{compact ? tr("紧凑 HUD", "Compact HUD") : tr("标准 HUD", "Standard HUD")} <kbd>C</kbd></button>
          <Link href="/comps">{tr("阵容库", "Comps")}</Link>
          <button onClick={openBuilder} title={tr("把当前阶段载入 Builder · 快捷键 B", "Load the current stage into Builder · Shortcut B")}>{tr("阶段 Builder", "Stage Builder")} <kbd>B</kbd></button>
        </div>
      </header>

      <section className={styles.trayBar}>
        <div className={styles.trayIntro}><strong>{tr("候选阵容夹", "Candidate Tray")}</strong><span>{tr("把开局可能玩的 3 套阵容固定在这里，实战按 1 / 2 / 3 直接切。", "Pin up to three likely comps here and switch instantly with 1 / 2 / 3.")}</span></div>
        <div className={styles.traySlots}>
          {[0, 1, 2].map((index) => {
            const ref = candidateSlots[index];
            const trayComp = trayComps[index];
            const active = Boolean(ref && currentRef && sameRef(ref, currentRef));
            if (!ref || !trayComp) {
              return <button className={styles.trayEmpty} key={index} onClick={() => saveCurrentToSlot(index)} title={tr("把当前阵容保存到这个槽位", "Save the current comp to this slot")}><kbd>{index + 1}</kbd><span>+ {tr("保存当前", "Save current")}</span></button>;
            }
            return (
              <div className={`${styles.traySlot} ${active ? styles.traySlotActive : ""}`} key={index}>
                <button className={styles.traySelect} onClick={() => switchComp(ref)}><kbd>{index + 1}</kbd><span><strong>{locale === "zh" ? trayComp.nameZh : trayComp.name}</strong><small>{trayComp.source} · {trayComp.playstyle}</small></span></button>
                <button className={styles.trayRemove} onClick={() => removeCandidate(index)} aria-label={tr("移出候选", "Remove candidate")}>×</button>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.stageBar}>
        <div><span>{tr("当前阶段", "Current stage")}</span><strong>{activeStage?.stage ?? "—"}</strong></div>
        <div className={styles.stageTabs}>{comp.stages.map((stage, index) => <button key={stage.stage} className={safeStageIndex === index ? styles.stageActive : ""} onClick={() => setStageIndex(index)}><kbd>{["Q", "W", "E"][index] ?? index + 1}</kbd>{stage.stage}</button>)}</div>
        <p>{activeStage?.text ?? "—"}</p>
      </section>

      <section className={styles.stageIntel}>
        <div><span>{tr("等级", "Level")}</span><strong>Lv. {activeStagePlan?.level ?? "—"}</strong></div>
        <div><span>{tr("搜牌节点", "Roll window")}</span><strong>{activeStagePlan ? rollText(activeStagePlan.rollMode, locale) : "—"}</strong></div>
        <div><span>{tr("装备 / 角色接棒", "Item / role handoff")}</span><strong>{handoffText}</strong></div>
        <div className={activeStagePlan?.provenance === "source-final" ? styles.sourceBadge : styles.derivedBadge}>{provenanceText}</div>
      </section>

      <div className={styles.focusGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div><h2>{tr("阶段战术棋盘", "Stage Tactical Board")}</h2><p>{tr("Q/W/E 会真正切换棋盘。点击英雄可单独修改本阶段角色与三件装备。", "Q/W/E now switches the actual board. Click a unit to edit this stage's role and three items.")}</p></div>
            <div className={styles.boardActions}>
              {stageOverride ? <span className={styles.customBadge}>{tr("用户修改", "Customized")}</span> : null}
              {stageOverride ? <button onClick={resetStageOverride}>{tr("恢复阶段推荐", "Reset stage")}</button> : null}
              <button className={mirrored ? styles.mirrorActive : ""} onClick={() => setMirrored((value) => !value)} title={tr("快捷键 M", "Shortcut M")}>⇄ {mirrored ? tr("已镜像", "Mirrored") : tr("左右镜像", "Mirror")} <kbd>M</kbd></button>
            </div>
          </div>
          <div className={styles.boardWrap}>
            <BoardPreview
              positions={board}
              champions={champions}
              items={allItems}
              rolesByName={activeRoles}
              itemsByName={activeItems}
              compact={compact}
              selectedUnit={selectedUnitName}
              onUnitClick={(unit) => setSelectedUnitName(unit.nameEn)}
            />
          </div>
          {selectedUnit ? (
            <div className={styles.tacticalEditor}>
              <div className={styles.editorIdentity}><UnitIcon entry={selectedUnit} size={38} /><div><strong>{nameOf(selectedUnit)}</strong><span>{secondaryNameOf(selectedUnit)} · {selectedUnit.tier ?? "—"} {tr("费", "cost")}</span></div></div>
              <div className={styles.roleEditor}><span>{tr("角色", "Role")}</span><div>{(["CARRY", "TANK", "SECONDARY", "FLEX"] as TacticalRole[]).map((role) => <button key={role} className={activeRoles[selectedUnit.nameEn] === role ? styles.editorActive : ""} onClick={() => setSelectedRole(role)}>{roleText(role, locale)}</button>)}</div></div>
              <div className={styles.itemEditor}>
                <span>{tr("本阶段装备", "Stage items")}</span>
                <div className={styles.assignedItems}>{selectedItems.length ? selectedItems.map((itemName) => <button key={itemName} onClick={() => removeSelectedItem(itemName)} title={tr("点击移除", "Click to remove")}>{itemName} ×</button>) : <em>{tr("暂无指定装备", "No assigned items")}</em>}</div>
                <select value={itemPickerValue} onChange={addSelectedItem} disabled={selectedItems.length >= 3}><option value="">{selectedItems.length >= 3 ? tr("已满 3 件", "3 items equipped") : tr("+ 添加装备", "+ Add item")}</option>{equipableItems.map((item) => <option value={item.id} key={item.id}>{nameOf(item)} / {item.nameEn}</option>)}</select>
              </div>
            </div>
          ) : (
            <div className={styles.editorHint}>{tr("点击棋盘中的英雄即可调整该阶段的 C / T / 2C / Flex 与装备；修改只保存在你的本地覆盖层。", "Click a board unit to edit C / T / 2C / Flex and items for this stage. Changes are stored only in your local override layer.")}</div>
          )}
          <div className={styles.note}>{activeStagePlan?.provenance === "source-final" ? comp.positioningNote : tr("此阶段为过渡参考棋盘；不会覆盖来源最终站位，实战临时牌仍按你的来牌与血量调整。", "This stage is a transition reference. It does not overwrite the source final board; adjust temporary units to your actual shops and HP.")}</div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>{tr("这一阶段怎么打", "How to play this stage")}</h2><p>{tr("副屏只保留当前决策需要的信息。", "Keep only the information needed for the current decision.")}</p></div></div>
          <div className={styles.plan}><span>{tr("阶段操作", "Stage plan")}</span><p>{activeStage?.text ?? "—"}</p></div>
          <div className={styles.plan}><span>{tr("装备优先", "Item priority")}</span><div className={styles.chips}>{comp.itemFocus.map((item) => <b key={item}>{item}</b>)}</div></div>
          <div className={styles.plan}><span>{tr("关键提醒", "Key reminders")}</span><ul>{comp.keyNotes.slice(0, compact ? 4 : 5).map((note) => <li key={note}>{note}</li>)}</ul></div>
        </section>
      </div>

      <section className={styles.unitsCard}>
        <div className={styles.cardHead}><div><h2>{tr("核心与可替换单位", "Core and flex units")}</h2><p>{tr("点英雄直接进入属性实验室。", "Open a champion directly in Stat Lab.")}</p></div>{primaryCarry ? <Link href={`/stats?champion=${encodeURIComponent(primaryCarry.id)}`}>Σ {tr("当前主 C 属性实验室", "Current carry Stat Lab")}</Link> : null}</div>
        <div className={styles.unitList}>{units.map((unit) => { const core = comp.coreUnits.some((name) => normalize(name) === normalize(unit.nameEn) || normalize(name) === normalize(unit.nameZh)); return <Link href={`/stats?champion=${encodeURIComponent(unit.id)}`} className={`${styles.unitCard} ${core ? styles.coreUnit : ""}`} key={unit.id}><UnitIcon entry={unit} size={compact ? 36 : 42} /><span><strong>{nameOf(unit)}</strong><small>{secondaryNameOf(unit)}</small></span><em>{core ? tr("核心", "Core") : tr("可替换", "Flex")}</em></Link>; })}</div>
      </section>

      <footer className={styles.footer}><span>{tr("副屏快捷键：1/2/3 候选阵容 · Q/W/E 阶段棋盘 · M 镜像 · B 当前阶段 Builder · C 紧凑模式 · Ctrl + K 搜索。", "Second-screen shortcuts: 1/2/3 candidates · Q/W/E stage boards · M mirror · B current-stage Builder · C compact · Ctrl + K search.")}</span>{comp.sourceUrl ? <a href={comp.sourceUrl} target="_blank" rel="noreferrer">{tr("查看来源原文", "Original source")}</a> : null}</footer>
    </div>
  );
}
