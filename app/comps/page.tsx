"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import BoardPreview from "../components/BoardPreview";
import { metaComps, metaPatch, metaUpdatedAt, type MetaComp } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./comps.module.css";

const BUILDER_KEY = "tft-cn-companion-builder-v2";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function CompRow({ comp, champions }: { comp: MetaComp; champions: CatalogEntry[] }) {
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
          <div className={styles.detailColumns}>
            <div>
              <strong>什么时候玩：</strong>{comp.whenToPlay}
              <div style={{ marginTop: 6 }}><strong>装备优先：</strong>{comp.itemFocus.join(" · ")}</div>
              <div style={{ marginTop: 6 }}><strong>要点：</strong>{comp.keyNotes.slice(0, 3).join("；")}</div>
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

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return metaComps.filter((comp) => {
      const styleMatch = filter === "ALL"
        || (filter === "FAST8" && comp.playstyle.includes("Fast 8"))
        || (filter === "REROLL" && comp.playstyle.includes("Reroll"));
      const searchText = normalize([
        comp.name,
        comp.nameZh,
        ...comp.coreUnits,
        ...comp.flexUnits,
        ...comp.traits,
        ...comp.itemFocus,
      ].join(" "));
      return styleMatch && (!q || searchText.includes(q));
    });
  }, [filter, query]);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Meta Team Comps</h1>
          <p>当前补丁精选阵容 · 点击阵容名称可展开运营与参考站位</p>
        </div>
        <div className={styles.meta}>
          <span>Patch {metaPatch}</span>
          <span>Updated {metaUpdatedAt}</span>
          <span>{filtered.length} Comps</span>
        </div>
      </header>

      <section className={styles.toolbar}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search comps, champions or synergies"
        />
        <div className={styles.filters}>
          <button className={filter === "ALL" ? styles.active : ""} onClick={() => setFilter("ALL")}>All</button>
          <button className={filter === "FAST8" ? styles.active : ""} onClick={() => setFilter("FAST8")}>Fast 8</button>
          <button className={filter === "REROLL" ? styles.active : ""} onClick={() => setFilter("REROLL")}>Reroll</button>
        </div>
        <span className={styles.note}>Avg. place / Top 4 / 1st 统计源待接入</span>
      </section>

      <section className={styles.list}>
        <div className={styles.headerRow}>
          <span>Tier</span>
          <span>Comp</span>
          <span>Core / Synergy Units</span>
          <span>Synergy</span>
          <span style={{ textAlign: "right" }}>Avg.</span>
          <span style={{ textAlign: "right" }}>Top 4</span>
          <span style={{ textAlign: "right" }}>1st</span>
          <span style={{ textAlign: "right" }}>Planner</span>
        </div>
        {filtered.map((comp) => <CompRow key={comp.id} comp={comp} champions={catalog?.champions ?? []} />)}
        {filtered.length === 0 && <div className={styles.empty}>没有符合当前筛选的阵容。</div>}
      </section>
    </div>
  );
}
