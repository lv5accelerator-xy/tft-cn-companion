"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildReviewIntelligence } from "@/lib/review-intelligence";
import { parseReviewHistory, reviewTagLabel, type ReviewRecord } from "@/lib/review";
import { REVIEW_HISTORY_KEY, WORKSPACE_EVENT } from "@/lib/workspace";
import { useLocale } from "../components/LocaleProvider";
import styles from "./insights.module.css";

export default function InsightsPage() {
  const { locale, tr } = useLocale();
  const [history, setHistory] = useState<ReviewRecord[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        const raw = window.localStorage.getItem(REVIEW_HISTORY_KEY);
        setHistory(parseReviewHistory(raw ? JSON.parse(raw) : []));
      } catch {
        setHistory([]);
      }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === REVIEW_HISTORY_KEY) load(); };
    load();
    window.addEventListener(WORKSPACE_EVENT, load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WORKSPACE_EVENT, load);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const data = useMemo(() => buildReviewIntelligence(history, locale), [history, locale]);

  if (!history.length) {
    return <div className={styles.empty}><span>V1.5 · REVIEW INTELLIGENCE</span><h1>{tr("先积累第一局复盘", "Save your first review")}</h1><p>{tr("个人洞察只基于你自己保存的赛后记录。先完成一局复盘，这里就会开始形成趋势。", "Personal insights are based only on your saved post-game records. Save one review to start building your trend history.")}</p><Link href="/review">{tr("去赛后复盘", "Open Review Center")}</Link></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span>V1.5 · REVIEW INTELLIGENCE</span><h1>{tr("个人复盘洞察", "Personal Review Intelligence")}</h1><p>{tr("把你自己记录的名次、问题标签和阵容样本变成趋势。这里描述相关记录，不把问题标签当作输赢因果。", "Turn your own placement, issue tags and comp samples into trends. This describes recorded patterns and does not treat issue tags as causes of outcomes.")}</p></div>
        <div><Link href="/review">{tr("继续复盘", "Add review")}</Link><Link href="/share">{tr("分享最近一局", "Share latest")}</Link></div>
      </header>

      <section className={styles.kpis}>
        <article><span>{tr("记录局数", "Recorded")}</span><strong>{data.games}</strong><small>{tr("你的样本", "your sample")}</small></article>
        <article><span>{tr("平均名次", "Average")}</span><strong>{data.average.toFixed(2)}</strong><small>{tr("越低越好", "lower is better")}</small></article>
        <article><span>Top 4</span><strong>{Math.round(data.top4Rate * 100)}%</strong><small>{tr("前四率", "rate")}</small></article>
        <article><span>{tr("吃鸡率", "Win rate")}</span><strong>{Math.round(data.winRate * 100)}%</strong><small>1st</small></article>
      </section>

      <section className={styles.trendCard}>
        <div className={styles.cardHead}><div><h2>{tr("最近 10 局", "Last 10 games")}</h2><p>{tr("柱子越高代表名次越靠前；只展示你已经保存的复盘。", "Taller bars indicate better placement; only saved reviews are included.")}</p></div><div className={styles.delta}><span>{tr("近 5 局平均", "Last-5 avg")}</span><strong>{data.recentFiveAverage?.toFixed(2) ?? "—"}</strong><small>{data.recentDelta === null ? tr("需要 10 局比较", "10 games needed for comparison") : data.recentDelta < 0 ? tr(`较前 5 局改善 ${Math.abs(data.recentDelta).toFixed(2)}`, `Improved by ${Math.abs(data.recentDelta).toFixed(2)}`) : data.recentDelta > 0 ? tr(`较前 5 局回落 ${data.recentDelta.toFixed(2)}`, `Worse by ${data.recentDelta.toFixed(2)}`) : tr("与前 5 局持平", "Flat vs previous five")}</small></div></div>
        <div className={styles.chart}>{data.recentPlacements.map((placement, index) => <div key={`${placement}-${index}`}><span style={{ height: `${28 + (9 - placement) * 8}px` }} className={placement <= 4 ? styles.top4 : styles.bottom4}><b>{placement}</b></span><small>#{placement}</small></div>)}</div>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>{tr("最常记录的问题", "Most recorded issues")}</h2><p>{tr("统计最近最多 20 局的手动标签。", "Counts manual tags across up to your latest 20 games.")}</p></div></div>
          <div className={styles.issueList}>{data.issues.length ? data.issues.slice(0, 6).map((issue) => <div key={issue.tag}><span><strong>{reviewTagLabel(issue.tag, locale)}</strong><small>{issue.count} {tr("次", "times")}</small></span><b>{Math.round(issue.rate * 100)}%</b></div>) : <p>{tr("暂时没有问题标签。", "No issue tags recorded yet.")}</p>}</div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><h2>{tr("个人阵容表现", "Your comp performance")}</h2><p>{tr("按你的复盘样本统计，不是全服胜率。", "Based on your reviews, not global ladder win rates.")}</p></div></div>
          <div className={styles.compList}>{data.comps.map((comp) => <div key={comp.key}><span><strong>{locale === "zh" ? comp.nameZh : comp.nameEn}</strong><small>{comp.games} {tr("局", "games")}</small></span><b>{comp.average.toFixed(2)}</b><em>{Math.round(comp.top4Rate * 100)}% Top4</em></div>)}</div>
        </section>
      </div>

      <section className={styles.observations}>
        <div className={styles.cardHead}><div><h2>{tr("数据观察", "Recorded observations")}</h2><p>{tr("只陈述样本里已经发生的事情。", "Factual summaries of what appears in your saved sample.")}</p></div><Link href="/preferences">{tr("设置个人偏好", "Personalize")}</Link></div>
        <ol>{data.observations.map((observation) => <li key={observation}>{observation}</li>)}</ol>
      </section>
    </div>
  );
}
