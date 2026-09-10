"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import { useLocale } from "../components/LocaleProvider";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { formatFreshness } from "@/lib/freshness";
import { rankOpeningComps, type OpeningChampionPick, type OpeningComponentPick } from "@/lib/opening-assistant";
import { FOCUS_TRAY_KEY, LOCAL_IMPORT_KEY, markWorkspaceChanged } from "@/lib/workspace";
import styles from "./opening.module.css";

type FocusRef = { sourceId: string; id: string };
type CandidateSlot = FocusRef | null;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.sourceId === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.board);
}

function parseTray(value: unknown): CandidateSlot[] {
  if (!Array.isArray(value)) return [null, null, null];
  return [0, 1, 2].map((index) => {
    const entry = value[index];
    if (!entry || typeof entry !== "object") return null;
    const ref = entry as Partial<FocusRef>;
    return typeof ref.sourceId === "string" && typeof ref.id === "string" ? { sourceId: ref.sourceId, id: ref.id } : null;
  });
}

function sameRef(left: FocusRef | null, right: FocusRef) {
  return Boolean(left && left.sourceId === right.sourceId && left.id === right.id);
}

export default function OpeningPage() {
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [championPicks, setChampionPicks] = useState<OpeningChampionPick[]>([]);
  const [componentPicks, setComponentPicks] = useState<OpeningComponentPick[]>([]);
  const [championQuery, setChampionQuery] = useState("");
  const [showAllCosts, setShowAllCosts] = useState(false);
  const [tray, setTray] = useState<CandidateSlot[]>([null, null, null]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()).then(setCatalog).catch(() => setCatalog(null));
    try {
      const imported = JSON.parse(window.localStorage.getItem(LOCAL_IMPORT_KEY) || "[]") as unknown[];
      setLocalComps(imported.filter(isManualComp));
      setTray(parseTray(JSON.parse(window.localStorage.getItem(FOCUS_TRAY_KEY) || "[]")));
    } catch {
      setLocalComps([]);
    }
  }, []);

  const champions = catalog?.champions ?? [];
  const items = catalog?.items ?? [];
  const components = catalog?.components ?? [];
  const recipes = catalog?.recipes ?? [];
  const allComps = useMemo(() => {
    const seen = new Set<string>();
    return [...localComps, ...metaComps].filter((comp) => {
      const key = `${comp.sourceId}:${comp.id}:${comp.patch}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localComps]);

  const championById = useMemo(() => new Map(champions.map((champion) => [champion.id, champion])), [champions]);
  const pickCount = useMemo(() => new Map(championPicks.map((pick) => [pick.id, pick.count])), [championPicks]);
  const componentCount = useMemo(() => new Map(componentPicks.map((pick) => [normalize(pick.nameEn), pick.count])), [componentPicks]);
  const visibleChampions = useMemo(() => {
    const q = normalize(championQuery);
    return champions.filter((champion) => {
      if (!showAllCosts && (champion.tier ?? 9) > 3) return false;
      if (!q) return true;
      return normalize(`${champion.nameZh} ${champion.nameEn} ${champion.id}`).includes(q);
    }).sort((left, right) => (left.tier ?? 9) - (right.tier ?? 9) || left.nameEn.localeCompare(right.nameEn)).slice(0, 32);
  }, [championQuery, champions, showAllCosts]);

  const ranked = useMemo(() => rankOpeningComps({ comps: allComps, champions, items, recipes, championPicks, componentPicks }), [allComps, championPicks, champions, componentPicks, items, recipes]);
  const hasSignals = championPicks.length > 0 || componentPicks.length > 0;
  const topMatches = hasSignals ? ranked.slice(0, 5) : [];

  function adjustChampion(id: string, delta: number) {
    setChampionPicks((current) => {
      const count = current.find((pick) => pick.id === id)?.count ?? 0;
      const nextCount = Math.max(0, Math.min(3, count + delta));
      if (!nextCount) return current.filter((pick) => pick.id !== id);
      if (count) return current.map((pick) => pick.id === id ? { ...pick, count: nextCount } : pick);
      return [...current, { id, count: nextCount }];
    });
    setMessage("");
  }

  function adjustComponent(nameEn: string, delta: number) {
    setComponentPicks((current) => {
      const count = current.find((pick) => normalize(pick.nameEn) === normalize(nameEn))?.count ?? 0;
      const nextCount = Math.max(0, Math.min(4, count + delta));
      if (!nextCount) return current.filter((pick) => normalize(pick.nameEn) !== normalize(nameEn));
      if (count) return current.map((pick) => normalize(pick.nameEn) === normalize(nameEn) ? { ...pick, count: nextCount } : pick);
      return [...current, { nameEn, count: nextCount }];
    });
    setMessage("");
  }

  function persistTray(next: CandidateSlot[]) {
    setTray(next);
    try {
      window.localStorage.setItem(FOCUS_TRAY_KEY, JSON.stringify(next));
      markWorkspaceChanged();
    } catch {}
  }

  function addCandidate(comp: UnifiedMetaComp) {
    const ref = { sourceId: comp.sourceId, id: comp.id };
    const existing = tray.findIndex((slot) => sameRef(slot, ref));
    if (existing >= 0) {
      setMessage(tr(`已经在候选 ${existing + 1}`, `Already in candidate ${existing + 1}`));
      return;
    }
    const empty = tray.findIndex((slot) => slot === null);
    const target = empty >= 0 ? empty : 2;
    const next = [...tray];
    next[target] = ref;
    persistTray(next);
    setMessage(tr(`已加入候选 ${target + 1}`, `Added to candidate ${target + 1}`));
  }

  function pinTopThree() {
    if (!topMatches.length) return;
    const next: CandidateSlot[] = [0, 1, 2].map((index) => topMatches[index] ? { sourceId: topMatches[index].comp.sourceId, id: topMatches[index].comp.id } : null);
    persistTray(next);
    setMessage(tr("Top 3 已写入候选 1 / 2 / 3。", "Top 3 saved to candidates 1 / 2 / 3."));
  }

  function clearInput() {
    setChampionPicks([]);
    setComponentPicks([]);
    setChampionQuery("");
    setMessage("");
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span className={styles.eyebrow}>V1.3.2 · OPENING ASSISTANT</span><h1>{tr("开局决策助手", "Opening Assistant")}</h1><p>{tr("把你实际拿到的英雄和散件填进来，按核心单位命中、可合成推荐装备、阵容强度与来源新鲜度给出候选。不是实时读盘，也不会替你自动操作。", "Enter the units and components you actually have. Recommendations combine core-unit hits, craftable item fit, comp strength and source freshness. No live game reading or automated play.")}</p></div>
        <div className={styles.headingActions}><button onClick={clearInput}>{tr("清空输入", "Clear")}</button>{hasSignals ? <button className={styles.primary} onClick={pinTopThree}>{tr("Top 3 → 候选夹", "Top 3 → Tray")}</button> : null}</div>
      </header>

      <section className={styles.trayStrip}>
        <strong>{tr("当前候选", "Current candidates")}</strong>
        {[0, 1, 2].map((index) => <span key={index}><b>{index + 1}</b>{tray[index] ? `${tray[index]?.sourceId} · ${tray[index]?.id}` : tr("空", "Empty")}</span>)}
        {message ? <em>{message}</em> : null}
      </section>

      <div className={styles.inputGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>{tr("1. 开局英雄", "1. Opening units")}</h2><p>{tr("重复来牌可以加到 ×2 / ×3，核心对子会提高匹配权重。", "Increase a unit to ×2 / ×3; core pairs receive more weight.")}</p></div><button onClick={() => setShowAllCosts((value) => !value)}>{showAllCosts ? tr("只看 1–3 费", "1–3 cost only") : tr("显示全部费用", "Show all costs")}</button></div>
          <div className={styles.searchRow}><input value={championQuery} onChange={(event) => setChampionQuery(event.target.value)} placeholder={tr("搜索英雄 / English name", "Search champion / 中文名")} /><span>{championPicks.reduce((sum, pick) => sum + pick.count, 0)} {tr("张", "copies")}</span></div>
          <div className={styles.championGrid}>{visibleChampions.map((champion) => {
            const count = pickCount.get(champion.id) ?? 0;
            return <div className={`${styles.championPick} ${count ? styles.selected : ""}`} key={champion.id}><button className={styles.championMain} onClick={() => adjustChampion(champion.id, 1)}><UnitIcon entry={champion} size={38} /><span><strong>{nameOf(champion)}</strong><small>{secondaryNameOf(champion)} · {champion.tier ?? "—"} {tr("费", "cost")}</small></span>{count ? <b>×{count}</b> : <b>+</b>}</button>{count ? <button className={styles.minus} onClick={() => adjustChampion(champion.id, -1)}>−</button> : null}</div>;
          })}</div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>{tr("2. 散件", "2. Components")}</h2><p>{tr("系统会检查这些散件能合成哪些成装，再和攻略的装备优先级匹配。", "The assistant checks what these components can craft, then matches those items against each guide's item priorities.")}</p></div></div>
          <div className={styles.componentGrid}>{components.map((component) => {
            const count = componentCount.get(normalize(component.nameEn)) ?? 0;
            return <div className={`${styles.componentPick} ${count ? styles.selected : ""}`} key={component.id}><button onClick={() => adjustComponent(component.nameEn, 1)}>{component.imageUrl ? <Image src={component.imageUrl} alt={component.nameEn} width={38} height={38} unoptimized /> : <span className={styles.fallback}>◈</span>}<span><strong>{nameOf(component)}</strong><small>{component.nameEn}</small></span><b>{count ? `×${count}` : "+"}</b></button>{count ? <button className={styles.minus} onClick={() => adjustComponent(component.nameEn, -1)}>−</button> : null}</div>;
          })}</div>
          <div className={styles.selectionSummary}><span>{tr("已选散件", "Selected")}</span><strong>{componentPicks.length ? componentPicks.map((pick) => `${pick.nameEn} ×${pick.count}`).join(" · ") : tr("点击散件开始", "Click components to begin")}</strong></div>
        </section>
      </div>

      <section className={styles.results}>
        <div className={styles.resultsHead}><div><h2>{tr("推荐候选", "Recommended candidates")}</h2><p>{hasSignals ? tr("匹配分只表示你当前开局资源与这套阵容的契合度，不等于全局胜率。", "The match score reflects fit with your current opening resources, not global win rate.") : tr("先选择至少一个英雄或散件。", "Select at least one unit or component first.")}</p></div>{hasSignals ? <span>{topMatches.length} {tr("套候选", "matches")}</span> : null}</div>
        {!hasSignals ? <div className={styles.empty}>{tr("例如：凯尔 ×2 + 大剑 + 拳套 + 反曲弓。系统会立刻重排阵容。", "Example: Kayle ×2 + B.F. Sword + Sparring Gloves + Recurve Bow. Results rerank instantly.")}</div> : <div className={styles.resultList}>{topMatches.map((match, index) => {
          const freshness = formatFreshness(match.comp.sourceUpdatedAt, locale);
          const coreText = match.coreMatches.map(({ champion, count }) => `${nameOf(champion)} ×${count}`).join(" · ");
          const flexText = match.flexMatches.map(({ champion, count }) => `${nameOf(champion)} ×${count}`).join(" · ");
          const itemText = match.craftableItemMatches.map(nameOf).join(" · ");
          const href = `/focus?source=${encodeURIComponent(match.comp.sourceId)}&id=${encodeURIComponent(match.comp.id)}`;
          return <article className={styles.resultCard} key={`${match.comp.sourceId}-${match.comp.id}`}>
            <div className={styles.rank}>{index + 1}</div>
            <div className={styles.score}><strong>{match.score}</strong><span>MATCH</span></div>
            <div className={styles.resultBody}><div className={styles.resultTitle}><div><h3>{locale === "zh" ? match.comp.nameZh : match.comp.name}</h3><p>{match.comp.source} · {match.comp.playstyle} · {freshness.stale ? "⚠ " : ""}{freshness.label}</p></div><span className={styles[`tier${match.comp.tier}`]}>{match.comp.tier}</span></div>
              <div className={styles.bars}><span><i style={{ width: `${Math.min(100, match.unitScore * 1.85)}%` }} />{tr("英雄匹配", "Units")} {match.unitScore}</span><span><i style={{ width: `${Math.min(100, match.itemScore * 2.85)}%` }} />{tr("装备匹配", "Items")} {match.itemScore}</span></div>
              <div className={styles.reasons}>{coreText ? <span><b>{tr("核心命中", "Core hits")}</b>{coreText}</span> : null}{flexText ? <span><b>Flex</b>{flexText}</span> : null}{itemText ? <span><b>{tr("可合成命中", "Craftable fit")}</b>{itemText}</span> : null}{!coreText && !flexText && !itemText ? <span><b>{tr("基础匹配", "Baseline")}</b>{tr("当前主要来自阵容 Tier；建议再补充英雄或散件。", "Mostly driven by comp tier; add more units or components for a stronger signal.")}</span> : null}</div>
            </div>
            <div className={styles.resultActions}><button onClick={() => addCandidate(match.comp)}>☆ {tr("加入候选", "Add to tray")}</button><Link href={href}>◉ {tr("进入 Focus", "Open Focus")}</Link></div>
          </article>;
        })}</div>}
      </section>
    </div>
  );
}
