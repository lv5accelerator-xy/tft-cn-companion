"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import BoardPreview from "../components/BoardPreview";
import { useLocale } from "../components/LocaleProvider";
import { metaComps, metaPatch, metaUpdatedAt, type UnifiedMetaComp } from "@/data/meta";
import { metaSources, type MetaSourceId } from "@/data/meta-sources";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { BUILDER_KEY, FOCUS_KEY, FOCUS_TRAY_KEY, LOCAL_IMPORT_KEY, markWorkspaceChanged } from "@/lib/workspace";
import styles from "./comps.module.css";

type SourceFilter = "all" | MetaSourceId;
type FocusRef = { sourceId: string; id: string };
type CandidateSlot = FocusRef | null;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function sameRef(left: FocusRef | null, right: FocusRef) {
  return Boolean(left && left.sourceId === right.sourceId && left.id === right.id);
}

function readCandidateSlots(): CandidateSlot[] {
  const empty: CandidateSlot[] = [null, null, null];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FOCUS_TRAY_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return empty;
    return [0, 1, 2].map((index) => {
      const value = parsed[index];
      if (!value || typeof value !== "object") return null;
      const ref = value as Partial<FocusRef>;
      return typeof ref.sourceId === "string" && typeof ref.id === "string" ? { sourceId: ref.sourceId, id: ref.id } : null;
    });
  } catch {
    return empty;
  }
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.name === "string" && typeof comp.nameZh === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.flexUnits) && Array.isArray(comp.board);
}

