import { REVIEW_ISSUE_TAGS, reviewTagLabel, type ReviewIssueTag, type ReviewRecord } from "@/lib/review";

export const TRAINING_SAMPLE_SIZE = 5;
export const TRAINING_TARGET_MAX_HITS = 1;

export type TrainingFocusGoal = {
  tag: ReviewIssueTag;
  createdAt: number;
  sampleSize: number;
  targetMaxHits: number;
  baselineGames: number;
  baselineHits: number;
  scopeKey: string | null;
  scopeNameZh: string;
  scopeNameEn: string;
};

export type TrainingFocusProgress = {
  records: ReviewRecord[];
  completedGames: number;
  remainingGames: number;
  issueHits: number;
  isComplete: boolean;
  targetMet: boolean | null;
};

export type TrainingFocusSuggestion = {
  tag: ReviewIssueTag;
  baselineGames: number;
  baselineHits: number;
  baselineRate: number;
};

function isReviewIssueTag(value: unknown): value is ReviewIssueTag {
  return typeof value === "string" && REVIEW_ISSUE_TAGS.includes(value as ReviewIssueTag);
}

function normalizePositiveInt(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function parseTrainingFocusGoal(value: unknown): TrainingFocusGoal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const goal = value as Partial<TrainingFocusGoal>;
  if (!isReviewIssueTag(goal.tag)) return null;
  const createdAt = Number(goal.createdAt);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;
  return {
    tag: goal.tag,
    createdAt,
    sampleSize: normalizePositiveInt(goal.sampleSize, TRAINING_SAMPLE_SIZE, 3, 10),
    targetMaxHits: normalizePositiveInt(goal.targetMaxHits, TRAINING_TARGET_MAX_HITS, 0, 5),
    baselineGames: normalizePositiveInt(goal.baselineGames, 0, 0, 50),
    baselineHits: normalizePositiveInt(goal.baselineHits, 0, 0, 50),
    scopeKey: typeof goal.scopeKey === "string" && goal.scopeKey.length ? goal.scopeKey : null,
    scopeNameZh: typeof goal.scopeNameZh === "string" ? goal.scopeNameZh : "",
    scopeNameEn: typeof goal.scopeNameEn === "string" ? goal.scopeNameEn : "",
  };
}

export function buildTrainingSuggestion(records: ReviewRecord[]): TrainingFocusSuggestion | null {
  const sample = records.slice(0, 10);
  if (sample.length < 3) return null;
  const counts = new Map<ReviewIssueTag, number>();
  sample.forEach((record) => record.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  const ranked = REVIEW_ISSUE_TAGS
    .map((tag) => ({ tag, count: counts.get(tag) ?? 0 }))
    .sort((left, right) => right.count - left.count || REVIEW_ISSUE_TAGS.indexOf(left.tag) - REVIEW_ISSUE_TAGS.indexOf(right.tag));
  const top = ranked[0];
  if (!top || top.count < 2) return null;
  return {
    tag: top.tag,
    baselineGames: sample.length,
    baselineHits: top.count,
    baselineRate: top.count / sample.length,
  };
}

export function createTrainingFocusGoal(
  tag: ReviewIssueTag,
  baselineRecords: ReviewRecord[],
  scope?: { key: string | null; nameZh?: string; nameEn?: string },
): TrainingFocusGoal {
  const sample = baselineRecords.slice(0, 10);
  return {
    tag,
    createdAt: Date.now(),
    sampleSize: TRAINING_SAMPLE_SIZE,
    targetMaxHits: TRAINING_TARGET_MAX_HITS,
    baselineGames: sample.length,
    baselineHits: sample.filter((record) => record.tags.includes(tag)).length,
    scopeKey: scope?.key && scope.key !== "all" ? scope.key : null,
    scopeNameZh: scope?.nameZh ?? "",
    scopeNameEn: scope?.nameEn ?? "",
  };
}

export function buildTrainingProgress(goal: TrainingFocusGoal, history: ReviewRecord[]): TrainingFocusProgress {
  const eligible = history
    .filter((record) => record.createdAt > goal.createdAt)
    .filter((record) => !goal.scopeKey || `${record.sourceId}:${record.compId}` === goal.scopeKey)
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(0, goal.sampleSize);
  const issueHits = eligible.filter((record) => record.tags.includes(goal.tag)).length;
  const completedGames = eligible.length;
  const isComplete = completedGames >= goal.sampleSize;
  return {
    records: eligible,
    completedGames,
    remainingGames: Math.max(0, goal.sampleSize - completedGames),
    issueHits,
    isComplete,
    targetMet: isComplete ? issueHits <= goal.targetMaxHits : null,
  };
}

export function trainingAction(tag: ReviewIssueTag, locale: "zh" | "en") {
  const actions: Record<ReviewIssueTag, [string, string]> = {
    items: ["合装备前先确认主 C / 主坦核心装，避免为临时牌锁死成装。", "Before combining items, confirm the carry/tank core plan and avoid locking finished items onto temporary units."],
    economy: ["每次升级或搜牌前先看经济阈值，非止血节点尽量不要连续小 D。", "Check the economy threshold before leveling or rolling; avoid repeated small rolls outside true stabilization windows."],
    "late-roll": ["把阵容的 Stage 3 / 4 启动节点当作闹钟，不等到掉血后才开始主搜。", "Treat the comp's Stage 3/4 roll window like an alarm instead of waiting until HP loss forces the main roll-down."],
    pivot: ["开局同时保留 Plan B / C；关键装备或核心牌条件不成立时及时切换。", "Keep Plan B/C alive early and pivot when the key item or core-unit condition is no longer present."],
    positioning: ["每回合至少检查一次主 C 安全侧、主坦对位与是否需要镜像。", "Check carry safety, tank matchup and whether to mirror at least once each round."],
    contested: ["3-2 / 4-1 看一次同行数量；竞争过高时优先切到候选阵容而不是继续硬追。", "Check contest count around 3-2 / 4-1; when competition is heavy, prefer a candidate pivot instead of forcing the same line."],
  };
  return actions[tag][locale === "zh" ? 0 : 1];
}

export function trainingScopeLabel(goal: TrainingFocusGoal, locale: "zh" | "en") {
  if (!goal.scopeKey) return locale === "zh" ? "全部阵容" : "All comps";
  const name = locale === "zh" ? goal.scopeNameZh || goal.scopeNameEn : goal.scopeNameEn || goal.scopeNameZh;
  return name || goal.scopeKey;
}

export function trainingGoalLabel(goal: TrainingFocusGoal, locale: "zh" | "en") {
  return reviewTagLabel(goal.tag, locale);
}
