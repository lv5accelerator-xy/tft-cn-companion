import Link from "next/link";
import { liveMetaSnapshot } from "@/data/live-meta";
import { metaSources, tftOnlyPolicy, type MetaSourceId } from "@/data/meta-sources";
import { compsForSource } from "@/data/meta";
import styles from "./sources.module.css";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function sourceState(sourceId: MetaSourceId) {
  return liveMetaSnapshot.sourceStates.find((state) => state.sourceId === sourceId);
}

function statusLabel(status?: string) {
  if (status === "ready") return "已连接";
  if (status === "curated") return "人工审核";
  if (status === "error") return "异常";
  return "等待接入";
}

export default function SourcesPage() {
  const liveRecords = liveMetaSnapshot.records.length;
  const liveArticles = liveMetaSnapshot.articles.length;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Live Meta Sources</h1>
          <p>阵容来源同步状态 · 只收录 Teamfight Tactics，不接入金铲铲之战数据。</p>
        </div>
        <div className={styles.summary}>
          <span>{liveArticles} Articles</span>
          <span>{liveRecords} Live Comps</span>
          <span>{liveMetaSnapshot.generatedAt ? `Synced ${formatDate(liveMetaSnapshot.generatedAt)}` : "Waiting for feeds"}</span>
        </div>
      </header>

      <section className={styles.policy}>
        <div>
          <strong>TFT ONLY</strong>
          <span>允许：{tftOnlyPolicy.allowSignals.join(" · ")}</span>
        </div>
        <div>
          <strong>Hard Block</strong>
          <span>{tftOnlyPolicy.blockedSignals.join(" · ")}</span>
        </div>
      </section>

      <section className={styles.grid}>
        {metaSources.map((source) => {
          const state = sourceState(source.id);
          const compCount = compsForSource(source.id).length;
          const articleCount = liveMetaSnapshot.articles.filter((article) => article.sourceId === source.id).length;
          return (
            <article className={styles.card} key={source.id}>
              <div className={styles.cardHead}>
                <div>
                  <span className={styles.channel}>{source.channel}</span>
                  <h2>{source.name}</h2>
                </div>
                <span className={`${styles.status} ${styles[`status_${state?.status ?? "awaiting_feed"}`]}`}>
                  {statusLabel(state?.status)}
                </span>
              </div>

              <p className={styles.description}>{source.description}</p>

              <div className={styles.metrics}>
                <div><span>当前阵容</span><strong>{compCount}</strong></div>
                <div><span>同步文章</span><strong>{articleCount}</strong></div>
                <div><span>优先级</span><strong>P{source.priority}</strong></div>
              </div>

              <dl className={styles.details}>
                <div><dt>最近检查</dt><dd>{formatDate(state?.lastCheckedAt ?? null)}</dd></div>
                <div><dt>最近变化</dt><dd>{formatDate(state?.lastChangedAt ?? null)}</dd></div>
                <div><dt>状态说明</dt><dd>{state?.message ?? "等待同步状态"}</dd></div>
              </dl>

              <div className={styles.cardFoot}>
                <Link href={`/comps?source=${source.id}`}>查看该来源阵容</Link>
                <span>{source.game}</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.pipeline}>
        <div className={styles.pipelineHead}>
          <div>
            <h2>同步管线</h2>
            <p>公众号 Feed/API 接通后，GitHub Actions 每小时检查；只有内容 Hash 发生变化才更新阵容快照并触发 Vercel。</p>
          </div>
          <span>Hourly</span>
        </div>
        <div className={styles.steps}>
          <div><b>1</b><strong>发现新文章</strong><span>读取公众号 Feed/API 候选内容</span></div>
          <div><b>2</b><strong>TFT 过滤</strong><span>金铲铲关键词与 gameMode 双重阻断</span></div>
          <div><b>3</b><strong>结构化</strong><span>阵容、英雄、装备、强化、站位、运营</span></div>
          <div><b>4</b><strong>Hash 对比</strong><span>文章未变化则复用上次解析结果</span></div>
          <div><b>5</b><strong>自动发布</strong><span>数据变化后提交 main，Vercel 自动部署</span></div>
        </div>
      </section>
    </div>
  );
}
