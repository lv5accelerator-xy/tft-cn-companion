import type { OpeningCompMatch } from "@/lib/opening-assistant";
import type { UserPreferences } from "@/lib/preferences";
import type { ReviewRecord } from "@/lib/review";

export type PersonalSample = {
  games: number;
  average: number;
  top4Rate: number;
};

export type SmartGuidanceMatch = OpeningCompMatch & {
  guidanceScore: number;
  preferenceAdjustment: number;
  familiarityAdjustment: number;
  reasons: string[];
  cautions: string[];
  personalSample: PersonalSample | null;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function sampleFor(match: OpeningCompMatch, history: ReviewRecord[]): PersonalSample | null {
  const records = history.filter((record) => record.sourceId === match.comp.sourceId && record.compId === match.comp.id);
  if (!records.length) return null;
  const placements = records.map((record) => record.placement);
  return {
    games: records.length,
    average: placements.reduce((sum, value) => sum + value, 0) / placements.length,
    top4Rate: placements.filter((value) => value <= 4).length / placements.length,
  };
}

function tempoMatches(match: OpeningCompMatch, tempo: UserPreferences["tempo"]) {
  if (tempo === "auto") return false;
  const text = normalize(`${match.comp.playstyle} ${match.comp.name} ${match.comp.nameZh}`);
  if (tempo === "fast8") return text.includes("fast 8") || text.includes("fast8") || text.includes("fast 9") || text.includes("fast9");
  if (tempo === "reroll") return text.includes("reroll") || text.includes("slow roll") || text.includes("multi-3");
  return text.includes("flex") || match.comp.flexUnits.length >= 5;
}

export function buildSmartGuidance(
  matches: OpeningCompMatch[],
  history: ReviewRecord[],
  preferences: UserPreferences,
  locale: "zh" | "en",
): SmartGuidanceMatch[] {
  return matches.map((match) => {
    const reasons: string[] = match.guideReasons.map((reason) => locale === "zh" ? reason.zh : reason.en);
    const cautions: string[] = match.guideCautions.map((caution) => locale === "zh" ? caution.zh : caution.en);
    let preferenceAdjustment = 0;
    let familiarityAdjustment = 0;

    if (match.coreMatches.length) {
      const copies = match.coreMatches.reduce((sum, entry) => sum + entry.count, 0);
      reasons.push(locale === "zh" ? `命中 ${match.coreMatches.length} 个核心位，共 ${copies} 张核心牌。` : `${match.coreMatches.length} core unit(s) hit, ${copies} core copies total.`);
    } else {
      cautions.push(locale === "zh" ? "当前开局还没有直接命中核心位。" : "No direct core-unit hit in the current opening yet.");
    }

    if (match.craftableItemMatches.length) {
      reasons.push(locale === "zh" ? `当前散件可合成 ${match.craftableItemMatches.length} 件来源攻略明确提到的装备。` : `${match.craftableItemMatches.length} craftable item(s) match source-backed item priorities.`);
    } else {
      cautions.push(locale === "zh" ? "当前散件暂未命中来源攻略中的明确成装。" : "Current components do not yet hit a source-backed exact item.");
    }

    if (match.guideScore > 0) {
      reasons.push(locale === "zh" ? `兔顶 18.2 开局条件额外匹配 +${match.guideScore}。` : `TFT guide-specific 18.2 opening fit adds +${match.guideScore}.`);
    }

    if (tempoMatches(match, preferences.tempo)) {
      preferenceAdjustment += 5;
      reasons.push(locale === "zh" ? "与你设置的常用运营节奏一致。" : "Matches your preferred tempo setting.");
    }

    if (preferences.preferSimpleExecution) {
      if (match.comp.difficulty === "EASY") {
        preferenceAdjustment += 4;
        reasons.push(locale === "zh" ? "你偏好简单执行，这套阵容标记为 EASY。" : "You prefer simpler execution and this comp is marked EASY.");
      } else if (match.comp.difficulty === "HARD") {
        preferenceAdjustment -= 5;
        cautions.push(locale === "zh" ? "你偏好简单执行，但这套阵容标记为 HARD。" : "You prefer simpler execution, but this comp is marked HARD.");
      }
    }

    if (preferences.risk === "safe" && match.comp.difficulty === "HARD") {
      preferenceAdjustment -= 3;
      cautions.push(locale === "zh" ? "稳健偏好下，困难阵容会轻微降权。" : "Hard comps receive a small penalty under your safe preference.");
    }
    if (preferences.risk === "ceiling" && match.comp.tier === "S") {
      preferenceAdjustment += 3;
      reasons.push(locale === "zh" ? "追上限偏好下，S Tier 获得轻量加分。" : "S Tier receives a small bonus under your ceiling preference.");
    }
    if (preferences.goal === "top4" && (match.comp.tier === "S" || match.comp.tier === "A")) preferenceAdjustment += 2;
    if (preferences.goal === "experiment") {
      const hasHistory = history.some((record) => record.sourceId === match.comp.sourceId && record.compId === match.comp.id);
      if (!hasHistory) {
        preferenceAdjustment += 4;
        reasons.push(locale === "zh" ? "你的目标是练新阵容，而这套暂时没有个人复盘样本。" : "Your goal is experimentation and you have no saved review sample for this comp yet.");
      }
    }

    const personalSample = sampleFor(match, history);
    if (preferences.prioritizeFamiliar && personalSample) {
      if (personalSample.games >= 2) {
        familiarityAdjustment += personalSample.average <= 4 ? 4 : 1;
        familiarityAdjustment += personalSample.top4Rate >= 0.5 ? 3 : 0;
      } else {
        familiarityAdjustment += 1;
      }
      reasons.push(locale === "zh"
        ? `你有 ${personalSample.games} 局个人样本：平均 ${personalSample.average.toFixed(2)}，Top4 ${Math.round(personalSample.top4Rate * 100)}%。`
        : `Your sample: ${personalSample.games} game(s), ${personalSample.average.toFixed(2)} average placement, ${Math.round(personalSample.top4Rate * 100)}% Top 4.`);
    }

    const adjustment = Math.max(-10, Math.min(12, preferenceAdjustment + familiarityAdjustment));
    const guidanceScore = Math.max(0, Math.min(99, match.score + adjustment));
    return { ...match, guidanceScore, preferenceAdjustment, familiarityAdjustment, reasons: Array.from(new Set(reasons)), cautions: Array.from(new Set(cautions)), personalSample };
  }).sort((left, right) => right.guidanceScore - left.guidanceScore || right.score - left.score || right.guideScore - left.guideScore || right.unitScore - left.unitScore);
}
