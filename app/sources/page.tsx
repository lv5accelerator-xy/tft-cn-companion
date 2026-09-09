"use client";

import Link from "next/link";
import { useLocale } from "../components/LocaleProvider";
import { liveMetaSnapshot } from "@/data/live-meta";
import { metaSources, tftOnlyPolicy, type MetaSourceId } from "@/data/meta-sources";
import { compsForSource } from "@/data/meta";
import styles from "./sources.module.css";

function sourceState(sourceId: MetaSourceId) {
  return liveMetaSnapshot.sourceStates.find((state) => state.sourceId === sourceId);
}

export default function SourcesPage() {
  const { locale, tr } = useLocale();
  const liveRecords = liveMetaSnapshot.records.length;
  const liveArticles = liveMetaSnapshot.articles.length;

  function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-CA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  }

  function statusLabel(status?: string) {
    if (status === "ready") return tr("已连接", "Connected");
    if (status === "curated") return tr("人工审核", "Curated");
    if (status === "error") return tr("异常", "Error");
    return tr("等待接入", "Awaiting Feed");
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><h1>Live Meta Sources</h1><p>{tr("阵容来源同步状态 · 只收录 Teamfight Tactics，不接入金铲铲之战数据。", "Comp source status · Teamfight Tactics only; Golden Spatula data is not ingested.")}</p></div>
        <div className={styles.summary}><span>{liveArticles} Articles</span><span>{liveRecords} Live Comps</span><span>{liveMetaSnapshot.generatedAt ? `${tr("同步", "Synced")} ${formatDate(liveMetaSnapshot.generatedAt)}` : tr("等待数据源", "Waiting for feeds")}</span></div>
      </header>

      <section className={styles.policy}>
        <div><strong>TFT ONLY</strong><span>{tr("允许：", "Allow: ")}{tftOnlyPolicy.allowSignals.join(" · ")}</span></div>
        <div><strong>Hard Block</strong><span>{tftOnlyPolicy.blockedSignals.join(" · ")}</span></div>
      </section>

      <section className={styles.grid}>
        {metaSources.map((source) => {
          const state = sourceState(source.id);
          const compCount = compsForSource(source.id).length;
          const articleCount = liveMetaSnapshot.articles.filter((article) => article.sourceId === source.id).length;
          return (
            <article className={styles.card} key={source.id}>
              <div className={styles.cardHead}><div><span className={styles.channel}>{source.channel}</span><h2>{source.name}</h2></div><span className={`${styles.status} ${styles[`status_${state?.status ?? "awaiting_feed"}`]}`}>{statusLabel(state?.status)}</span></div>
              <p className={styles.description}>{source.description}</p>
              <div className={styles.metrics}><div><span>{tr("当前阵容", "Current comps")}</span><strong>{compCount}</strong></div><div><span>{tr("同步文章", "Articles")}</span><strong>{articleCount}</strong></div><div><span>{tr("优先级", "Priority")}</span><strong>P{source.priority}</strong></div></div>
              <dl className={styles.details}><div><dt>{tr("最近检查", "Last check")}</dt><dd>{formatDate(state?.lastCheckedAt ?? null)}</dd></div><div><dt>{tr("最近变化", "Last change")}</dt><dd>{formatDate(state?.lastChangedAt ?? null)}</dd></div><div><dt>{tr("状态说明", "Status")}</dt><dd>{state?.message ?? tr("等待同步状态", "Awaiting sync state")}</dd></div></dl>
              <div className={styles.cardFoot}><Link href={`/comps?source=${source.id}`}>{tr("查看该来源阵容", "View source comps")}</Link><span>{source.game}</span></div>
            </article>
          );
        })}
      </section>

      <section className={styles.pipeline}>
        <div className={styles.pipelineHead}><div><h2>{tr("同步管线", "Sync Pipeline")}</h2><p>{tr("公众号 Feed/API 接通后，每次检查只在内容 Hash 变化时更新阵容快照。当前主要使用手动一图流导入。", "When a Feed/API is connected, snapshots update only when content hashes change. Manual infographic import remains the primary source today.")}</p></div><span>Hash-based</span></div>
        <div className={styles.steps}>
          <div><b>1</b><strong>{tr("发现新文章", "Discover")}</strong><span>{tr("读取 Feed/API 候选内容", "Read candidate Feed/API content")}</span></div>
          <div><b>2</b><strong>{tr("TFT 过滤", "TFT Filter")}</strong><span>{tr("金铲铲关键词与 gameMode 双重阻断", "Block Golden Spatula keywords and non-TFT game modes")}</span></div>
          <div><b>3</b><strong>{tr("结构化", "Structure")}</strong><span>{tr("阵容、英雄、装备、强化、站位、运营", "Comps, units, items, augments, board and stages")}</span></div>
          <div><b>4</b><strong>{tr("Hash 对比", "Hash Compare")}</strong><span>{tr("内容未变化则复用上次结果", "Reuse the last parse when content is unchanged")}</span></div>
          <div><b>5</b><strong>{tr("发布", "Publish")}</strong><span>{tr("数据变化后进入受控发布流程", "Changed data enters the controlled release flow")}</span></div>
        </div>
      </section>
    </div>
  );
}
