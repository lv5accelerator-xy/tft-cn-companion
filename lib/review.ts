import type { BoardPosition } from "@/data/comps";
import type { TacticalRole } from "@/lib/tactical-board";

export type ReviewIssueTag = "items" | "economy" | "late-roll" | "pivot" | "positioning" | "contested";
export type ReviewCaptureSource = "focus" | "builder";

export type ReviewRef = {
  sourceId: string;
  id: string;
};

export type ReviewSeed = {
  sourceId: string;
  compId: string;
  patch: string;
  plannedNameZh: string;
  plannedNameEn: string;
  source: string;
  playstyle: string;
  plannedBoard: BoardPosition[];
  finalBoard: BoardPosition[];
  rolesByName: Record<string, TacticalRole>;
  itemsByName: Record<string, string[]>;
  candidateRefs: ReviewRef[];
  focusStage: string;
  levelHint: string;
  captureSource: ReviewCaptureSource;
  capturedAt: number;
};

export type ReviewDraft = ReviewSeed & {
  placement: number;
  level: number;
  endStage: string;
  tags: ReviewIssueTag[];
  note: string;
  updatedAt: number;
};

export type ReviewRecord = ReviewDraft & {
  id: string;
  createdAt: number;
};

export const REVIEW_ISSUE_TAGS: ReviewIssueTag[] = [
  "items",
  "economy",
  "late-roll",
  "pivot",
  "positioning",
  "contested",
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function isBoardPosition(value: unknown): value is BoardPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as Partial<BoardPosition>;
  return typeof position.unit === "string"
    && Number.isInteger(position.row)
    && Number.isInteger(position.col)
    && Number(position.row) >= 0
    && Number(position.row) <= 3
    && Number(position.col) >= 0
    && Number(position.col) <= 6;
}

function isRole(value: unknown): value is TacticalRole {
  return value === "CARRY" || value === "TANK" || value === "SECONDARY" || value === "FLEX";
}

function isIssueTag(value: unknown): value is ReviewIssueTag {
  return REVIEW_ISSUE_TAGS.includes(value as ReviewIssueTag);
}

function cleanBoard(value: unknown): BoardPosition[] {
  return Array.isArray(value) ? value.filter(isBoardPosition).slice(0, 10) : [];
}

function cleanRoles(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, role]) => isRole(role))) as Record<string, TacticalRole>;
}

function cleanItems(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, items]) => Array.isArray(items))
      .map(([unit, items]) => [unit, (items as unknown[]).filter((item): item is string => typeof item === "string").slice(0, 3)]),
  );
}

function cleanRefs(value: unknown): ReviewRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => entry as Partial<ReviewRef>)
    .filter((entry): entry is ReviewRef => typeof entry.sourceId === "string" && typeof entry.id === "string")
    .slice(0, 3);
}

export function parseReviewDraft(value: unknown): ReviewDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<ReviewDraft>;
  if (typeof draft.sourceId !== "string" || typeof draft.compId !== "string") return null;
  if (typeof draft.plannedNameZh !== "string" || typeof draft.plannedNameEn !== "string") return null;
  return {
    sourceId: draft.sourceId,
    compId: draft.compId,
    patch: typeof draft.patch === "string" ? draft.patch : "",
    plannedNameZh: draft.plannedNameZh,
    plannedNameEn: draft.plannedNameEn,
    source: typeof draft.source === "string" ? draft.source : "",
    playstyle: typeof draft.playstyle === "string" ? draft.playstyle : "",
    plannedBoard: cleanBoard(draft.plannedBoard),
    finalBoard: cleanBoard(draft.finalBoard),
    rolesByName: cleanRoles(draft.rolesByName),
    itemsByName: cleanItems(draft.itemsByName),
    candidateRefs: cleanRefs(draft.candidateRefs),
    focusStage: typeof draft.focusStage === "string" ? draft.focusStage : "Stage 4",
    levelHint: typeof draft.levelHint === "string" ? draft.levelHint : "",
    captureSource: draft.captureSource === "builder" ? "builder" : "focus",
    capturedAt: Number.isFinite(Number(draft.capturedAt)) ? Number(draft.capturedAt) : Date.now(),
    placement: Math.min(8, Math.max(1, Number(draft.placement) || 4)),
    level: Math.min(10, Math.max(4, Number(draft.level) || 8)),
    endStage: typeof draft.endStage === "string" ? draft.endStage : "",
    tags: Array.isArray(draft.tags) ? draft.tags.filter(isIssueTag) : [],
    note: typeof draft.note === "string" ? draft.note.slice(0, 1000) : "",
    updatedAt: Number.isFinite(Number(draft.updatedAt)) ? Number(draft.updatedAt) : Date.now(),
  };
}

