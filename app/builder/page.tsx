"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import { metaComps } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./builder.module.css";

const BUILDER_KEY = "tft-cn-companion-builder-v2";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

export default function BuilderPage() {
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compName, setCompName] = useState("我的阵容");
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState<number | null>(null);

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
      const saved = JSON.parse(raw) as { name?: string; championIds?: string[] };
      if (saved.name) setCompName(saved.name);
      if (Array.isArray(saved.championIds)) setSelectedIds(saved.championIds.slice(0, 10));
    } catch {
      // Ignore malformed local state.
    }
  }, []);

  const champions = catalog?.champions ?? [];
  const selected = selectedIds
    .map((id) => champions.find((champion) => champion.id === id))
    .filter((entry): entry is CatalogEntry => Boolean(entry));

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

  function persist(next: string[], name = compName) {
    setSelectedIds(next);
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({
        name,
        championIds: next,
        updatedAt: Date.now(),
      }));
    } catch {
      // Keep UI state even if localStorage is unavailable.
    }
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      persist(selectedIds.filter((item) => item !== id));
      return;
    }
    if (selectedIds.length >= 10) return;
    persist([...selectedIds, id]);
  }

  async function copyText() {
    const text = `${compName}: ${selected.map((unit) => `${unit.nameZh} (${unit.nameEn})`).join(" / ")}`;
    try { await navigator.clipboard.writeText(text); } catch { /* no-op */ }
  }

  function rename(value: string) {
    setCompName(value);
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({ name: value, championIds: selectedIds, updatedAt: Date.now() }));
    } catch {
      // no-op
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Team Builder</h1>
          <p>手动组阵、保存、从阵容榜一键复制，并根据已选英雄给出静态阵容匹配。</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => persist([])}>Clear</button>
          <button className={`${styles.button} ${styles.primary}`} onClick={copyText}>Copy Team</button>
        </div>
      </header>

      <section className={styles.board}>
        <div className={styles.boardHead}>
          <input
            value={compName}
            onChange={(event) => rename(event.target.value)}
            style={{ background: "transparent", border: 0, color: "#e4e5ea", outline: "none", fontSize: 11, fontWeight: 700 }}
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
      </section>

      <section className={styles.recommend}>
        <div className={styles.recommendHead}>
          <strong>Champion-Based Deck Recommendations</strong>
          <span>基于你手动选择的英雄，不读取当前对局</span>
        </div>
        {recommendations.length ? (
          <div className={styles.recGrid}>
            {recommendations.map(({ comp, overlap, coreOverlap }) => (
              <div className={styles.recCard} key={comp.id}>
                <strong>{comp.nameZh}</strong>
                <span>{comp.name}</span>
                <span>{comp.playstyle} · {comp.tier}</span>
                <span className={styles.recScore}>匹配 {overlap} 个英雄 · 核心命中 {coreOverlap}</span>
              </div>
            ))}
          </div>
        ) : <div className={styles.empty}>选择几个英雄后，这里会按重合度推荐我们当前收录的阵容。</div>}
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
