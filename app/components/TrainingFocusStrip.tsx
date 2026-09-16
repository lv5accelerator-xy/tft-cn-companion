"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { parseReviewHistory, type ReviewRecord } from "@/lib/review";
import { buildTrainingProgress, parseTrainingFocusGoal, trainingAction, trainingGoalLabel, trainingScopeLabel, type TrainingFocusGoal } from "@/lib/training-focus";
import { REVIEW_HISTORY_KEY, TRAINING_FOCUS_KEY, WORKSPACE_EVENT } from "@/lib/workspace";
import { useLocale } from "./LocaleProvider";
import styles from "./training-focus-strip.module.css";

type Props = { mode: "focus" | "review" };

function safeParse(raw: string | null) {
  if (!raw) return null;
  try { return JSON.parse(raw) as unknown; } catch { return null; }
}

export default function TrainingFocusStrip({ mode }: Props) {
  const { locale, tr } = useLocale();
  const [goal, setGoal] = useState<TrainingFocusGoal | null>(null);
  const [history, setHistory] = useState<ReviewRecord[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        setGoal(parseTrainingFocusGoal(safeParse(window.localStorage.getItem(TRAINING_FOCUS_KEY))));
        setHistory(parseReviewHistory(safeParse(window.localStorage.getItem(REVIEW_HISTORY_KEY))));
      } catch {
        setGoal(null);
        setHistory([]);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === TRAINING_FOCUS_KEY || event.key === REVIEW_HISTORY_KEY) load();
    };
    load();
    window.addEventListener(WORKSPACE_EVENT, load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WORKSPACE_EVENT, load);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const progress = useMemo(() => goal ? buildTrainingProgress(goal, history) : null, [goal, history]);
  if (!goal || !progress) return null;

  return (
    <section className={styles.strip} aria-label={tr("个人训练重点", "Personal practice focus")}>
      <div className={styles.identity}>
        <span>{mode === "focus" ? tr("本局训练重点", "THIS GAME FOCUS") : tr("复盘训练目标", "REVIEW PRACTICE")}</span>
        <strong>{trainingGoalLabel(goal, locale)}</strong>
      </div>
      <p>{trainingAction(goal.tag, locale)}</p>
      <div className={styles.meta}>
        <span>{trainingScopeLabel(goal, locale)}</span>
        <b>{progress.completedGames}/{goal.sampleSize}</b>
        <em>{tr(`标签 ${progress.issueHits}/${goal.targetMaxHits}`, `tag ${progress.issueHits}/${goal.targetMaxHits}`)}</em>
      </div>
      <Link href="/insights#training-focus">{progress.isComplete ? tr("查看本轮结果", "View result") : tr("查看训练进度", "View progress")}</Link>
    </section>
  );
}
