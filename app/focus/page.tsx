"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BoardPreview from "../components/BoardPreview";
import UnitIcon from "../components/UnitIcon";
import { useLocale } from "../components/LocaleProvider";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { deriveTacticalBoardPlan } from "@/lib/tactical-board";
import {
  BUILDER_KEY,
  FOCUS_COMPACT_KEY,
  FOCUS_KEY,
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
    champions.forEach((champion) => { map.set(normalize(champion.id), champion); map.set(normalize(champion.nameEn), champion); map.set(normalize(champion.nameZh), champion); });
    return map;
  }, [champions]);

  const units = useMemo(() => !comp ? [] : [...comp.coreUnits, ...comp.flexUnits].map((name) => championByName.get(normalize(name))).filter((entry): entry is CatalogEntry => Boolean(entry)).filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index).slice(0, 10), [championByName, comp]);
  const board = useMemo<BoardPosition[]>(() => !comp ? [] : mirrored ? comp.board.map((position) => ({ ...position, col: (6 - position.col) as BoardPosition["col"] })) : comp.board, [comp, mirrored]);
  const tacticalPlan = useMemo(() => comp ? deriveTacticalBoardPlan(comp, champions, allItems) : null, [allItems, champions, comp]);
  const safeStageIndex = comp?.stages.length ? Math.min(stageIndex, comp.stages.length - 1) : 0;
  const activeStage = comp?.stages[safeStageIndex] ?? comp?.stages[0] ?? null;
  const primaryCarryName = tacticalPlan ? Object.entries(tacticalPlan.rolesByName).find(([, role]) => role === "CARRY")?.[0] : undefined;
  const primaryCarry = primaryCarryName ? championByName.get(normalize(primaryCarryName)) ?? null : comp ? championByName.get(normalize(comp.coreUnits[0] ?? "")) ?? null : null;
  const currentRef = comp ? { sourceId: comp.sourceId, id: comp.id } : null;

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(FOCUS_TRAY_KEY, JSON.stringify(candidateSlots)); } catch {}
  }, [candidateSlots, ready]);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(FOCUS_COMPACT_KEY, compact ? "1" : "0"); } catch {}
  }, [compact, ready]);

  useEffect(() => {
    if (!ready || !comp) return;
    if (safeStageIndex !== stageIndex) setStageIndex(safeStageIndex);
    try {
      window.localStorage.setItem(FOCUS_KEY, JSON.stringify({ sourceId: comp.sourceId, id: comp.id, stageIndex: safeStageIndex, mirrored, updatedAt: Date.now() } satisfies FocusState));
    } catch {}
  }, [comp, mirrored, ready, safeStageIndex, stageIndex]);

  const switchComp = useCallback((ref: FocusRef) => {
    setRequested(ref);
    setStageIndex(0);
    setMirrored(false);
    const nextUrl = `/focus?source=${encodeURIComponent(ref.sourceId)}&id=${encodeURIComponent(ref.id)}`;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const openBuilder = useCallback(() => {
    if (!comp) return;
    try {
      const builderRolesByName = tacticalPlan
        ? Object.fromEntries(Object.entries(tacticalPlan.rolesByName).filter(([, role]) => role !== "FLEX"))
        : {};
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({
        name: locale === "zh" ? comp.nameZh : comp.name,
        championIds: units.map((unit) => unit.id),
        champions: [...comp.coreUnits, ...comp.flexUnits],
        board,
        itemsByName: tacticalPlan?.itemsByName ?? {},
        rolesByName: builderRolesByName,
        sourceCompId: comp.id,
        sourceId: comp.sourceId,
        updatedAt: Date.now(),
      }));
      markWorkspaceChanged();
    } catch {}
    router.push("/builder");
  }, [board, comp, locale, router, tacticalPlan, units]);

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

  return (
    <div className={`${styles.page} ${compact ? styles.compact : ""}`}>
      <header className={styles.heading}>
        <div>
          <div className={styles.titleMeta}><span className={styles.focusBadge}>TACTICAL BOARD</span><span>Patch {comp.patch}</span><span>{comp.source}</span></div>
          <div className={styles.titleLine}><span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span><div><h1>{locale === "zh" ? comp.nameZh : comp.name}</h1><p>{locale === "zh" ? comp.name : comp.nameZh} · {comp.playstyle}</p></div></div>
        </div>
        <div className={styles.headingActions}>
          <button className={compact ? styles.compactActive : ""} onClick={() => setCompact((value) => !value)} title={tr("快捷键 C", "Shortcut C")}>{compact ? tr("紧凑 HUD", "Compact HUD") : tr("标准 HUD", "Standard HUD")} <kbd>C</kbd></button>
          <Link href="/comps">{tr("阵容库", "Comps")}</Link>
          <button onClick={openBuilder} title={tr("快捷键 B", "Shortcut B")}>{tr("Builder", "Builder")} <kbd>B</kbd></button>
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

      <div className={styles.focusGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>{tr("战术棋盘", "Tactical Board")}</h2><p>{tr("C 主C · T 主坦 · 2C 副C · F Flex；边框表示 1–5 费，来源有装备时直接显示图标。", "C carry · T tank · 2C secondary · F flex; border shows cost and source-backed items appear as icons.")}</p></div><button className={mirrored ? styles.mirrorActive : ""} onClick={() => setMirrored((value) => !value)} title={tr("快捷键 M", "Shortcut M")}>⇄ {mirrored ? tr("已镜像", "Mirrored") : tr("左右镜像", "Mirror")} <kbd>M</kbd></button></div>
          <div className={styles.boardWrap}><BoardPreview positions={board} champions={champions} items={allItems} rolesByName={tacticalPlan?.rolesByName} itemsByName={tacticalPlan?.itemsByName} compact={compact} /></div>
          <div className={styles.note}>{comp.positioningNote}</div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>{tr("这一局怎么打", "How to play")}</h2><p>{tr("副屏只保留当前决策需要的信息。", "Keep only the information needed for the current decision.")}</p></div></div>
          <div className={styles.plan}><span>{tr("什么时候玩", "When to play")}</span><p>{comp.whenToPlay || "—"}</p></div>
          <div className={styles.plan}><span>{tr("装备优先", "Item priority")}</span><div className={styles.chips}>{comp.itemFocus.map((item) => <b key={item}>{item}</b>)}</div></div>
          <div className={styles.plan}><span>{tr("关键提醒", "Key reminders")}</span><ul>{comp.keyNotes.slice(0, compact ? 4 : 5).map((note) => <li key={note}>{note}</li>)}</ul></div>
        </section>
      </div>

      <section className={styles.unitsCard}>
        <div className={styles.cardHead}><div><h2>{tr("核心与可替换单位", "Core and flex units")}</h2><p>{tr("点英雄直接进入属性实验室。", "Open a champion directly in Stat Lab.")}</p></div>{primaryCarry ? <Link href={`/stats?champion=${encodeURIComponent(primaryCarry.id)}`}>Σ {tr("主 C 属性实验室", "Carry Stat Lab")}</Link> : null}</div>
        <div className={styles.unitList}>{units.map((unit) => { const core = comp.coreUnits.some((name) => normalize(name) === normalize(unit.nameEn) || normalize(name) === normalize(unit.nameZh)); return <Link href={`/stats?champion=${encodeURIComponent(unit.id)}`} className={`${styles.unitCard} ${core ? styles.coreUnit : ""}`} key={unit.id}><UnitIcon entry={unit} size={compact ? 36 : 42} /><span><strong>{nameOf(unit)}</strong><small>{secondaryNameOf(unit)}</small></span><em>{core ? tr("核心", "Core") : tr("可替换", "Flex")}</em></Link>; })}</div>
      </section>

      <footer className={styles.footer}><span>{tr("副屏快捷键：1/2/3 候选阵容 · Q/W/E 阶段 · M 镜像 · B Builder · C 紧凑模式 · Ctrl + K 搜索。", "Second-screen shortcuts: 1/2/3 candidates · Q/W/E stages · M mirror · B Builder · C compact · Ctrl + K search.")}</span>{comp.sourceUrl ? <a href={comp.sourceUrl} target="_blank" rel="noreferrer">{tr("查看来源原文", "Original source")}</a> : null}</footer>
    </div>
  );
}
