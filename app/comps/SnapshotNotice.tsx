"use client";

import { useEffect, useState } from "react";
import { snapshotAge } from "@/lib/page-query";
import { rankingSnapshot } from "@/data/rankings";
import { useLocale } from "../components/LocaleProvider";
import styles from "./comparison.module.css";

export default function SnapshotNotice() {
  const { tr } = useLocale();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const age = now === null ? null : snapshotAge(rankingSnapshot.capturedAt, now);
  return <p className={age?.needsReview ? styles.stale : styles.age} role="status">
    {tr("榜单采集时间", "Rankings captured")}: {rankingSnapshot.capturedAt}
    {age && <> · {age.days > 0 ? tr(`${age.days} 天前`, `${age.days} days ago`) : tr(`${age.hours} 小时前`, `${age.hours} hours ago`)}</>}
    {age?.needsReview ? tr("。已超过48小时，请查看原始榜单确认变化；这里展示的是历史快照。", ". More than 48 hours old: check the original rankings for changes. This is a historical snapshot.") : tr("。这是核验快照，非实时榜单。", ". Verified snapshot, not live rankings.")}
  </p>;
}
