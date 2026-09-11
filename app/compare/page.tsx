"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import { useLocale } from "../components/LocaleProvider";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { TftCatalogPayload } from "@/data/tft";
import {
  assessTransition,
  buildCandidateSnapshots,
  sharedChampionsAcrossAll,
  sharedItemsAcrossAll,
  uniqueChampionsFor,
} from "@/lib/candidate-compare";
import { formatFreshness } from "@/lib/freshness";
import { rankOpeningComps } from "@/lib/opening-assistant";
import { parseOpeningSession, type OpeningSession } from "@/lib/opening-session";
import {
  FOCUS_COMP_STATES_KEY,
  FOCUS_TRAY_KEY,
  LOCAL_IMPORT_KEY,
  OPENING_SESSION_KEY,
  compRefKey,
  markWorkspaceChanged,
  parseFocusCompStates,
  type StoredCompRef,
  type StoredFocusCompStateStore,
} from "@/lib/workspace";
import styles from "./compare.module.css";

type CandidateSlot = StoredCompRef | null;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT"
    && comp.syncOrigin === "manual"
    && typeof comp.id === "string"
    && typeof comp.sourceId === "string"
    && Array.isArray(comp.coreUnits)
    && Array.isArray(comp.board);
}

function parseTray(value: unknown): CandidateSlot[] {
  if (!Array.isArray(value)) return [null, null, null];
  return [0, 1, 2].map((index) => {
    const entry = value[index];
    if (!entry || typeof entry !== "object") return null;
    const ref = entry as Partial<StoredCompRef>;
    return typeof ref.sourceId === "string" && typeof ref.id === "string"
      ? { sourceId: ref.sourceId, id: ref.id }
      : null;
  });
}

function readJson(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}

function difficultyLabel(value: UnifiedMetaComp["difficulty"], locale: "zh" | "en") {
  if (locale === "en") return value;
  if (value === "EASY") return "简单";
  if (value === "HARD") return "困难";
  return "中等";
}

function transitionLabel(band: "LOW" | "MEDIUM" | "HIGH", locale: "zh" | "en") {
  if (locale === "en") return band === "LOW" ? "Low cost" : band === "MEDIUM" ? "Medium cost" : "High cost";
  return band === "LOW" ? "低成本" : band === "MEDIUM" ? "中等成本" : "高成本";
}

const PLAN_LABELS = ["A", "B", "C"] as const;

