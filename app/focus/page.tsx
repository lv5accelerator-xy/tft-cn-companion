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
import { BUILDER_KEY, FOCUS_KEY, LOCAL_IMPORT_KEY, markWorkspaceChanged } from "@/lib/workspace";
import styles from "./focus.module.css";

type FocusState = {
  sourceId: string;
  id: string;
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

export default function FocusPage() {
  const router = useRouter();
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [requested, setRequested] = useState<{ sourceId: string; id: string } | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()).then(setCatalog).catch(() => setCatalog(null));

    const params = new URLSearchParams(window.location.search);
    const sourceId = params.get("source");
    const id = params.get("id");

    try {
      const imported = JSON.parse(window.localStorage.getItem(LOCAL_IMPORT_KEY) || "[]") as unknown[];
      setLocalComps(imported.filter(isManualComp));

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

  const allComps = useMemo(() => [...localComps, ...metaComps], [localComps]);
  const comp = useMemo(() => {
    if (!ready) return null;
    if (requested) return allComps.find((entry) => entry.sourceId === requested.sourceId && entry.id === requested.id) ?? allComps[0] ?? null;
    return allComps[0] ?? null;
  }, [allComps, ready, requested]);

  const champions = catalog?.champions ?? [];
  const championByName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => { map.set(normalize(champion.id), champion); map.set(normalize(champion.nameEn), champion); map.set(normalize(champion.nameZh), champion); });
    return map;
  }, [champions]);

  const units = useMemo(() => !comp ? [] : [...comp.coreUnits, ...comp.flexUnits].map((name) => championByName.get(normalize(name))).filter((entry): entry is CatalogEntry => Boolean(entry)).filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index).slice(0, 10), [championByName, comp]);
  const board = useMemo<BoardPosition[]>(() => !comp ? [] : mirrored ? comp.board.map((position) => ({ ...position, col: (6 - position.col) as BoardPosition["col"] })) : comp.board, [comp, mirrored]);
  const safeStageIndex = comp?.stages.length ? Math.min(stageIndex, comp.stages.length - 1) : 0;
  const activeStage = comp?.stages[safeStageIndex] ?? comp?.stages[0] ?? null;
  const primaryCarry = comp ? championByName.get(normalize(comp.coreUnits[0] ?? "")) ?? null : null;

  useEffect(() => {
    if (!ready || !comp) return;
    if (safeStageIndex !== stageIndex) setStageIndex(safeStageIndex);
    try {
      window.localStorage.setItem(FOCUS_KEY, JSON.stringify({
        sourceId: comp.sourceId,
        id: comp.id,
        stageIndex: safeStageIndex,
        mirrored,
        updatedAt: Date.now(),
      } satisfies FocusState));
    } catch {
      // Focus mode remains usable when persistence is unavailable.
    }
  }, [comp, mirrored, ready, safeStageIndex, stageIndex]);

  const openBuilder = useCallback(() => {
    if (!comp) return;
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({
        name: locale === "zh" ? comp.nameZh : comp.name,
        championIds: units.map((unit) => unit.id),
        champions: [...comp.coreUnits, ...comp.flexUnits],
        board,
        sourceCompId: comp.id,
        sourceId: comp.sourceId,
        updatedAt: Date.now(),
      }));
      markWorkspaceChanged();
    } catch {
      // Navigate even if local persistence is unavailable.
    }
    router.push("/builder");
  }, [board, comp, locale, router, units]);

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
      const numeric = Number(key);
      if (Number.isInteger(numeric) && numeric >= 1 && numeric <= comp.stages.length) {
        event.preventDefault();
        setStageIndex(numeric - 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [comp, openBuilder]);

  if (!ready) return <div className={styles.empty}><strong>{tr("正在恢复上次对局…", "Restoring your last game…")}</strong></div>;
  if (!comp) return <div className={styles.empty}><strong>{tr("暂无可用阵容", "No comps available")}</strong><Link href="/comps">{tr("返回阵容库", "Back to comps")}</Link></div>;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><div className={styles.titleMeta}><span className={styles.focusBadge}>GAME FOCUS</span><span>Patch {comp.patch}</span><span>{comp.source}</span></div><div className={styles.titleLine}><span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span><div><h1>{locale === "zh" ? comp.nameZh : comp.name}</h1><p>{locale === "zh" ? comp.name : comp.nameZh} · {comp.playstyle}</p></div></div></div>
        <div className={styles.headingActions}><Link href="/comps">{tr("切换阵容", "Switch comp")}</Link><button onClick={openBuilder} title={tr("快捷键 B", "Shortcut B")}>{tr("在 Builder 打开", "Open in Builder")} <kbd>B</kbd></button></div>
      </header>

      <section className={styles.stageBar}>
        <div><span>{tr("当前阶段", "Current stage")}</span><strong>{activeStage?.stage ?? "—"}</strong></div>
        <div className={styles.stageTabs}>{comp.stages.map((stage, index) => <button key={stage.stage} className={safeStageIndex === index ? styles.stageActive : ""} onClick={() => setStageIndex(index)}><kbd>{index + 1}</kbd>{stage.stage}</button>)}</div>
        <p>{activeStage?.text ?? "—"}</p>
      </section>

      <div className={styles.focusGrid}>
        <section className={styles.card}><div className={styles.cardHead}><div><h2>{tr("本局站位", "Positioning")}</h2><p>{tr("前排在上 · 后排在下；对位变化时一键镜像。", "Frontline on top, backline below; mirror for matchup changes.")}</p></div><button className={mirrored ? styles.mirrorActive : ""} onClick={() => setMirrored((value) => !value)} title={tr("快捷键 M", "Shortcut M")}>⇄ {mirrored ? tr("已镜像", "Mirrored") : tr("左右镜像", "Mirror")} <kbd>M</kbd></button></div><div className={styles.boardWrap}><BoardPreview positions={board} champions={champions} /></div><div className={styles.note}>{comp.positioningNote}</div></section>
        <section className={styles.card}><div className={styles.cardHead}><div><h2>{tr("这一局怎么打", "How to play")}</h2><p>{tr("只保留对局中真正需要看的信息。", "Only the information you need in-game.")}</p></div></div><div className={styles.plan}><span>{tr("什么时候玩", "When to play")}</span><p>{comp.whenToPlay || "—"}</p></div><div className={styles.plan}><span>{tr("装备优先", "Item priority")}</span><div className={styles.chips}>{comp.itemFocus.map((item) => <b key={item}>{item}</b>)}</div></div><div className={styles.plan}><span>{tr("关键提醒", "Key reminders")}</span><ul>{comp.keyNotes.slice(0, 5).map((note) => <li key={note}>{note}</li>)}</ul></div></section>
      </div>

      <section className={styles.unitsCard}><div className={styles.cardHead}><div><h2>{tr("核心与可替换单位", "Core and flex units")}</h2><p>{tr("点英雄直接进入属性实验室。", "Open a champion directly in Stat Lab.")}</p></div>{primaryCarry ? <Link href={`/stats?champion=${encodeURIComponent(primaryCarry.id)}`}>Σ {tr("主 C 属性实验室", "Carry Stat Lab")}</Link> : null}</div><div className={styles.unitList}>{units.map((unit) => { const core = comp.coreUnits.some((name) => normalize(name) === normalize(unit.nameEn) || normalize(name) === normalize(unit.nameZh)); return <Link href={`/stats?champion=${encodeURIComponent(unit.id)}`} className={`${styles.unitCard} ${core ? styles.coreUnit : ""}`} key={unit.id}><UnitIcon entry={unit} size={42} /><span><strong>{nameOf(unit)}</strong><small>{secondaryNameOf(unit)}</small></span><em>{core ? tr("核心", "Core") : tr("可替换", "Flex")}</em></Link>; })}</div></section>

      <footer className={styles.footer}><span>{tr("副屏快捷键：1/2/3 切阶段 · M 镜像 · B Builder · Ctrl + K 搜索。", "Second-screen shortcuts: 1/2/3 stages · M mirror · B Builder · Ctrl + K search.")}</span>{comp.sourceUrl ? <a href={comp.sourceUrl} target="_blank" rel="noreferrer">{tr("查看来源原文", "Original source")}</a> : null}</footer>
    </div>
  );
}