function CompRow({ comp, champions }: { comp: UnifiedMetaComp; champions: CatalogEntry[] }) {
  const router = useRouter();
  const { locale, tr } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [candidateStatus, setCandidateStatus] = useState("");

  const byName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((unit) => { map.set(normalize(unit.nameEn), unit); map.set(normalize(unit.nameZh), unit); map.set(normalize(unit.id), unit); });
    return map;
  }, [champions]);

  const units = [...comp.coreUnits, ...comp.flexUnits].slice(0, 9).map((name) => byName.get(normalize(name))).filter((entry): entry is CatalogEntry => Boolean(entry));

  function openBuilder() {
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({ name: locale === "zh" ? comp.nameZh : comp.name, championIds: units.map((unit) => unit.id), champions: [...comp.coreUnits, ...comp.flexUnits], board: comp.board, sourceCompId: comp.id, sourceId: comp.sourceId, updatedAt: Date.now() }));
      markWorkspaceChanged();
    } catch {}
    router.push("/builder");
  }

  function openFocus() {
    try { window.localStorage.setItem(FOCUS_KEY, JSON.stringify({ sourceId: comp.sourceId, id: comp.id, updatedAt: Date.now() })); } catch {}
    router.push(`/focus?source=${encodeURIComponent(comp.sourceId)}&id=${encodeURIComponent(comp.id)}`);
  }

  function addCandidate() {
    const ref = { sourceId: comp.sourceId, id: comp.id };
    try {
      const slots = readCandidateSlots();
      const existing = slots.findIndex((slot) => sameRef(slot, ref));
      if (existing >= 0) {
        setCandidateStatus(tr(`候选 ${existing + 1}`, `Slot ${existing + 1}`));
        window.setTimeout(() => setCandidateStatus(""), 1400);
        return;
      }
      const slotIndex = slots.findIndex((slot) => slot === null);
      const target = slotIndex >= 0 ? slotIndex : 2;
      slots[target] = ref;
      window.localStorage.setItem(FOCUS_TRAY_KEY, JSON.stringify(slots));
      setCandidateStatus(tr(`已加入 ${target + 1}`, `Added ${target + 1}`));
      window.setTimeout(() => setCandidateStatus(""), 1400);
    } catch {
      setCandidateStatus(tr("保存失败", "Failed"));
    }
  }

  return (
    <article className={styles.row} onDoubleClick={() => setExpanded((value) => !value)}>
      <span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span>
      <button onClick={() => setExpanded((value) => !value)} className={styles.name}><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><span>{locale === "zh" ? comp.name : comp.nameZh} · {comp.playstyle}</span><em className={styles.sourceLine}>{comp.source} · {comp.sourceUpdatedAt}{comp.syncOrigin === "manual" ? ` · ${tr("图片导入", "Image import")}` : ""}</em></button>
      <div className={styles.units}>{units.map((unit) => <span className={styles.unit} key={unit.id} title={`${unit.nameZh} / ${unit.nameEn}`}><UnitIcon entry={unit} size={38} />{unit.tier ? <em>{unit.tier}</em> : null}</span>)}</div>
      <div className={styles.traits}>{comp.traits.slice(0, 4).map((trait) => <span className={styles.trait} key={trait}>{trait}</span>)}</div>
      <div className={styles.actions}><button className={styles.candidateButton} onClick={addCandidate}>☆ {candidateStatus || tr("候选", "Candidate")}</button><button className={styles.focusButton} onClick={openFocus}>◉ {tr("对局", "Focus")}</button><button className={styles.builderButton} onClick={openBuilder}>Builder</button></div>

      {expanded && <div className={styles.details}><div className={styles.sourceMeta}><span><b>{tr("来源", "Source")}</b> {comp.source}</span><span><b>{tr("更新", "Updated")}</b> {comp.sourceUpdatedAt}</span><span><b>{tr("文章", "Article")}</b> {comp.sourceArticleTitle}</span>{comp.sourceUrl ? <a href={comp.sourceUrl} target="_blank" rel="noreferrer">{tr("查看原文", "Original")}</a> : null}</div><div><strong>{tr("什么时候玩：", "When to play: ")}</strong>{comp.whenToPlay || "—"}<div className={styles.detailLine}><strong>{tr("装备优先：", "Item priority: ")}</strong>{comp.itemFocus.length ? comp.itemFocus.join(" · ") : "—"}</div><div className={styles.detailLine}><strong>{tr("要点：", "Notes: ")}</strong>{comp.keyNotes.length ? comp.keyNotes.slice(0, 5).join(locale === "zh" ? "；" : "; ") : "—"}</div><div className={styles.detailsGrid}>{comp.stages.map((stage) => <div className={styles.stage} key={stage.stage}><b>{stage.stage}</b>{stage.text}</div>)}</div><div className={styles.positioning}><div className={styles.positioningHead}><strong>{tr("参考站位", "Positioning")}</strong><span>{tr("前排在上 · 后排在下 · 对局模式可一键镜像", "Front on top · backline below · mirror instantly in Game Focus")}</span></div><BoardPreview positions={comp.board} champions={champions} /><p>{comp.positioningNote}</p></div></div></div>}
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

  return <div className={styles.page}><header className={styles.heading}><div><h1>Live Meta Team Comps</h1><p>{tr("开局前把最多 3 套阵容加入候选夹，对局中按 1 / 2 / 3 直接切换。", "Pin up to three comps before the game, then switch with 1 / 2 / 3 in Game Focus.")}</p></div><div className={styles.meta}><span>Patch {metaPatch}</span><span>Curated {metaUpdatedAt}</span><span>{filtered.length} Comps</span></div></header><section className={styles.sourceBar}><button className={sourceFilter === "all" ? styles.sourceActive : ""} onClick={() => setSourceFilter("all")}>{tr("综合", "All Sources")} <span>{allComps.length}</span></button>{metaSources.map((source) => <button key={source.id} className={sourceFilter === source.id ? styles.sourceActive : ""} onClick={() => setSourceFilter(source.id)}>{source.name} <span>{sourceCounts.get(source.id) ?? 0}</span></button>)}<span className={styles.tftOnly}>TFT ONLY</span></section><section className={styles.toolbar}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("搜索阵容、英雄、羁绊或来源", "Search comps, champions, traits or sources")} /><div className={styles.filters}><button className={filter === "ALL" ? styles.active : ""} onClick={() => setFilter("ALL")}>All</button><button className={filter === "FAST8" ? styles.active : ""} onClick={() => setFilter("FAST8")}>Fast 8</button><button className={filter === "REROLL" ? styles.active : ""} onClick={() => setFilter("REROLL")}>Reroll</button></div><span className={styles.note}>{tr("☆ 候选会保存到本机 Second Screen HUD 的 1 / 2 / 3 槽位。", "☆ Candidates are saved to the local Second Screen HUD slots 1 / 2 / 3.")}</span></section><section className={styles.list}><div className={styles.headerRow}><span>Tier</span><span>Comp / Source</span><span>Core / Units</span><span>Synergy</span><span>{tr("操作", "Actions")}</span></div>{filtered.map((comp) => <CompRow key={`${comp.sourceId}-${comp.id}-${comp.patch}`} comp={comp} champions={catalog?.champions ?? []} />)}{!filtered.length && <div className={styles.empty}>{tr("没有匹配阵容。", "No matching comps.")}</div>}</section></div>;
}
