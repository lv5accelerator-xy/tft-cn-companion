"use client";

import { useEffect, useMemo, useState } from "react";
import { reviewTagLabel, type ReviewRecord } from "@/lib/review";
import {
  buildTrainingProgress,
  buildTrainingSuggestion,
  createTrainingFocusGoal,
  parseTrainingFocusGoal,
  trainingAction,
  trainingGoalLabel,
  trainingScopeLabel,
  type TrainingFocusGoal,
} from "@/lib/training-focus";
import { TRAINING_FOCUS_KEY, WORKSPACE_EVENT, markWorkspaceChanged } from "@/lib/workspace";
import { useLocale } from "./LocaleProvider";
import styles from "./training-focus-panel.module.css";

type ScopeNames = { zh: string; en: string } | null;

type Props = {
  history: ReviewRecord[];
  sample: ReviewRecord[];
  scopeKey: string;
  scopeNames: ScopeNames;
};

function readGoal() {
  try {
    const raw = window.localStorage.getItem(TRAINING_FOCUS_KEY);
    return parseTrainingFocusGoal(raw ? JSON.parse(raw) : null);
  } catch {
    return null;
  }
}

export default function TrainingFocusPanel({ history, sample, scopeKey, scopeNames }: Props) {
  const { locale, tr } = useLocale();
  const [goal, setGoal] = useState<TrainingFocusGoal | null>(null);

  useEffect(() => {
    const load = () => setGoal(readGoal());
    const onStorage = (event: StorageEvent) => { if (event.key === TRAINING_FOCUS_KEY) load(); };
    load();
    window.addEventListener(WORKSPACE_EVENT, load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WORKSPACE_EVENT, load);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const suggestion = useMemo(() => buildTrainingSuggestion(sample), [sample]);
  const progress = useMemo(() => goal ? buildTrainingProgress(goal, history) : null, [goal, history]);
  const baselineRate = goal?.baselineGames ? Math.round((goal.baselineHits / goal.baselineGames) * 100) : 0;

  function persist(next: TrainingFocusGoal | null) {
    try {
      if (next) window.localStorage.setItem(TRAINING_FOCUS_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(TRAINING_FOCUS_KEY);
      setGoal(next);
      markWorkspaceChanged();
    } catch {
      setGoal(next);
    }
  }

  function startSuggested() {
    if (!suggestion) return;
    persist(createTrainingFocusGoal(suggestion.tag, sample, {
      key: scopeKey === "all" ? null : scopeKey,
      nameZh: scopeNames?.zh,
      nameEn: scopeNames?.en,
    }));
  }

  return (
    <section className={styles.panel} id="training-focus">
      <div className={styles.head}>
        <div>
          <span>V1.6.9 · PRACTICE LOOP</span>
          <h2>{tr("下一阶段训练", "Next practice block")}</h2>
          <p>{tr("把赛后标签变成一个连续 5 局、可追踪的训练重点。只追踪你手动记录的问题频率，不把它解释为名次变化的原因。", "Turn review tags into one trackable five-game practice focus. It only tracks the frequency of your manual tags and does not treat them as causes of placement changes.")}</p>
        </div>
        {goal ? <button className={styles.ghost} onClick={() => persist(null)}>{tr("结束本轮", "End block")}</button> : null}
      </div>

      {goal && progress ? (
        <div className={styles.goalWrap}>
          <div className={styles.goalMain}>
            <span>{tr("训练重点", "Practice focus")}</span>
            <strong>{trainingGoalLabel(goal, locale)}</strong>
            <p>{trainingAction(goal.tag, locale)}</p>
            <small>{tr("范围", "Scope")}: {trainingScopeLabel(goal, locale)} · {tr("基线", "Baseline")} {goal.baselineHits}/{goal.baselineGames || "—"}{goal.baselineGames ? ` (${baselineRate}%)` : ""}</small>
          </div>
          <div className={styles.metric}><span>{tr("进度", "Progress")}</span><strong>{progress.completedGames}/{goal.sampleSize}</strong><small>{progress.isComplete ? tr("本轮完成", "Block complete") : tr(`还剩 ${progress.remainingGames} 局`, `${progress.remainingGames} games left`)}</small></div>
          <div className={styles.metric}><span>{tr("问题出现", "Issue hits")}</span><strong>{progress.issueHits}</strong><small>{tr(`目标 ≤ ${goal.targetMaxHits}`, `Target ≤ ${goal.targetMaxHits}`)}</small></div>
          <div className={`${styles.result} ${progress.isComplete ? (progress.targetMet ? styles.met : styles.missed) : ""}`}>
            <span>{tr("状态", "Status")}</span>
            <strong>{progress.isComplete ? (progress.targetMet ? tr("达到训练目标", "Target met") : tr("继续练这一项", "Keep practicing this")) : tr("进行中", "In progress")}</strong>
          </div>
          <div className={styles.track}><span style={{ width: `${Math.min(100, (progress.completedGames / goal.sampleSize) * 100)}%` }} /></div>
          {progress.isComplete ? <button className={styles.primary} onClick={startSuggested} disabled={!suggestion}>{suggestion ? tr(`开始新一轮：${reviewTagLabel(suggestion.tag, "zh")}`, `Start new block: ${reviewTagLabel(suggestion.tag, "en")}`) : tr("当前没有重复问题可生成新目标", "No repeated issue is ready for a new goal")}</button> : null}
        </div>
      ) : suggestion ? (
        <div className={styles.suggestion}>
          <div>
            <span>{tr("当前建议", "Current suggestion")}</span>
            <strong>{reviewTagLabel(suggestion.tag, locale)}</strong>
            <p>{trainingAction(suggestion.tag, locale)}</p>
            <small>{tr(`最近样本 ${suggestion.baselineHits}/${suggestion.baselineGames} 局记录了这个问题。`, `This issue was tagged in ${suggestion.baselineHits}/${suggestion.baselineGames} games in the current sample.`)}</small>
          </div>
          <button className={styles.primary} onClick={startSuggested}>{tr("设为接下来 5 局目标", "Set as next 5-game goal")}</button>
        </div>
      ) : (
        <div className={styles.empty}>
          <strong>{tr("暂时不生成训练目标", "No practice goal yet")}</strong>
          <p>{tr("至少记录 3 局，并让同一个问题标签重复出现 2 次后，这里会建议一个训练重点。", "Record at least three games and repeat the same issue tag twice before a practice focus is suggested here.")}</p>
        </div>
      )}
    </section>
  );
}
