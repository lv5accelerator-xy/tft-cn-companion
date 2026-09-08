"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import BoardPreview from "../components/BoardPreview";
import { metaComps, metaPatch, metaUpdatedAt, type UnifiedMetaComp } from "@/data/meta";
import { metaSources, type MetaSourceId } from "@/data/meta-sources";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./comps.module.css";

const BUILDER_KEY = "tft-cn-companion-builder-v2";
type SourceFilter = "all" | MetaSourceId;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function CompRow({ comp, champions }: { comp: UnifiedMetaComp; champions: CatalogEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const byName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((unit) => map.set(normalize(unit.nameEn), unit));
    return map;
  }, [champions]);

  const units = [...comp.coreUnits, ...comp.flexUnits].slice(0, 9)
    .map((name) => byName.get(normalize(name)))
    .filter((entry): entry is CatalogEntry => Boolean(entry));

  function copyToBuilder() {
    const championIds = units.map((unit) => unit.id);
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({
        name: comp.nameZh,
        championIds,
        board: comp.board,
        sourceCompId: comp.id,
        sourceId: comp.sourceId,
        updatedAt: Date.now(),
      }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={styles.row} onDoubleClick={() => setExpanded((value) => !value)}>
      <span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>
        {comp.tier === "ACTIVE" ? "·" : comp.tier}
      </span>

      <button
        onClick={() => setExpanded((value) => !value)}
        className={styles.name}
        style={{ border: 0, background: "transparent", color: "inherit", textAlign: "left", padding: 0, cursor: "pointer" }}
      >
        <strong>{comp.nameZh}</strong>
        <span>{comp.name} · {comp.playstyle}</span>
        <em className={styles.sourceLine}>{comp.source} · {comp.sourceUpdatedAt}</em>
      </button>

      <div className={styles.units}>
        {units.map((unit) => (
          <span className={styles.unit} key={unit.id} title={`${unit.nameZh} / ${unit.nameEn}`}>
            <UnitIcon entry={unit} size={34} />
            {unit.tier ? <em>{unit.tier}</em> : null}
          </span>
        ))}
      </div>

      <div className={styles.traits}>
        {comp.traits.slice(0, 4).map((trait) => <span className={styles.trait} key={trait}>{trait}</span>)}
      </div>

      <span className={styles.stat}>—</span>
      <span className={styles.stat}>—</span>
      <span className={styles.stat}>—</span>
      <div className={styles.actions}>
        <button className={styles.copy} onClick={copyToBuilder}>{copied ? "已复制" : "复制阵容"}</button>
      </div>

      {expanded && (
        <div className={styles.details}>
          <div className={styles.sourceMeta}>
            <span><b>来源</b> {comp.source}</span>
            <span><b>更新</b> {comp.sourceUpdatedAt}</span>
            <span><b>文章</b> {comp.sourceArticleTitle}</span>
            {comp.sourceUrl ? <a href={comp.sourceUrl} target="_blank" rel="noreferrer">查看原文</a> : null}
          </div>
          <div className={styles.detailColumns}>
            <div>
              <strong>什么时候玩：</strong>{comp.whenToPlay || "来源尚未提供明确开局条件。"}
              <div style={{ marginTop: 6 }}><strong>装备优先：</strong>{comp.itemFocus.length ? comp.itemFocus.join(" · ") : "—"}</div>
              <div style={{ marginTop: 6 }}><strong>要点：</strong>{comp.keyNotes.length ? comp.keyNotes.slice(0, 3).join("；") : "—"}</div>
              <div className={styles.detailsGrid}>
                {comp.stages.map((stage) => (
                  <div className={styles.stage} key={stage.stage}>
                    <b>{stage.stage}</b>
                    {stage.text}
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.positioning}>
              <div className={styles.positioningHead}>
                <strong>参考站位</strong>
                <span>可按对手左右镜像</span>
              </div>
              <BoardPreview positions={comp.board} champions={champions} compact />
              <p>{comp.positioningNote}</p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function CompsPage() {
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "FAST8" | "REROLL">("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const sourceCounts = useMemo(() => {
    const counts = new Map<MetaSourceId, number>();
    for (const source of metaSources) counts.set(source.id, 0);
    for (const comp of metaComps) counts.set(comp.sourceId, (counts.get(comp.sourceId) ?? 0) + 1);
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return metaComps.filter((comp) => {
      const sourceMatch = sourceFilter === "all" || comp.sourceId === sourceFilter;
      const styleMatch = filter === "ALL"
        || (filter === "FAST8" && comp.playstyle.includes("Fast 8"))
        || (filter === "REROLL" && comp.playstyle.includes("Reroll"));
      const searchText = normalize([
        comp.name,
        comp.nameZh,
        comp.source,
        comp.sourceArticleTitle,
        ...comp.coreUnits,
        ...comp.flexUnits,
        ...comp.traits,
        ...comp.itemFocus,
      ].join(" "));
      return sourceMatch && styleMatch && (!q || searchText.includes(q));
    });
  }, [filter, query, sourceFilter]);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Live Meta Team Comps</h1>
          <p>多来源阵容库 · 公众号更新可自动同步 · 仅收录 Teamfight Tactics，不接入金铲铲数据</p>
        </div>
        <div className={styles.meta}>
          <span>Patch {metaPatch}</span>
          <span>Curated {metaUpdatedAt}</span>
          <span>{filtered.length} Comps</span>
        </div>
      </header>

      <section className={styles.sourceBar} aria-label="阵容来源">
        <button className={sourceFilter === "all" ? styles.sourceActive : ""} onClick={() => setSourceFilter("all")}>
          综合 <span>{metaComps.length}</span>
        </button>
        {metaSources.map((source) => (
          <button key={source.id} className={sourceFilter === source.id ? styles.sourceActive : ""} onClick={() => setSourceFilter(source.id)}>
            {source.name} <span>{sourceCounts.get(source.id) ?? 0}</span>
          </button>
        ))}
        <span className={styles.tftOnly}>TFT ONLY · 金铲铲已硬过滤</span>
      </section>

      <section className={styles.toolbar}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索阵容、英雄、羁绊或来源"
        />
        <div className={styles.filters}>
          <button className={filter === "ALL" ? styles.active : ""} onClick={() => setFilter("ALL")}>All</button>
          <button className={filter === "FAST8" ? styles.active : ""} onClick={() => setFilter("FAST8")}>Fast 8</button>
          <button className={filter === "REROLL" ? styles.active : ""} onClick={() => setFilter("REROLL")}>Reroll</button>
        </div>
        <span className={styles.note}>新文章或原文修改后，同步器按内容 Hash 更新对应阵容版本。</span>
      </section>

      <section className={styles.list}>
        <div className={styles.headerRow}>
          <span>Tier</span>
          <span>Comp / Source</span>
          <span>Core / Synergy Units</span>
          <span>Synergy</span>
          <span style={{ textAlign: "right" }}>Avg.</span>
          <span style={{ textAlign: "right" }}>Top 4</span>
          <span style={{ textAlign: "right" }}>1st</span>
          <span style={{ textAlign: "right" }}>Planner</span>
        </div>
        {filtered.map((comp) => <CompRow key={`${comp.sourceId}-${comp.id}-${comp.patch}`} comp={comp} champions={catalog?.champions ?? []} />)}
        {filtered.length === 0 && (
          <div className={styles.empty}>
            这个来源目前还没有已解析的 TFT 阵容。公众号 Feed/API 接入后，新内容会自动出现在这里。
          </div>
        )}
      </section>
    </div>
  );
}