export function parseReviewHistory(value: unknown): ReviewRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const draft = parseReviewDraft(entry);
      if (!draft || !entry || typeof entry !== "object") return null;
      const record = entry as Partial<ReviewRecord>;
      return {
        ...draft,
        id: typeof record.id === "string" ? record.id : `review-${draft.updatedAt}`,
        createdAt: Number.isFinite(Number(record.createdAt)) ? Number(record.createdAt) : draft.updatedAt,
      } satisfies ReviewRecord;
    })
    .filter((entry): entry is ReviewRecord => Boolean(entry));
}

export function reviewTagLabel(tag: ReviewIssueTag, locale: "zh" | "en") {
  const labels: Record<ReviewIssueTag, [string, string]> = {
    items: ["装备不对", "Item mismatch"],
    economy: ["经济崩", "Economy broke"],
    "late-roll": ["搜牌太晚", "Rolled too late"],
    pivot: ["转阵容失败", "Pivot failed"],
    positioning: ["站位问题", "Positioning"],
    contested: ["同行太多", "Too contested"],
  };
  return labels[tag][locale === "zh" ? 0 : 1];
}

export function buildReviewSummary(review: Pick<ReviewDraft,
  "placement" | "plannedBoard" | "finalBoard" | "rolesByName" | "itemsByName" | "tags" | "captureSource" | "focusStage"
>, locale: "zh" | "en") {
  const planned = new Set(review.plannedBoard.map((position) => normalize(position.unit)));
  const final = new Set(review.finalBoard.map((position) => normalize(position.unit)));
  const shared = [...final].filter((unit) => planned.has(unit)).length;
  const missing = [...planned].filter((unit) => !final.has(unit)).length;
  const added = [...final].filter((unit) => !planned.has(unit)).length;
  const carry = Object.entries(review.rolesByName).find(([, role]) => role === "CARRY")?.[0] ?? "";
  const carryItems = carry ? review.itemsByName[carry] ?? [] : [];
  const summaries: string[] = [];

  if (locale === "zh") {
    summaries.push(`第 ${review.placement} 名 · ${review.placement <= 4 ? "进入前四" : "未进前四"}。`);
    if (planned.size) {
      if (missing === 0 && added === 0) summaries.push(`最终棋盘与计划阵容完全一致，共 ${final.size} 个单位。`);
      else summaries.push(`最终棋盘与计划重合 ${shared}/${planned.size}；缺少 ${missing} 个计划单位，加入 ${added} 个计划外单位。`);
    }
    if (carry) summaries.push(`主 C ${carry}：${carryItems.length ? `记录到 ${carryItems.length}/3 件装备` : "未记录到装备"}。`);
    if (review.tags.length) summaries.push(`主要问题：${review.tags.map((tag) => reviewTagLabel(tag, "zh")).join("、")}。`);
    summaries.push(`复盘快照来自${review.captureSource === "builder" ? "较新的 Builder 最终状态" : `当前 ${review.focusStage} Stage Board`}。`);
  } else {
    summaries.push(`${review.placement}${review.placement === 1 ? "st" : review.placement === 2 ? "nd" : review.placement === 3 ? "rd" : "th"} place · ${review.placement <= 4 ? "Top 4" : "outside Top 4"}.`);
    if (planned.size) {
      if (missing === 0 && added === 0) summaries.push(`Final board exactly matched the planned comp with ${final.size} units.`);
      else summaries.push(`Final board matched ${shared}/${planned.size} planned units; ${missing} planned units missing and ${added} off-plan units added.`);
    }
    if (carry) summaries.push(`Carry ${carry}: ${carryItems.length ? `${carryItems.length}/3 recorded items` : "no recorded items"}.`);
    if (review.tags.length) summaries.push(`Primary issues: ${review.tags.map((tag) => reviewTagLabel(tag, "en")).join(", ")}.`);
    summaries.push(`Review snapshot came from ${review.captureSource === "builder" ? "the newer Builder final state" : `the current ${review.focusStage} Stage Board`}.`);
  }

  return summaries;
}
