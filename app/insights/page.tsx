"use client";

import Link from "next/link";
import { metaComps } from "@/data/meta";
import { useEffect, useMemo, useState } from "react";
import { buildReviewIntelligence } from "@/lib/review-intelligence";
import { parseReviewHistory, reviewTagLabel, type ReviewIssueTag, type ReviewRecord } from "@/lib/review";
import { REVIEW_HISTORY_KEY, WORKSPACE_EVENT } from "@/lib/workspace";
import { useLocale } from "../components/LocaleProvider";
import TrainingFocusPanel from "../components/TrainingFocusPanel";
import styles from "./insights-maintenance.module.css";

type WindowSize = 10 | 20 | 50;

function avg(records: ReviewRecord[]) {
  return records.length ? records.reduce((sum, record) => sum + record.placement, 0) / records.length : 0;
}

export default function InsightsPage() {
  const { locale, tr } = useLocale();
  const [history, setHistory] = useState<ReviewRecord[]>([]);
  const [windowSize, setWindowSize] = useState<WindowSize>(20);
  const [compFilter, setCompFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    const id = params.get("id");
    if (source && id) setCompFilter(`${source}:${id}`);
  }, []);

  useEffect(() => {
    const load = () => {
      try {
        const raw = window.localStorage.getItem(REVIEW_HISTORY_KEY);
        setHistory(parseReviewHistory(raw ? JSON.parse(raw) : []));
      } catch { setHistory([]); }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === REVIEW_HISTORY_KEY) load(); };
    load();
    window.addEventListener(WORKSPACE_EVENT, load);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(WORKSPACE_EVENT, load); window.removeEventListener("storage", onStorage); };
  }, []);

  const compOptions = useMemo(() => {
    const map = new Map<string, { zh: string; en: string }>();
    history.forEach((record) => map.set(`${record.sourceId}:${record.compId}`, { zh: record.plannedNameZh, en: record.plannedNameEn }));
    if (compFilter !== "all" && !map.has(compFilter)) {
      const comp = metaComps.find((entry) => `${entry.sourceId}:${entry.id}` === compFilter);
      map.set(compFilter, { zh: comp?.nameZh ?? compFilter, en: comp?.name ?? compFilter });
    }
    return [...map.entries()];
  }, [history, compFilter]);

  const windowed = useMemo(() => history.slice(0, windowSize).filter((record) => compFilter === "all" || `${record.sourceId}:${record.compId}` === compFilter), [history, windowSize, compFilter]);
  const data = useMemo(() => buildReviewIntelligence(windowed, locale), [windowed, locale]);
  const scopeNames = useMemo(() => compFilter === "all" ? null : compOptions.find(([key]) => key === compFilter)?.[1] ?? null, [compFilter, compOptions]);

  const comparison = useMemo(() => {
    const half = Math.floor(windowed.length / 2);
    if (half < 3) return null;
    const recent = windowed.slice(0, half);
    const older = windowed.slice(half, half * 2);
    const recentAvg = avg(recent);
    const olderAvg = avg(older);
    return { recentAvg, olderAvg, delta: recentAvg - olderAvg };
  }, [windowed]);

  const issueChange = useMemo(() => {
    const half = Math.floor(windowed.length / 2);
    if (half < 3) return [] as Array<{ tag: ReviewIssueTag; recent: number; older: number; delta: number }>;
    const count = (records: ReviewRecord[]) => {
      const map = new Map<ReviewIssueTag, number>();
      records.forEach((record) => record.tags.forEach((tag) => map.set(tag, (map.get(tag) ?? 0) + 1)));
      return map;
    };
    const recent = count(windowed.slice(0, half));
    const older = count(windowed.slice(half, half * 2));
    return [...new Set([...recent.keys(), ...older.keys()])].map((tag) => ({ tag, recent: recent.get(tag) ?? 0, older: older.get(tag) ?? 0, delta: (recent.get(tag) ?? 0) - (older.get(tag) ?? 0) })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [windowed]);

  if (!windowed.length && compFilter !== "all") {
    const name = compOptions.find(([key]) => key === compFilter)?.[1];
    const comp = metaComps.find((entry) => `${entry.sourceId}:${entry.id}` === compFilter);
    const hasOlder = history.some((record) => `${record.sourceId}:${record.compId}` === compFilter);
    return <div className={styles.empty}><span>V1.6.9 · REVIEW INTELLIGENCE</span><h1>{name ? tr(name.zh, name.en) : compFilter}</h1><p>{hasOlder ? tr(`最近 ${windowSize} 局中没有这套阵容的记录，可在历史中查看更早的复盘。`, `No records for this comp in your last ${windowSize} games. Older reviews are available in history.`) : tr("这套阵容暂无个人复盘。完成一局并保存复盘后，再回来查看。", "No personal reviews for this comp yet. Complete a game and save its review, then return here.")}</p><div className={styles.actions}><Link href="/review/history">{tr("查看复盘历史", "Review history")}</Link>{comp ? <Link href={`/focus?source=${encodeURIComponent(comp.sourceId)}&id=${encodeURIComponent(comp.id)}`}>{tr("用这套阵容开始对局", "Start with this comp")}</Link> : <Link href="/comps">{tr("返回阵容库", "Back to comps")}</Link>}<button onClick={() => setCompFilter("all")}>{tr("查看全部阵容", "Show all comps")}</button></div></div>;
  }
  if (!history.length) return <div className={styles.empty}><span>V1.6.9 · REVIEW INTELLIGENCE</span><h1>{tr("先积累第一局复盘", "Save your first review")}</h1><p>{tr("个人洞察只读取你自己保存的复盘。", "Personal insights only read your saved reviews.")}</p><Link href="/review">{tr("去赛后复盘", "Open Review Center")}</Link></div>;

  return (
    <div className={styles.page}>
      <header className={styles.heading}><div><span>V1.6.9 · REVIEW INTELLIGENCE</span><h1>{tr("个人复盘洞察", "Personal Review Intelligence")}</h1><p>{tr("用 10 / 20 / 50 局窗口观察名次、问题标签和单阵容样本变化，并把重复问题直接转成下一阶段 5 局训练目标。只描述你自己的记录，不做因果推断。", "Use 10 / 20 / 50-game windows to inspect placement, issue-tag and per-comp trends, then turn repeated issues into a five-game practice block. This only describes your own records and does not infer causality.")}</p></div><div className={styles.actions}><Link href="/review/history">{tr("管理历史", "Manage history")}</Link><Link href="/review">{tr("记录新一局", "Add review")}</Link><Link href="/share">{tr("分享", "Share")}</Link></div></header>

      <section className={styles.controls}><label><span>{tr("趋势窗口", "Trend window")}</span><select value={windowSize} onChange={(event) => setWindowSize(Number(event.target.value) as WindowSize)}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><label><span>{tr("阵容样本", "Comp sample")}</span><select value={compFilter} onChange={(event) => setCompFilter(event.target.value)}><option value="all">{tr("全部阵容", "All comps")}</option>{compOptions.map(([key, name]) => <option key={key} value={key}>{locale === "zh" ? name.zh : name.en}</option>)}</select></label></section>

      <section className={styles.kpis}><article><span>{tr("当前样本", "Sample")}</span><strong>{data.games}</strong></article><article><span>{tr("平均名次", "Average")}</span><strong>{data.games ? data.average.toFixed(2) : "—"}</strong></article><article><span>Top 4</span><strong>{data.games ? `${Math.round(data.top4Rate * 100)}%` : "—"}</strong></article><article><span>{tr("吃鸡率", "Win rate")}</span><strong>{data.games ? `${Math.round(data.winRate * 100)}%` : "—"}</strong></article></section>

      <section className={styles.trendCard}><div className={styles.cardHead}><div><h2>{tr(`最近 ${windowSize} 局趋势`, `Last ${windowSize} trend`)}</h2><p>{tr("柱子越高表示名次越靠前。", "Taller bars mean a better placement.")}</p></div>{comparison ? <div className={styles.delta}><span>{tr("前后半窗比较", "Half-window comparison")}</span><strong className={comparison.delta < 0 ? styles.goodText : comparison.delta > 0 ? styles.badText : ""}>{comparison.delta < 0 ? "↓" : comparison.delta > 0 ? "↑" : "→"} {Math.abs(comparison.delta).toFixed(2)}</strong><small>{tr(`近期 ${comparison.recentAvg.toFixed(2)} / 较早 ${comparison.olderAvg.toFixed(2)}`, `recent ${comparison.recentAvg.toFixed(2)} / older ${comparison.olderAvg.toFixed(2)}`)}</small></div> : null}</div><div className={styles.chart}>{windowed.slice().reverse().map((record) => <div key={record.id}><span style={{ height: `${24 + (9 - record.placement) * 7}px` }} className={record.placement <= 4 ? styles.top4 : styles.bottom4}><b>{record.placement}</b></span><small>#{record.placement}</small></div>)}</div></section>

      <div className={styles.grid}><section className={styles.card}><div className={styles.cardHead}><div><h2>{tr("问题标签频率", "Issue-tag frequency")}</h2><p>{tr("显示当前窗口中最常记录的问题。", "Shows the most frequently recorded issues in this window.")}</p></div></div><div className={styles.issueList}>{data.issues.length ? data.issues.slice(0, 6).map((issue) => <div key={issue.tag}><span><strong>{reviewTagLabel(issue.tag, locale)}</strong><small>{issue.count} {tr("次", "times")}</small></span><b>{Math.round(issue.rate * 100)}%</b></div>) : <p>{tr("暂无标签。", "No tags yet.")}</p>}</div></section>

      <section className={styles.card}><div className={styles.cardHead}><div><h2>{tr("标签变化", "Issue changes")}</h2><p>{tr("最近半窗与较早半窗的手动标签次数差。", "Difference in manual tag counts between the recent and older half of the window.")}</p></div></div><div className={styles.issueList}>{issueChange.length ? issueChange.slice(0, 6).map((issue) => <div key={issue.tag}><span><strong>{reviewTagLabel(issue.tag, locale)}</strong><small>{tr(`近期 ${issue.recent} / 较早 ${issue.older}`, `recent ${issue.recent} / older ${issue.older}`)}</small></span><b className={issue.delta < 0 ? styles.goodText : issue.delta > 0 ? styles.badText : ""}>{issue.delta > 0 ? "+" : ""}{issue.delta}</b></div>) : <p>{tr("需要更多样本进行比较。", "More samples are needed for comparison.")}</p>}</div></section></div>

      <section className={styles.card}><div className={styles.cardHead}><div><h2>{tr("个人阵容表现", "Your comp performance")}</h2><p>{tr("这是你的个人复盘样本，不是全服数据。", "This is your personal review sample, not global ladder data.")}</p></div></div><div className={styles.compList}>{data.comps.map((comp) => <div key={comp.key}><span><strong>{locale === "zh" ? comp.nameZh : comp.nameEn}</strong><small>{comp.games} {tr("局", "games")}</small></span><b>{comp.average.toFixed(2)}</b><em>{Math.round(comp.top4Rate * 100)}% Top4</em></div>)}</div></section>

      <TrainingFocusPanel history={history} sample={windowed} scopeKey={compFilter} scopeNames={scopeNames} />

      <section className={styles.observations}><h2>{tr("数据观察", "Recorded observations")}</h2><ol>{data.observations.map((item) => <li key={item}>{item}</li>)}</ol></section>
    </div>
  );
}
