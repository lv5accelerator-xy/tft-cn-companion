"use client";

import Link from "next/link";
import type { UnifiedMetaComp } from "@/data/meta";
import { comparisonsForComp, relatedGuides, rankingSnapshot, rankingSources, type RankingEntry } from "@/data/rankings";
import { useLocale } from "../components/LocaleProvider";
import styles from "./comparison.module.css";

export function ExternalRanking({ entry }: { entry: RankingEntry }) {
  const { locale, tr } = useLocale();
  const source = rankingSources.find(source => source.id === entry.sourceId)!;
  const { stats } = entry;
  return <article className={styles.card}>
    <div><strong>{source.name} · {entry.tier}{entry.conditionalTier ? ` (${entry.conditionalTier})` : ""}</strong><span>Patch {entry.patch}</span></div>
    <a href={entry.url} target="_blank" rel="noreferrer">{locale === "zh" ? entry.nameZh : entry.name} ↗</a>
    <p>{entry.name}</p>
    {entry.conditionalTier && <p className={styles.notice}>{tr("条件阵容：仅在满足原文的强化／转职要求时参考此评级。", "Situational: this tier requires the augment/emblem conditions in the original guide.")}</p>}
    {stats && <dl><div><dt>{tr("平均名次", "Avg. place")}</dt><dd>{stats.averagePlacement.toFixed(2)}</dd></div><div><dt>{tr("前四率", "Top 4")}</dt><dd>{(stats.top4Rate * 100).toFixed(1)}%</dd></div><div><dt>{tr("吃鸡率", "Win")}</dt><dd>{(stats.winRate * 100).toFixed(1)}%</dd></div></dl>}
    <p>{locale === "zh" ? source.scope : source.scopeEn}</p>
    <p>{tr("采集", "Captured")}: {rankingSnapshot.capturedAt} · {tr("当时显示更新于", "Update label at capture")}: {source.sourceUpdatedLabel}</p>
  </article>;
}

export default function SourceComparison({ comp }: { comp: UnifiedMetaComp }) {
  const { tr } = useLocale();
  const entries = comparisonsForComp(comp);
  const guides = relatedGuides(comp);
  if (!entries.length) return null;
  return <section className={styles.section} aria-label={tr("多来源评级对照", "Source comparison")}>
    <h3>{tr("多来源评级对照", "Source comparison")}</h3>
    <p>{tr("同体系的已核验构筑集中展示，具体单位与装备以各来源为准。评级独立保留，不计算综合分；不同补丁的数据不可直接比较。", "Reviewed builds in this archetype are grouped; units and items follow each source. Tiers remain independent. Different patches are not directly comparable.")}</p>
    <div className={styles.grid}>
      {guides.map(guide => <article className={styles.card} key={`${guide.sourceId}:${guide.id}`}><strong>{guide.source} · {guide.sourceTier ?? guide.ranking?.sourceTier ?? guide.tier}</strong><p>{guide.nameZh} · Patch {guide.patch}</p><p>{tr("来源更新", "Source updated")}: {guide.ranking?.sourceUpdatedLabel ?? guide.sourceUpdatedAt}</p>{guide.ranking && <p>{tr("平均名次", "Avg. place")} {guide.ranking.averagePlacement.toFixed(2)} · {tr("前四率", "Top 4")} {(guide.ranking.top4Rate * 100).toFixed(1)}% · {tr("全服／全段位／ALL 模式", "All servers / all ranks / ALL modes")}</p>}<a href={guide.sourceUrl} target="_blank" rel="noreferrer">{tr("查看来源", "Original")} ↗</a>{guide.id !== comp.id && <a href={`/comps?source=${guide.sourceId}&comp=${encodeURIComponent(guide.id)}`}>{tr("查看该来源攻略", "View this guide")}</a>}</article>)}
      {entries.map(entry => <ExternalRanking key={entry.id} entry={entry} />)}
    </div>
    <Link href="/rankings">{tr("查看完整多来源榜单", "Browse all source rankings")} →</Link>
  </section>;
}
