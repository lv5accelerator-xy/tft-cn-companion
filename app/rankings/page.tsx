"use client";

import Link from "next/link";
import PageQuerySync from "../components/PageQuerySync";
import SnapshotNotice from "../comps/SnapshotNotice";
import { updatePageQuery } from "@/lib/page-query";
import { useCallback, useMemo, useState } from "react";
import { rankedGroups, rankingSources, rankingSnapshot } from "@/data/rankings";
import { ExternalRanking } from "../comps/SourceComparison";
import { useLocale } from "../components/LocaleProvider";
import cards from "../comps/comparison.module.css";
import styles from "./rankings.module.css";

export default function RankingsPage() {
  const { locale, tr } = useLocale();
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const syncQuery = useCallback((query: string) => {
    const params = new URLSearchParams(query);
    const source = params.get("source");
    const tier = params.get("tier");
    setSource(rankingSources.some(item => item.id === source) ? source! : "all");
    setTier(["S", "A", "B", "C", "D", "X"].includes(tier ?? "") ? tier! : "all");
    setQuery(params.get("q") ?? "");
  }, []);
  const groups = useMemo(() => rankedGroups.filter(group => {
    const matching = group.entries.filter(entry => (source === "all" || entry.sourceId === source) && (tier === "all" || entry.tier === tier));
    const text = [...group.entries.flatMap(entry => [entry.name, entry.nameZh, ...entry.units]), ...group.guides.flatMap(guide => [guide.nameZh, ...guide.coreUnits, ...guide.flexUnits])].join(" ").toLowerCase();
    return matching.length > 0 && text.includes(query.trim().toLowerCase());
  }), [source, query, tier]);
  return <div className={styles.page}>
    <PageQuerySync onChange={syncQuery} />
    <SnapshotNotice />
    <header><h1>{tr("多来源阵容榜单", "Multi-source comp rankings")}</h1><p>{tr("专家评级与实战统计分列展示。相同体系合并查看，不同构筑保留来源名称；不计算混合评级。", "Expert tiers and match statistics stay separate. Reviewed archetypes are grouped, with original build names and no blended score.")}</p><Link href="/comps">← {tr("返回阵容攻略", "Comp guides")}</Link></header>
    <div className={cards.grid}>{rankingSources.map(item => <section className={cards.card} key={item.id}><strong>{item.name} · {item.recordCount} {tr("条", "entries")} · {item.patch}</strong><p>{locale === "zh" ? item.scope : item.scopeEn}</p><p>{tr("采集", "Captured")}: {rankingSnapshot.capturedAt}</p><p>{tr("采集时来源显示更新于", "Source update label at capture")}: {item.sourceUpdatedLabel} · {tr("未提供精确更新时间", "Exact update time unavailable")}</p>{item.totalCompsAnalyzed && <p>{tr("来源分析阵容总量", "Total comps analyzed by source")}: {item.totalCompsAnalyzed.toLocaleString("en-US")} · {tr("不是单套阵容样本量", "Not the sample size of each comp")}</p>}<a href={item.url} target="_blank" rel="noreferrer">{tr("打开原始榜单", "Original rankings")} ↗</a></section>)}</div>
    <p className={styles.notice}>{tr("这是核验后的静态快照。采集时 Academy S 级为空；X 表示条件阵容。OP.GG 对照数据仍为 18.2，其他榜单为 18.2b。", "This is a verified static snapshot. Academy had no S tier at capture; X means situational. OP.GG comparisons remain on 18.2, while other rankings use 18.2b.")} <a href="https://tactics.tools/team-compositions" target="_blank" rel="noreferrer">{tr("去 tactics.tools 交叉核验", "Cross-check on tactics.tools")} ↗</a></p>
    <div className={styles.filters}><label>{tr("来源", "Source")}<select value={source} onChange={event => { setSource(event.target.value); updatePageQuery({ source: event.target.value }); }}><option value="all">{tr("全部来源", "All sources")}</option>{rankingSources.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>{tr("原始评级", "Original tier")}<select value={tier} onChange={event => { setTier(event.target.value); updatePageQuery({ tier: event.target.value }); }}>{["all", "S", "A", "B", "C", "D", "X"].map(value => <option value={value} key={value}>{value === "all" ? tr("全部评级", "All tiers") : value}</option>)}</select></label><label>{tr("搜索阵容／英雄", "Search comps / units")}<input value={query} onChange={event => { setQuery(event.target.value); updatePageQuery({ q: event.target.value }, true); }} /></label><span aria-live="polite">{groups.length} {tr("组", "groups")}</span><button type="button" onClick={() => { setSource("all"); setTier("all"); setQuery(""); updatePageQuery({ source: null, tier: null, q: null }); }}>{tr("清除筛选", "Clear filters")}</button></div>
    <div className={styles.tableWrap}><table><caption>{tr("评级按来源独立展示；展开查看统计口径及原文", "Independent source ratings; expand for scope and originals")}</caption><thead><tr><th>{tr("阵容体系", "Archetype")}</th><th>{tr("兔顶", "Tuding")}</th><th>Academy</th><th>MetaTFT</th><th>OP.GG</th></tr></thead><tbody>{groups.map(group => {
      const guide = group.guides.find(guide => guide.sourceId === "tuding");
      return <tr key={group.id}><td><details><summary>{locale === "zh" ? guide?.nameZh ?? group.entries[0].nameZh : group.entries[0].name}</summary><div className={styles.expanded}><div className={cards.grid}>{group.entries.map(entry => <ExternalRanking key={entry.id} entry={entry} />)}</div>{group.guides.map(item => <p key={item.id}><Link href={`/comps?source=${item.sourceId}&comp=${encodeURIComponent(item.id)}`}>{item.source} · {locale === "zh" ? item.nameZh : item.name} · {item.patch} →</Link></p>)}{group.entries.map(entry => <p key={entry.id}>{entry.name}: {entry.units.length ? entry.units.join(" · ") : tr("单位明细请查看原文", "See original for units")}</p>)}</div></details></td>{["tuding", "tft-academy", "metatft", "opgg"].map(id => {
        const entry = group.entries.find(entry => entry.sourceId === id);
        const native = group.guides.find(guide => guide.sourceId === id);
        return <td key={id}>{entry ? <><strong>{entry.tier}{entry.conditionalTier ? ` (${entry.conditionalTier})` : ""}</strong><small>{entry.patch}</small>{entry.stats && <small>{tr("均名", "Avg")} {entry.stats.averagePlacement.toFixed(2)}<br />{tr("前四", "Top 4")} {(entry.stats.top4Rate * 100).toFixed(1)}%</small>}</> : native ? <><strong>{native.sourceTier ?? native.ranking?.sourceTier ?? native.tier}</strong><small>{native.patch}</small></> : "—"}</td>;
      })}</tr>;
    })}</tbody></table></div>{!groups.length && <p>{tr("没有匹配的榜单记录。", "No matching entries.")}</p>}
  </div>;
}
