"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import BoardPreview from "../components/BoardPreview";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./builder.module.css";

const BUILDER_KEY = "tft-cn-companion-builder-v2";
const SHARE_PREFIX = "TFTC1:";

type ImportPayload = {
  name?: string;
  championIds?: string[];
  champions?: string[];
  board?: BoardPosition[];
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function encodeShare(payload: ImportPayload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `${SHARE_PREFIX}${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
}

function decodeShare(value: string): ImportPayload {
  const encoded = value.slice(SHARE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as ImportPayload;
}

function isBoardPosition(value: unknown): value is BoardPosition {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<BoardPosition>;
  return typeof entry.unit === "string"
    && Number.isInteger(entry.row)
    && Number.isInteger(entry.col)
    && Number(entry.row) >= 0
    && Number(entry.row) <= 3
    && Number(entry.col) >= 0
    && Number(entry.col) <= 6;
}

export default function BuilderPage() {
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compName, setCompName] = useState("我的阵容");
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState<number | null>(null);
  const [board, setBoard] = useState<BoardPosition[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BUILDER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ImportPayload;
      if (saved.name) setCompName(saved.name);
      if (Array.isArray(saved.championIds)) setSelectedIds(saved.championIds.slice(0, 10));
      if (Array.isArray(saved.board)) setBoard(saved.board.filter(isBoardPosition));
    } catch {
      // Ignore malformed local state.
    }
  }, []);

  const champions = catalog?.champions ?? [];
  const selected = selectedIds
    .map((id) => champions.find((champion) => champion.id === id))
    .filter((entry): entry is CatalogEntry => Boolean(entry));

  const championLookup = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => {
      map.set(normalize(champion.id), champion);
      map.set(normalize(champion.nameEn), champion);
      map.set(normalize(champion.nameZh), champion);
    });
    return map;
  }, [champions]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return champions.filter((champion) => {
      if (cost && champion.tier !== cost) return false;
      if (!q) return true;
      return normalize(`${champion.nameZh} ${champion.nameEn} ${champion.id}`).includes(q);
    });
  }, [champions, cost, query]);

  const grouped = useMemo(() => {
    return [1, 2, 3, 4, 5].map((tier) => ({
      tier,
      units: filtered.filter((unit) => unit.tier === tier),
    }));
  }, [filtered]);

  const recommendations = useMemo(() => {
    const selectedNames = new Set(selected.map((unit) => normalize(unit.nameEn)));
    return metaComps
      .map((comp) => {
        const pool = [...comp.coreUnits, ...comp.flexUnits].map(normalize);
        const overlap = pool.filter((name) => selectedNames.has(name)).length;
        const coreOverlap = comp.coreUnits.map(normalize).filter((name) => selectedNames.has(name)).length;
        return { comp, overlap, coreOverlap, score: coreOverlap * 3 + overlap };
      })
      .filter((entry) => entry.overlap > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [selected]);

  function persist(next: string[], name = compName, nextBoard = board) {
    setSelectedIds(next);
    setBoard(nextBoard);
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({
        name,
        championIds: next,
        board: nextBoard,
        updatedAt: Date.now(),
      }));
    } catch {
      // Keep UI state even if localStorage is unavailable.
    }
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      const unit = champions.find((champion) => champion.id === id);
      const nextBoard = unit ? board.filter((position) => normalize(position.unit) !== normalize(unit.nameEn)) : board;
      persist(selectedIds.filter((item) => item !== id), compName, nextBoard);
      return;
    }
    if (selectedIds.length >= 10) return;
    persist([...selectedIds, id]);
  }

  function loadMetaComp(comp: UnifiedMetaComp) {
    const ids = [...comp.coreUnits, ...comp.flexUnits]
      .map((name) => championLookup.get(normalize(name))?.id)
      .filter((id): id is string => Boolean(id))
      .filter((id, index, array) => array.indexOf(id) === index)
      .slice(0, 10);
    setCompName(comp.nameZh);
    persist(ids, comp.nameZh, comp.board);
  }

  async function copyHumanList() {
    const text = `${compName}: ${selected.map((unit) => `${unit.nameZh} (${unit.nameEn})`).join(" / ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("名单已复制");
      window.setTimeout(() => setCopyStatus(""), 1300);
    } catch {
      setCopyStatus("复制失败");
    }
  }

  async function copyShareCode() {
    const code = encodeShare({
      name: compName,
      championIds: selectedIds,
      champions: selected.map((unit) => unit.nameEn),
      board,
    });
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("阵容码已复制");
      window.setTimeout(() => setCopyStatus(""), 1300);
    } catch {
      setCopyStatus("复制失败");
    }
  }

  function rename(value: string) {
    setCompName(value);
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({ name: value, championIds: selectedIds, board, updatedAt: Date.now() }));
    } catch {
      // no-op
    }
  }

  function parseImport(value: string): ImportPayload {
    const trimmed = value.trim();
    if (!trimmed) throw new Error("请先粘贴阵容码、JSON 或英雄名单。 ");
    if (trimmed.startsWith(SHARE_PREFIX)) return decodeShare(trimmed);
    if (trimmed.startsWith("{")) return JSON.parse(trimmed) as ImportPayload;
    return {
      champions: trimmed
        .split(/[\n,，;；|/]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  function applyImport() {
    if (!champions.length) {
      setImportError("英雄数据仍在加载，请稍后再导入。 ");
      return;
    }
    try {
      const payload = parseImport(importText);
      const ids: string[] = [];

      for (const id of payload.championIds ?? []) {
        const champion = championLookup.get(normalize(id));
        if (champion && !ids.includes(champion.id)) ids.push(champion.id);
      }
      for (const name of payload.champions ?? []) {
        const cleaned = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
        const direct = championLookup.get(normalize(cleaned));
        const parenthetical = name.match(/\(([^)]+)\)/)?.[1];
        const champion = direct ?? (parenthetical ? championLookup.get(normalize(parenthetical)) : undefined);
        if (champion && !ids.includes(champion.id)) ids.push(champion.id);
      }

      const finalIds = ids.slice(0, 10);
      if (!finalIds.length) throw new Error("没有识别到当前 Set 18 英雄，请检查名称。 ");

      const selectedNames = new Set(finalIds
        .map((id) => champions.find((champion) => champion.id === id)?.nameEn)
        .filter((name): name is string => Boolean(name))
        .map(normalize));
      const nextBoard = (payload.board ?? [])
        .filter(isBoardPosition)
        .filter((position) => selectedNames.has(normalize(position.unit)));
      const name = payload.name?.trim() || `导入阵容 ${finalIds.length} 人`;

      setCompName(name);
      persist(finalIds, name, nextBoard);
      setImportError("");
      setImportOpen(false);
      setImportText("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "无法识别这个阵容。 ");
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Team Builder</h1>
          <p>手动组阵、导入阵容、复制分享码，并根据已选英雄匹配当前 Meta 阵容与参考站位。</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => setImportOpen((value) => !value)}>导入阵容</button>
          <button className={styles.button} onClick={() => persist([], compName, [])}>Clear</button>
          <button className={styles.button} onClick={copyHumanList}>复制名单</button>
          <button className={`${styles.button} ${styles.primary}`} onClick={copyShareCode}>复制阵容码</button>
        </div>
      </header>

      {copyStatus && <div className={styles.toast}>{copyStatus}</div>}

      {importOpen && (
        <section className={styles.importPanel}>
          <div className={styles.importHead}>
            <div>
              <strong>Import Team Comp</strong>
              <span>支持 TFTC1 分享码、JSON，或直接粘贴中/英文英雄名单。</span>
            </div>
            <button className={styles.button} onClick={() => setImportOpen(false)}>关闭</button>
          </div>
          <textarea
            value={importText}
            onChange={(event) => { setImportText(event.target.value); setImportError(""); }}
            placeholder={'例如：Nidalee, Sivir, Kog\'Maw, Amumu\n或粘贴 TFTC1: 开头的阵容码'}
          />
          <div className={styles.importFoot}>
            <span className={styles.importError}>{importError}</span>
            <button className={`${styles.button} ${styles.primary}`} onClick={applyImport}>导入到 Builder</button>
          </div>
        </section>
      )}

      <section className={styles.board}>
        <div className={styles.boardHead}>
          <input
            value={compName}
            onChange={(event) => rename(event.target.value)}
            className={styles.nameInput}
            aria-label="阵容名称"
          />
          <span>{selectedIds.length}/10 champions</span>
        </div>
        <div className={styles.slots}>
          {Array.from({ length: 10 }).map((_, index) => {
            const champion = selected[index];
            return champion ? (
              <button className={`${styles.slot} ${styles.filled}`} key={champion.id} onClick={() => toggle(champion.id)} title="点击移除">
                <UnitIcon entry={champion} size={44} />
                <span>{champion.nameZh}</span>
              </button>
            ) : <div className={styles.slot} key={`empty-${index}`} />;
          })}
        </div>
        {board.length > 0 && (
          <div className={styles.currentPositioning}>
            <div className={styles.positionTitle}>
              <strong>当前阵容参考站位</strong>
              <span>来自阵容推荐或导入数据；实际对局按对手左右镜像。</span>
            </div>
            <BoardPreview positions={board} champions={champions} />
          </div>
        )}
      </section>

      <section className={styles.recommend}>
        <div className={styles.recommendHead}>
          <strong>Champion-Based Deck Recommendations</strong>
          <span>基于你手动选择的英雄，不读取当前对局</span>
        </div>
        {recommendations.length ? (
          <div className={styles.recGrid}>
            {recommendations.map(({ comp, overlap, coreOverlap }) => (
              <div className={styles.recCard} key={`${comp.sourceId}-${comp.id}`}>
                <div className={styles.recMeta}>
                  <div>
                    <strong>{comp.nameZh}</strong>
                    <span>{comp.name}</span>
                    <span>{comp.source} · {comp.playstyle} · {comp.tier}</span>
                    <span className={styles.recScore}>匹配 {overlap} 个英雄 · 核心命中 {coreOverlap}</span>
                  </div>
                  <button className={`${styles.button} ${styles.primary}`} onClick={() => loadMetaComp(comp)}>载入</button>
                </div>
                <BoardPreview positions={comp.board} champions={champions} compact />
                <p className={styles.positionNote}>{comp.positioningNote}</p>
              </div>
            ))}
          </div>
        ) : <div className={styles.empty}>选择几个英雄后，这里会按重合度推荐当前收录阵容，并直接显示参考站位。</div>}
      </section>

      <section className={styles.toolbar}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search champions / 搜英雄" />
        <div className={styles.chips}>
          <button className={`${styles.chip} ${cost === null ? styles.active : ""}`} onClick={() => setCost(null)}>All</button>
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} className={`${styles.chip} ${cost === value ? styles.active : ""}`} onClick={() => setCost(value)}>{value} Cost</button>
          ))}
        </div>
      </section>

      <section className={styles.pool}>
        {grouped.map((group) => group.units.length ? (
          <div className={styles.costGroup} key={group.tier}>
            <div className={styles.costTitle}><span>{group.tier} Cost</span><span className={styles.costLine} /></div>
            <div className={styles.units}>
              {group.units.map((champion) => {
                const active = selectedIds.includes(champion.id);
                return (
                  <button key={champion.id} className={`${styles.unit} ${active ? styles.selected : ""}`} onClick={() => toggle(champion.id)}>
                    <UnitIcon entry={champion} size={46} />
                    <span>{champion.nameZh}</span>
                    <small>{champion.nameEn}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null)}
      </section>
    </div>
  );
}
