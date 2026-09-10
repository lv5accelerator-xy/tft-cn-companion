"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UnitIcon from "./components/UnitIcon";
import { useLocale } from "./components/LocaleProvider";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { formatFreshness } from "@/lib/freshness";
import {
  FAVORITE_COMPS_KEY,
  FOCUS_COMP_STATES_KEY,
  FOCUS_KEY,
  FOCUS_TRAY_KEY,
  LOCAL_IMPORT_KEY,
  RECENT_COMPS_KEY,
  compRefKey,
  parseFocusCompStates,
  parseStoredCompRefs,
  type StoredCompRef,
  type StoredFocusCompStateStore,
} from "@/lib/workspace";
import styles from "./dashboard.module.css";

type FocusResume = { sourceId: string; id: string; stageIndex?: number; mirrored?: boolean };
type TraySlot = StoredCompRef | null;

function normalize(value: string) { return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'"); }
function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.sourceId === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.board);
}
function parseTray(value: unknown): TraySlot[] {
  if (!Array.isArray(value)) return [null, null, null];
  return [0, 1, 2].map((index) => {
    const entry = value[index];
    if (!entry || typeof entry !== "object") return null;
    const ref = entry as Partial<StoredCompRef>;
    return typeof ref.sourceId === "string" && typeof ref.id === "string" ? { sourceId: ref.sourceId, id: ref.id } : null;
  });
}