export default function CandidateComparePage() {
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [tray, setTray] = useState<CandidateSlot[]>([null, null, null]);
  const [focusStates, setFocusStates] = useState<StoredFocusCompStateStore>({});
  const [opening, setOpening] = useState<OpeningSession>({ championPicks: [], componentPicks: [], updatedAt: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
    try {
      const imported = readJson(LOCAL_IMPORT_KEY);
      setLocalComps(Array.isArray(imported) ? imported.filter(isManualComp) : []);
      setTray(parseTray(readJson(FOCUS_TRAY_KEY)));
      setFocusStates(parseFocusCompStates(readJson(FOCUS_COMP_STATES_KEY)));
      setOpening(parseOpeningSession(readJson(OPENING_SESSION_KEY)));
    } finally {
      setReady(true);
    }
  }, []);

  const champions = catalog?.champions ?? [];
  const items = catalog?.items ?? [];
  const recipes = catalog?.recipes ?? [];
  const allComps = useMemo(() => {
    const seen = new Set<string>();
    return [...localComps, ...metaComps].filter((comp) => {
      const key = compRefKey(comp);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localComps]);
  const compByRef = useMemo(() => new Map(allComps.map((comp) => [compRefKey(comp), comp])), [allComps]);
  const candidates = useMemo(() => tray
    .map((ref, slotIndex) => ref ? { ref, slotIndex, comp: compByRef.get(compRefKey(ref)) ?? null } : null)
    .filter((entry): entry is { ref: StoredCompRef; slotIndex: number; comp: UnifiedMetaComp } => Boolean(entry?.comp)), [compByRef, tray]);
  const candidateComps = useMemo(() => candidates.map((entry) => entry.comp), [candidates]);
  const snapshots = useMemo(() => buildCandidateSnapshots(candidateComps, champions, items), [candidateComps, champions, items]);
  const hasOpeningSignals = opening.championPicks.length > 0 || opening.componentPicks.length > 0;
  const ranked = useMemo(() => hasOpeningSignals
    ? rankOpeningComps({ comps: allComps, champions, items, recipes, championPicks: opening.championPicks, componentPicks: opening.componentPicks })
    : [], [allComps, champions, hasOpeningSignals, items, opening.championPicks, opening.componentPicks, recipes]);
  const matchByRef = useMemo(() => new Map(ranked.map((match) => [compRefKey(match.comp), match])), [ranked]);
  const sharedChampions = useMemo(() => sharedChampionsAcrossAll(snapshots), [snapshots]);
  const sharedItems = useMemo(() => sharedItemsAcrossAll(snapshots), [snapshots]);
  const transitions = useMemo(() => {
    if (snapshots.length < 2) return [];
    return snapshots.slice(1).map((snapshot, index) => ({
      plan: PLAN_LABELS[index + 1],
      snapshot,
      assessment: assessTransition(snapshots[0], snapshot),
    }));
  }, [snapshots]);

  function setPrimary(candidateIndex: number) {
    const selected = candidates[candidateIndex];
    if (!selected) return;
    const orderedRefs = [
      selected.ref,
      ...candidates.filter((_, index) => index !== candidateIndex).map((entry) => entry.ref),
    ].slice(0, 3);
    const next: CandidateSlot[] = [orderedRefs[0] ?? null, orderedRefs[1] ?? null, orderedRefs[2] ?? null];
    setTray(next);
    try {
      window.localStorage.setItem(FOCUS_TRAY_KEY, JSON.stringify(next));
      markWorkspaceChanged();
    } catch {}
  }

  if (!ready || !catalog) {
    return <div className={styles.empty}><strong>{tr("正在准备候选对比…", "Preparing candidate comparison…")}</strong></div>;
  }

  if (candidates.length < 2) {
    return <div className={styles.empty}><span className={styles.eyebrow}>V1.3.3 · CANDIDATE COMPARE</span><h1>{tr("至少需要 2 套候选阵容", "At least two candidates are required")}</h1><p>{tr("先在开局助手生成 Top 3，或者从阵容库加入候选，再回来横向比较。", "Generate a Top 3 in Opening Assistant or add candidates from the comp library, then return here to compare them.")}</p><div><Link href="/opening">{tr("打开开局助手", "Opening Assistant")}</Link><Link href="/comps">{tr("浏览阵容库", "Browse comps")}</Link></div></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span className={styles.eyebrow}>V1.3.3 · CANDIDATE COMPARE</span><h1>{tr("候选阵容决策台", "Candidate Compare")}</h1><p>{tr("把 Plan A / B / C 放在同一屏比较。这里只展示来源数据、开局资源契合度和静态换阵成本，不根据实时对局替你做决定。", "Compare Plan A / B / C on one screen. This view uses source data, opening-resource fit and static transition cost; it does not make live-game decisions for you.")}</p></div>
        <div className={styles.headingActions}><Link href="/opening">{tr("修改开局输入", "Edit opening")}</Link><Link className={styles.primary} href={`/focus?source=${encodeURIComponent(candidates[0].comp.sourceId)}&id=${encodeURIComponent(candidates[0].comp.id)}`}>◉ {tr("进入 Plan A", "Open Plan A")}</Link></div>
      </header>

      <section className={styles.signalBar}>
        <div><span>{tr("开局信号", "Opening signals")}</span><strong>{hasOpeningSignals ? tr(`${opening.championPicks.reduce((sum, pick) => sum + pick.count, 0)} 张英雄 · ${opening.componentPicks.reduce((sum, pick) => sum + pick.count, 0)} 个散件`, `${opening.championPicks.reduce((sum, pick) => sum + pick.count, 0)} unit copies · ${opening.componentPicks.reduce((sum, pick) => sum + pick.count, 0)} components`) : tr("没有保存的开局输入", "No saved opening input")}</strong></div>
        <div><span>{tr("三套都能保留的英雄", "Units shared by every plan")}</span><strong>{sharedChampions.length ? sharedChampions.map(nameOf).join(" · ") : tr("暂无共同英雄", "No shared units")}</strong></div>
        <div><span>{tr("三套共同具体成装", "Exact items shared by every plan")}</span><strong>{sharedItems.length ? sharedItems.map(nameOf).join(" · ") : tr("来源暂无共同具体成装", "No exact shared item in the source data")}</strong></div>
      </section>

      <section className={styles.planGrid}>
        {snapshots.map((snapshot, index) => {
          const plan = PLAN_LABELS[index];
          const match = matchByRef.get(compRefKey(snapshot.comp));
          const freshness = formatFreshness(snapshot.comp.sourceUpdatedAt, locale);
          const state = focusStates[compRefKey(snapshot.comp)];
          const stage = snapshot.comp.stages[Math.min(state?.stageIndex ?? 0, Math.max(0, snapshot.comp.stages.length - 1))]?.stage ?? "Stage 2";
          const uniqueUnits = uniqueChampionsFor(snapshot, snapshots);
          const focusHref = `/focus?source=${encodeURIComponent(snapshot.comp.sourceId)}&id=${encodeURIComponent(snapshot.comp.id)}`;
          return (
            <article className={`${styles.planCard} ${index === 0 ? styles.primaryPlan : ""}`} key={compRefKey(snapshot.comp)}>
              <div className={styles.planTop}><span className={styles.planBadge}>PLAN {plan}</span><span className={styles.tier}>{snapshot.comp.tier}</span></div>
              <h2>{locale === "zh" ? snapshot.comp.nameZh : snapshot.comp.name}</h2>
              <p className={styles.sub}>{snapshot.comp.source} · {snapshot.comp.playstyle} · {freshness.stale ? "⚠ " : ""}{freshness.label}</p>
              <div className={styles.kpis}><div><strong>{match ? match.score : "—"}</strong><span>MATCH</span></div><div><strong>{stage}</strong><span>{state?.mirrored ? tr("已镜像", "Mirrored") : tr("未镜像", "Normal")}</span></div><div><strong>{match?.coreMatches.length ?? 0}</strong><span>{tr("核心命中", "Core hits")}</span></div></div>

              <div className={styles.section}><span>{tr("核心英雄", "Core units")}</span><div className={styles.coreUnits}>{snapshot.core.map((unit) => <div key={unit.id} title={`${unit.nameZh} / ${unit.nameEn}`}><UnitIcon entry={unit} size={36} /><small>{nameOf(unit)}</small></div>)}</div></div>
              <div className={styles.section}><span>Flex</span><p>{snapshot.flex.length ? snapshot.flex.slice(0, 7).map(nameOf).join(" · ") : "—"}</p></div>
              <div className={styles.section}><span>{tr("只属于这套候选", "Unique to this plan")}</span><p>{uniqueUnits.length ? uniqueUnits.slice(0, 7).map(nameOf).join(" · ") : tr("主要与其他候选共享", "Mostly shared with the other candidates")}</p></div>
              <div className={styles.section}><span>{tr("攻略装备重点", "Guide item focus")}</span><p>{snapshot.comp.itemFocus.length ? snapshot.comp.itemFocus.join(" · ") : "—"}</p></div>
              <div className={styles.section}><span>{tr("来源明确的具体成装", "Exact source-backed items")}</span><p>{snapshot.recommendedItems.length ? snapshot.recommendedItems.map(nameOf).join(" · ") : tr("来源未列出可解析的具体成装", "No parseable exact item listed by the source")}</p></div>
              <div className={styles.section}><span>{tr("当前散件可命中的成装", "Craftable opening hits")}</span><p>{match?.craftableItemMatches.length ? match.craftableItemMatches.map(nameOf).join(" · ") : tr("暂无具体成装命中", "No exact craftable item hit")}</p></div>
              <div className={styles.factGrid}><div><span>{tr("运营节奏", "Tempo")}</span><strong>{snapshot.comp.playstyle}</strong></div><div><span>{tr("来源搜牌等级", "Source roll level")}</span><strong>{snapshot.rollLevel ? `Lv. ${snapshot.rollLevel}` : "—"}</strong></div><div><span>{tr("难度", "Difficulty")}</span><strong>{difficultyLabel(snapshot.comp.difficulty, locale)}</strong></div></div>
              <div className={styles.when}><span>{tr("什么时候玩", "When to play")}</span><p>{snapshot.comp.whenToPlay || "—"}</p></div>
              <div className={styles.actions}>{index !== 0 ? <button onClick={() => setPrimary(index)}>{tr("设为 Plan A", "Make Plan A")}</button> : <span>{tr("当前主计划", "Current primary")}</span>}<Link href={focusHref}>◉ Focus</Link></div>
            </article>
          );
        })}
      </section>

      <section className={styles.transitionCard}>
        <div className={styles.sectionHead}><div><h2>{tr("Plan A 的静态换阵成本", "Static transition cost from Plan A")}</h2><p>{tr("只按共享英雄、共享具体装备、核心位和运营节奏估算。分数越高代表保留资产越多；不是实时转阵指令。", "Estimated only from shared units, exact items, core slots and tempo. A higher score means more assets carry over; this is not a live pivot instruction.")}</p></div></div>
        <div className={styles.transitionGrid}>{transitions.map(({ plan, snapshot, assessment }) => <article key={compRefKey(snapshot.comp)}><div><span>PLAN A → PLAN {plan}</span><strong>{transitionLabel(assessment.band, locale)}</strong><em>{assessment.score}/100</em></div><p>{tr("共享英雄", "Shared units")}: {assessment.sharedUnits.length ? assessment.sharedUnits.map(nameOf).join(" · ") : tr("无", "None")}</p><p>{tr("共享核心", "Shared core")}: {assessment.sharedCore.length ? assessment.sharedCore.map(nameOf).join(" · ") : tr("无", "None")}</p><p>{tr("共享具体装备", "Shared exact items")}: {assessment.sharedItems.length ? assessment.sharedItems.map(nameOf).join(" · ") : tr("无", "None")}</p><p>{tr("运营节奏", "Tempo")}: {assessment.sameTempo ? tr("接近", "Similar") : tr("不同", "Different")}</p></article>)}</div>
      </section>

      <section className={styles.note}><strong>{tr("怎么看这页：", "How to use this page: ")}</strong>{tr("Plan A 是当前主计划；B/C 只是备选。优先看你已经拥有的核心牌和能做出的装备，再看换阵成本。具体对局仍由你的血量、经济、来牌和对手决定。", "Plan A is your current primary; B/C remain fallbacks. Start with the core units you already own and the items you can make, then use transition cost as context. Your actual game still depends on HP, economy, shops and opponents.")}</section>
    </div>
  );
}
