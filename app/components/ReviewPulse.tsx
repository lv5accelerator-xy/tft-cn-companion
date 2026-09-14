"use client";

import { useEffect, useMemo, useState } from "react";
import { parseReviewHistory, reviewTagLabel, type ReviewRecord } from "@/lib/review";
import { REVIEW_HISTORY_KEY, WORKSPACE_EVENT } from "@/lib/workspace";
import { useLocale } from "./LocaleProvider";
import styles from "./review-pulse.module.css";

function average(records: ReviewRecord[]) {
  if (!records.length) return 0;
  return records.reduce((sum, record) => sum + record.placement, 0) / records.length;
}

export default function ReviewPulse() {
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

  const recent = useMemo(() => history.slice(0, 10).reverse(), [history]);
  const recentFive = history.slice(0, 5);
  const previousFive = history.slice(5, 10);
  const recentAverage = average(recentFive);
  const previousAverage = average(previousFive);
  const delta = previousFive.length ? recentAverage - previousAverage : 0;
  const issue = useMemo(() => {
    const counts = new Map<ReviewRecord["tags"][number], number>();
    history.slice(0, 10).forEach((record) => record.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
  }, [history]);

  if (!history.length) return null;

  return (
    <section className={styles.pulse} aria-label={tr("近期复盘趋势", "Recent review trend")}>
      <div className={styles.summary}>
        <span>{tr("近期趋势", "RECENT FORM")}</span>
        <strong>{recentFive.length ? recentAverage.toFixed(2) : "—"}</strong>
        <small>{tr("近 5 局平均名次", "avg placement · last 5")}</small>
      </div>
      <div className={styles.chart} aria-label={tr("最近 10 局名次", "Last 10 placements")}>
        {recent.map((record) => {
          const height = 18 + (9 - record.placement) * 4;
          return <span key={record.id} className={record.placement <= 4 ? styles.top4 : styles.bottom4} style={{ height }} title={`#${record.placement}`}><b>{record.placement}</b></span>;
        })}
      </div>
      <div className={styles.signal}>
        <span>{tr("对比前 5 局", "VS PREVIOUS 5")}</span>
        <strong className={delta < 0 ? styles.good : delta > 0 ? styles.bad : ""}>{previousFive.length ? `${delta < 0 ? "↓" : delta > 0 ? "↑" : "→"} ${Math.abs(delta).toFixed(2)}` : "—"}</strong>
        <small>{previousFive.length ? (delta < 0 ? tr("平均名次改善", "average improved") : delta > 0 ? tr("平均名次变差", "average worsened") : tr("平均名次持平", "average unchanged")) : tr("需要至少 10 局", "needs 10 games")}</small>
      </div>
      <div className={styles.issue}>
        <span>{tr("最近常见问题", "COMMON ISSUE")}</span>
        <strong>{issue ? reviewTagLabel(issue[0], locale) : tr("暂无", "None")}</strong>
        <small>{issue ? tr(`最近 10 局出现 ${issue[1]} 次`, `${issue[1]} in the last 10 games`) : tr("暂未标记问题", "no issue tags yet")}</small>
      </div>
    </section>
  );
}