export default function HomePage() {
  const { locale, tr } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [resume, setResume] = useState<FocusResume | null>(null);
  const [favorites, setFavorites] = useState<StoredCompRef[]>([]);
  const [recents, setRecents] = useState<StoredCompRef[]>([]);
  const [tray, setTray] = useState<TraySlot[]>([null, null, null]);
  const [focusStates, setFocusStates] = useState<StoredFocusCompStateStore>({});

  useEffect(() => {
    fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()).then(setCatalog).catch(() => setCatalog(null));
    try {
      const imported = JSON.parse(window.localStorage.getItem(LOCAL_IMPORT_KEY) || "[]") as unknown[];
      setLocalComps(imported.filter(isManualComp));
      const raw = window.localStorage.getItem(FOCUS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FocusResume>;
        if (typeof parsed.sourceId === "string" && typeof parsed.id === "string") setResume({ sourceId: parsed.sourceId, id: parsed.id, stageIndex: parsed.stageIndex, mirrored: parsed.mirrored });
      }
      setFavorites(parseStoredCompRefs(JSON.parse(window.localStorage.getItem(FAVORITE_COMPS_KEY) || "[]"), 12));
      setRecents(parseStoredCompRefs(JSON.parse(window.localStorage.getItem(RECENT_COMPS_KEY) || "[]"), 8));
      setTray(parseTray(JSON.parse(window.localStorage.getItem(FOCUS_TRAY_KEY) || "[]")));
      setFocusStates(parseFocusCompStates(JSON.parse(window.localStorage.getItem(FOCUS_COMP_STATES_KEY) || "{}")));
    } catch { setLocalComps([]); }
  }, []);

  const champions = catalog?.champions ?? [];
  const championByName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => [champion.id, champion.nameEn, champion.nameZh, ...(champion.aliases ?? [])].forEach((name) => { if (name) map.set(normalize(name), champion); }));
    return map;
  }, [champions]);
  const allComps = useMemo(() => {
    const seen = new Set<string>();
    return [...localComps, ...metaComps].filter((comp) => { const key = compRefKey(comp); if (seen.has(key)) return false; seen.add(key); return true; });
  }, [localComps]);
  const byRef = useMemo(() => new Map(allComps.map((comp) => [compRefKey(comp), comp])), [allComps]);
  const continueComp = resume ? byRef.get(compRefKey(resume)) ?? null : null;
  const resumeState = resume ? focusStates[compRefKey(resume)] : undefined;
  const resumeStageIndex = resumeState?.stageIndex ?? resume?.stageIndex ?? 0;
  const resumeStage = continueComp?.stages[Math.min(resumeStageIndex, Math.max(0, (continueComp?.stages.length ?? 1) - 1))]?.stage;
  const resumeMirrored = resumeState?.mirrored ?? Boolean(resume?.mirrored);
  const trayComps = tray.map((ref) => ref ? byRef.get(compRefKey(ref)) ?? null : null);
  const personalComps = useMemo(() => {
    const result: Array<{ comp: UnifiedMetaComp; kind: "favorite" | "recent" }> = [];
    const used = new Set<string>();
    favorites.forEach((ref) => { const comp = byRef.get(compRefKey(ref)); if (comp && !used.has(compRefKey(comp))) { used.add(compRefKey(comp)); result.push({ comp, kind: "favorite" }); } });
    recents.forEach((ref) => { const comp = byRef.get(compRefKey(ref)); if (comp && !used.has(compRefKey(comp))) { used.add(compRefKey(comp)); result.push({ comp, kind: "recent" }); } });
    return result.slice(0, 5);
  }, [byRef, favorites, recents]);
  const focusHref = (comp: UnifiedMetaComp) => `/focus?source=${encodeURIComponent(comp.sourceId)}&id=${encodeURIComponent(comp.id)}`;
  const compUnits = (comp: UnifiedMetaComp) => [...comp.coreUnits, ...comp.flexUnits].slice(0, 8).map((name) => championByName.get(normalize(name))).filter((entry): entry is CatalogEntry => Boolean(entry));

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div><div className={styles.eyebrow}>V1.3.2 · OPENING → FOCUS → REVIEW</div><h1>{tr("美服云顶中文副屏助手", "NA TFT companion for fast decisions")}</h1><p>{tr("新对局先把开局英雄与散件交给开局助手，选出 3 套候选；对局中保留各自 Stage 状态，结束后进入复盘。", "Start with your opening units and components, build a three-comp candidate tray, keep each comp's stage state during play, then review the result.")}</p></div>
      <div className={styles.heroActions}><Link className={styles.primaryButton} href="/opening">◇ {tr("开局决策助手", "Opening Assistant")}</Link><Link className={styles.secondaryButton} href="/comps">{tr("直接看阵容库", "Browse comps")}</Link></div>
    </section>

    {continueComp ? <section className={styles.continueCard}><div className={styles.continueIcon}>▶</div><div className={styles.continueText}><span>{tr("继续上次对局", "Continue last focus")}</span><strong>{locale === "zh" ? continueComp.nameZh : continueComp.name}</strong><small>{resumeStage ?? "Stage 2"}{resumeMirrored ? ` · ${tr("已镜像", "Mirrored")}` : ""} · {continueComp.source}</small></div><Link href={focusHref(continueComp)}>{tr("继续", "Continue")}</Link></section> : null}

    <div className={styles.mainGrid}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><div><h2>{tr("本局候选", "Game Candidates")}</h2><p>{tr("候选来自阵容库或开局助手；每套会记住自己的 Stage 与镜像。", "Candidates come from the comp library or Opening Assistant; each remembers its stage and mirror state.")}</p></div><Link href="/opening">{tr("重新匹配", "Rematch")}</Link></div>
        <div className={styles.moduleGrid}>{[0, 1, 2].map((index) => {
          const comp = trayComps[index]; const ref = tray[index];
          if (!comp || !ref) return <Link className={styles.moduleCard} href="/opening" key={index}><b>{index + 1} · {tr("空候选槽", "Empty candidate")}</b><span>{tr("用开局英雄与散件匹配一套阵容。", "Match a comp from your opening units and components.")}</span></Link>;
          const state = focusStates[compRefKey(ref)];
          const stage = comp.stages[Math.min(state?.stageIndex ?? 0, Math.max(0, comp.stages.length - 1))]?.stage ?? "Stage 2";
          return <Link className={styles.moduleCard} href={focusHref(comp)} key={index}><b>{index + 1} · {locale === "zh" ? comp.nameZh : comp.name}</b><span>{stage}{state?.mirrored ? ` · ${tr("镜像", "Mirrored")}` : ""} · {comp.source}</span></Link>;
        })}</div>
        <div className={styles.shortcutTip}><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><strong>{tr("进入 Focus 后直接切候选；按 ? 查看全部快捷键", "Switch candidates in Focus; press ? for all shortcuts")}</strong></div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><div><h2>{tr("快速工具", "Quick Tools")}</h2><p>{tr("从开局到复盘保持一条工作流。", "Keep one workflow from opening to review.")}</p></div></div>
        <div className={styles.moduleGrid}>
          <Link className={styles.moduleCard} href="/opening"><b>◇ {tr("开局助手", "Opening Assistant")}</b><span>{tr("按英雄对子、散件合成和攻略装备匹配候选。", "Match candidates from unit pairs, component crafts and guide items.")}</span></Link>
          <Link className={styles.moduleCard} href="/comps"><b>◆ {tr("阵容库", "Comps")}</b><span>{tr("收藏阵容、手动加入候选并查看新鲜度。", "Favorite comps, pin candidates and inspect freshness.")}</span></Link>
          <Link className={styles.moduleCard} href="/builder"><b>+ Builder Pro</b><span>{tr("站位、装备、角色标记与分享码。", "Positioning, items, roles and share codes.")}</span></Link>
          <Link className={styles.moduleCard} href="/review"><b>◎ {tr("赛后复盘", "Review")}</b><span>{tr("保存名次、问题标签和实际最终棋盘。", "Save placement, issue tags and final board.")}</span></Link>
        </div>
      </section>
    </div>

    {personalComps.length ? <section className={styles.panel}><div className={styles.panelHead}><div><h2>{tr("收藏与最近使用", "Favorites & Recent")}</h2><p>{tr("减少重复搜索，常玩的阵容从这里直接继续。", "Skip repeated searching and reopen the comps you use most.")}</p></div><Link href="/comps">{tr("全部阵容", "All comps")}</Link></div><div className={styles.compList}>{personalComps.map(({ comp, kind }) => {
      const units = compUnits(comp); const freshness = formatFreshness(comp.sourceUpdatedAt, locale);
      return <Link href={focusHref(comp)} className={styles.compRow} key={`${kind}-${comp.sourceId}-${comp.id}`}><span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{kind === "favorite" ? "♥" : comp.tier === "ACTIVE" ? "·" : comp.tier}</span><div className={styles.compName}><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><span>{kind === "favorite" ? tr("收藏", "Favorite") : tr("最近使用", "Recent")} · {comp.source} · {freshness.stale ? "⚠ " : ""}{freshness.label}</span></div><div className={styles.units}>{units.map((unit) => <span className={styles.unitWrap} key={unit.id}><UnitIcon entry={unit} size={36} />{unit.tier ? <span className={styles.costTag}>{unit.tier}</span> : null}</span>)}</div><span className={styles.focusCta}>{tr("继续", "Open")}</span></Link>;
    })}</div></section> : null}

    <section className={styles.panel}><div className={styles.panelHead}><div><h2>{tr("本版本推荐", "Recommended Comps")}</h2><p>{tr("每条攻略显示最近更新时间，过旧来源会给出提醒。", "Every recommendation shows freshness; stale sources are flagged.")}</p></div><Link href="/comps">{tr("全部阵容", "All comps")}</Link></div><div className={styles.compList}>{metaComps.slice(0, 6).map((comp) => {
      const units = compUnits(comp); const freshness = formatFreshness(comp.sourceUpdatedAt, locale);
      return <Link href={focusHref(comp)} className={styles.compRow} key={`${comp.sourceId}-${comp.id}`}><span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span><div className={styles.compName}><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><span>{comp.source} · {freshness.stale ? "⚠ " : ""}{freshness.label}</span></div><div className={styles.units}>{units.map((unit) => <span className={styles.unitWrap} key={unit.id}><UnitIcon entry={unit} size={36} />{unit.tier ? <span className={styles.costTag}>{unit.tier}</span> : null}</span>)}</div><span className={styles.focusCta}>{tr("进入对局", "Focus")}</span></Link>;
    })}</div></section>
  </div>;
}
