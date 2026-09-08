"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import BoardPreview from "../components/BoardPreview";
import { useLocale } from "../components/LocaleProvider";
import { metaComps, metaPatch, metaUpdatedAt, type UnifiedMetaComp } from "@/data/meta";
import { metaSources, type MetaSourceId } from "@/data/meta-sources";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { BUILDER_KEY, LOCAL_IMPORT_KEY, markWorkspaceChanged } from "@/lib/workspace";
import styles from "./comps.module.css";

type SourceFilter = "all" | MetaSourceId;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.name === "string" && typeof comp.nameZh === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.flexUnits) && Array.isArray(comp.board);
}

function CompRow({ comp, champions }: { comp: UnifiedMetaComp; champions: CatalogEntry[] }) {
  const { locale, tr } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const byName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((unit) => { map.set(normalize(unit.nameEn), unit); map.set(normalize(unit.nameZh), unit); map.set(normalize(unit.id), unit); });
    return map;
  }, [champions]);

  const units = [...comp.coreUnits, ...comp.flexUnits].slice(0, 9).map((name) => byName.get(normalize(name))).filter((entry): entry is CatalogEntry => Boolean(entry));

  function copyToBuilder() {
    const championIds = units.map((unit) => unit.id);
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({ name: locale === "zh" ? comp.nameZh : comp.name, championIds, champions: [...comp.coreUnits, ...comp.flexUnits], board: comp.board, sourceCompId: comp.id, sourceId: comp.sourceId, updatedAt: Date.now() }));
      markWorkspaceChanged();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={styles.row} onDoubleClick={() => setExpanded((value) => !value)}>
      <span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span>
      <button onClick={() => setExpanded((value) => !value)} className={styles.name} style={{ border: 0, background: "transparent", color: "inherit", textAlign: "left", padding: 0, cursor: "pointer" }}>
        <strong>{locale === "zh" ? comp.nameZh : comp.name}</strong>
        <span>{locale === "zh" ? comp.name : comp.nameZh} · {comp.playstyle}</span>
        <em className={styles.sourceLine}>{comp.source} · {comp.sourceUpdatedAt}{comp.syncOrigin === "manual" ? ` · ${tr("图片导入", "Image import")}` : ""}</em>
      </button>
      <div className={styles.units}>{units.map((unit) => <span className={styles.unit} key={unit.id} title={`${unit.nameZh} / ${unit.nameEn}`}><UnitIcon entry={unit} size={36} />{unit.tier ? <em>{unit.tier}</em> : null}</span>)}</div>
      <div className={styles.traits}>{comp.traits.slice(0, 4).map((trait) => <span className={styles.trait} key={trait}>{trait}</span>)}</div>
      <span className={styles.stat}>—</span><span className={styles.stat}>—</span><span className={styles.stat}>—</span>
      <div className={styles.actions}><button className={styles.copy} onClick={copyToBuilder}>{copied ? tr("已复制", "Copied") : tr("复制阵容", "Copy comp")}</button></div>

      {expanded && (
        <div className={styles.details}>
          <div className={styles.sourceMeta}>
            <span><b>{tr("来源", "Source")}</b> {comp.source}</span><span><b>{tr("更新", "Updated")}</b> {comp.sourceUpdatedAt}</span><span><b>{tr("文章", "Article")}</b> {comp.sourceArticleTitle}</span>{comp.sourceUrl ? <a href={comp.sourceUrl} target="_blank" rel="noreferrer">{tr("查看原文", "Original")}</a> : null}
          </div>
          <div className={styles.detailColumns}>
            <div>
              <strong>{tr("什么时候玩：", "When to play: ")}</strong>{comp.whenToPlay || tr("来源尚未提供明确开局条件。", "The source did not specify a clear opener condition.")}
              <div className={styles.detailLine}><strong>{tr("装备优先：", "Item priority: ")}</strong>{comp.itemFocus.length ? comp.itemFocus.join(" · ") : "—"}</div>
              <div className={styles.detailLine}><strong>{tr("要点：", "Notes: ")}</strong>{comp.keyNotes.length ? comp.keyNotes.slice(0, 5).join(locale === "zh" ? "；" : "; ") : "—"}</div>
              <div className={styles.detailsGrid}>{comp.stages.map((stage) => <div className={styles.stage} key={stage.stage}><b>{stage.stage}</b>{stage.text}</div>)}</div>
            </div>
            <div className={styles.positioning}>
              <div className={styles.positioningHead}><strong>{tr("参考站位", "Positioning")}</strong><span>{tr("前排在上 · 后排在下 · 可按对手左右镜像", "Front on top · backline below · mirror for opponents")}</span></div>
              <BoardPreview positions={comp.board} champions={champions} /><p>{comp.positioningNote}</p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function CompsPage() {
  const { tr } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "FAST8" | "REROLL">("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  useEffect(() => { fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()).then(setCatalog).catch(() => setCatalog(null)); }, []);
  useEffect(() => { try { const parsed = JSON.parse(window.localStorage.getItem(LOCAL_IMPORT_KEY) || "[]") as unknown[]; setLocalComps(parsed.filter(isManualComp)); } catch { setLocalComps([]); } }, []);

  const allComps = useMemo(() => { const seen = new Set<string>(); return [...localComps, ...metaComps].filter((comp) => { const key = `${comp.sourceId}:${comp.id}:${comp.patch}`; if (seen.has(key)) return false; seen.add(key); return true; }); }, [localComps]);
  const sourceCounts = useMemo(() => { const counts = new Map<MetaSourceId, number>(); for (const source of metaSources) counts.set(source.id, 0); for (const comp of allComps) counts.set(comp.sourceId, (counts.get(comp.sourceId) ?? 0) + 1); return counts; }, [allComps]);
  const filtered = useMemo(() => {
    const q = normalize(query);
    return allComps.filter((comp) => {
      const sourceMatch = sourceFilter === "all" || comp.sourceId === sourceFilter;
      const styleMatch = filter === "ALL" || (filter === "FAST8" && comp.playstyle.toLowerCase().includes("fast 8")) || (filter === "REROLL" && comp.playstyle.toLowerCase().includes("reroll"));
      const searchText = normalize([comp.name, comp.nameZh, comp.source, comp.sourceArticleTitle, ...comp.coreUnits, ...comp.flexUnits, ...comp.traits, ...comp.itemFocus].join(" "));
      return sourceMatch && styleMatch && (!q || searchText.includes(q));
    });
  }, [allComps, filter, query, sourceFilter]);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><h1>Live Meta Team Comps</h1><p>{tr("多来源阵容库 · 支持一图流手动导入 · 仅收录 Teamfight Tactics，不接入金铲铲数据", "Multi-source comp library · infographic imports · Teamfight Tactics only; Golden Spatula data is blocked")}</p></div>
        <div className={styles.meta}><span>Patch {metaPatch}</span><span>Curated {metaUpdatedAt}</span><span>{filtered.length} Comps</span></div>
      </header>
      <section className={styles.sourceBar} aria-label={tr("阵容来源", "Comp sources")}>
        <button className={sourceFilter === "all" ? styles.sourceActive : ""} onClick={() => setSourceFilter("all")}>{tr("综合", "All Sources")} <span>{allComps.length}</span></button>
        {metaSources.map((source) => <button key={source.id} className={sourceFilter === source.id ? styles.sourceActive : ""} onClick={() => setSourceFilter(source.id)}>{source.name} <span>{sourceCounts.get(source.id) ?? 0}</span></button>)}
        <span className={styles.tftOnly}>TFT ONLY · {tr("金铲铲已硬过滤", "Golden Spatula blocked")}</span>
      </section>
      <section className={styles.toolbar}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("搜索阵容、英雄、羁绊或来源", "Search comps, champions, traits or sources")} />
        <div className={styles.filters}><button className={filter === "ALL" ? styles.active : ""} onClick={() => setFilter("ALL")}>All</button><button className={filter === "FAST8" ? styles.active : ""} onClick={() => setFilter("FAST8")}>Fast 8</button><button className={filter === "REROLL" ? styles.active : ""} onClick={() => setFilter("REROLL")}>Reroll</button></div>
        <span className={styles.note}>{tr("图片导入阵容保存在工作区，可通过 V1.0 云同步跨设备恢复。", "Image-imported comps live in your workspace and can be restored across devices with V1.0 cloud sync.")}</span>
      </section>
      <section className={styles.list}>
        <div className={styles.headerRow}><span>Tier</span><span>Comp / Source</span><span>Core / Synergy Units</span><span>Synergy</span><span style={{ textAlign: "right" }}>Avg.</span><span style={{ textAlign: "right" }}>Top 4</span><span style={{ textAlign: "right" }}>1st</span><span style={{ textAlign: "right" }}>Planner</span></div>
        {filtered.map((comp) => <CompRow key={`${comp.sourceId}-${comp.id}-${comp.patch}`} comp={comp} champions={catalog?.champions ?? []} />)}
        {!filtered.length && <div className={styles.empty}>{tr("这个来源目前还没有已解析的 TFT 阵容。可以从“一图流导入”上传攻略图片。", "This source has no parsed TFT comps yet. Use Image Import to add an infographic.")}</div>}
      </section>
    </div>
  );
}
