import { reviewTagLabel, type ReviewIssueTag, type ReviewRecord } from "@/lib/review";

export type ReviewCompInsight = {
  key: string;
  nameZh: string;
  nameEn: string;
  games: number;
  average: number;
  top4Rate: number;
  winRate: number;
};

export type ReviewIssueInsight = {
  tag: ReviewIssueTag;
  count: number;
  rate: number;
};

export type ReviewIntelligence = {
  games: number;
  average: number;
  top4Rate: number;
  winRate: number;
  recentFiveAverage: number | null;
  previousFiveAverage: number | null;
  recentDelta: number | null;
  recentPlacements: number[];
  issues: ReviewIssueInsight[];
  comps: ReviewCompInsight[];
  observations: string[];
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildReviewIntelligence(history: ReviewRecord[], locale: "zh" | "en"): ReviewIntelligence {
  const placements = history.map((record) => record.placement);
  const recentFive = history.slice(0, 5);
  const previousFive = history.slice(5, 10);
  const recentFiveAverage = recentFive.length ? average(recentFive.map((record) => record.placement)) : null;
  const previousFiveAverage = previousFive.length === 5 ? average(previousFive.map((record) => record.placement)) : null;
  const recentDelta = recentFiveAverage !== null && previousFiveAverage !== null ? recentFiveAverage - previousFiveAverage : null;

  const issueCounts = new Map<ReviewIssueTag, number>();
  history.slice(0, 20).forEach((record) => record.tags.forEach((tag) => issueCounts.set(tag, (issueCounts.get(tag) ?? 0) + 1)));
  const issueSample = Math.min(20, history.length);
  const issues = [...issueCounts.entries()]
    .map(([tag, count]) => ({ tag, count, rate: issueSample ? count / issueSample : 0 }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));

  const groups = new Map<string, { nameZh: string; nameEn: string; games: number; placements: number[] }>();
  history.forEach((record) => {
    const key = `${record.sourceId}:${record.compId}`;
    const current = groups.get(key) ?? { nameZh: record.plannedNameZh, nameEn: record.plannedNameEn, games: 0, placements: [] };
    current.games += 1;
    current.placements.push(record.placement);
    groups.set(key, current);
  });
  const comps = [...groups.entries()].map(([key, group]) => ({
    key,
    nameZh: group.nameZh,
    nameEn: group.nameEn,
    games: group.games,
    average: average(group.placements),
    top4Rate: group.placements.filter((value) => value <= 4).length / group.games,
    winRate: group.placements.filter((value) => value === 1).length / group.games,
  })).sort((left, right) => right.games - left.games || left.average - right.average).slice(0, 8);

  const observations: string[] = [];
  if (history.length < 5) {
    observations.push(locale === "zh" ? `当前只有 ${history.length} 局样本；继续记录后趋势会更稳定。` : `You currently have ${history.length} recorded game(s); trends become more stable with more samples.`);
  } else if (recentDelta !== null) {
    const amount = Math.abs(recentDelta).toFixed(2);
    if (recentDelta < -0.15) observations.push(locale === "zh" ? `最近 5 局平均名次比前 5 局低 ${amount}，记录样本显示近期表现改善。` : `Your last-5 average placement is ${amount} lower than the previous five in the recorded sample.`);
    else if (recentDelta > 0.15) observations.push(locale === "zh" ? `最近 5 局平均名次比前 5 局高 ${amount}，近期样本表现有所回落。` : `Your last-5 average placement is ${amount} higher than the previous five in the recorded sample.`);
    else observations.push(locale === "zh" ? "最近 5 局与前 5 局平均名次接近，近期样本基本持平。" : "The last five and previous five are close; recent recorded form is roughly flat.");
  }

  if (issues[0]) {
    observations.push(locale === "zh"
      ? `最近最多记录的问题是「${reviewTagLabel(issues[0].tag, "zh")}」，在最近 ${issueSample} 局中出现 ${issues[0].count} 次。`
      : `Your most frequently recorded recent issue is “${reviewTagLabel(issues[0].tag, "en")}”, tagged ${issues[0].count} time(s) in the last ${issueSample} game(s).`);
  }

  const reliableComp = comps.find((comp) => comp.games >= 3);
  if (reliableComp) {
    observations.push(locale === "zh"
      ? `${reliableComp.nameZh} 是当前样本最多的阵容：${reliableComp.games} 局，平均名次 ${reliableComp.average.toFixed(2)}，Top4 ${Math.round(reliableComp.top4Rate * 100)}%。`
      : `${reliableComp.nameEn} has your largest current sample: ${reliableComp.games} games, ${reliableComp.average.toFixed(2)} average placement and ${Math.round(reliableComp.top4Rate * 100)}% Top 4.`);
  }

  observations.push(locale === "zh" ? "这些结论只描述你手动记录的数据，不把问题标签解释为输赢的因果原因。" : "These observations describe your manually recorded data only; issue tags are not treated as causes of wins or losses.");

  return {
    games: history.length,
    average: placements.length ? average(placements) : 0,
    top4Rate: placements.length ? placements.filter((value) => value <= 4).length / placements.length : 0,
    winRate: placements.length ? placements.filter((value) => value === 1).length / placements.length : 0,
    recentFiveAverage,
    previousFiveAverage,
    recentDelta,
    recentPlacements: history.slice(0, 10).map((record) => record.placement).reverse(),
    issues,
    comps,
    observations,
  };
}
