"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { metaComps, metaPatch, metaUpdatedAt, type MetaComp } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./comps.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function UnitChip({ name, champions }: { name: string; champions: CatalogEntry[] }) {
  const unit = champions.find((entry) => normalize(entry.nameEn) === normalize(name));

  if (!unit) {
    return <span className={styles.unitFallback}>{name}</span>;
  }

  return (
    <span className={styles.unitChip} title={`${unit.nameZh} / ${unit.nameEn}`}>
      {unit.imageUrl ? (
        <Image src={unit.imageUrl} alt={unit.nameEn} width={30} height={30} unoptimized />
      ) : (
        <span className={styles.unitLetter}>{unit.nameZh.slice(0, 1)}</span>
      )}
      <span>
        <strong>{unit.nameZh}</strong>
        <small>{unit.nameEn}</small>
      </span>
    </span>
  );
}

function CompCard({ comp, champions }: { comp: MetaComp; champions: CatalogEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.badgeRow}>
            <span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier}</span>
            <span className={styles.patch}>Patch {comp.patch}</span>
            <span className={styles.difficulty}>{comp.difficulty}</span>
          </div>
          <h2>{comp.nameZh}</h2>
          <p className={styles.english}>{comp.name}</p>
        </div>
        <span className={styles.playstyle}>{comp.playstyle}</span>
      </div>

      <p className={styles.when}><strong>什么时候玩：</strong>{comp.whenToPlay}</p>

      <section className={styles.section}>
        <h3>核心棋子</h3>
        <div className={styles.units}>
          {comp.coreUnits.map((name) => <UnitChip key={name} name={name} champions={champions} />)}
        </div>
      </section>

      <section className={styles.section}>
        <h3>装备优先</h3>
        <div className={styles.pills}>
          {comp.itemFocus.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <ul className={styles.notes}>
        {comp.keyNotes.slice(0, expanded ? comp.keyNotes.length : 2).map((note) => <li key={note}>{note}</li>)}
      </ul>

      {expanded && (
        <div className={styles.details}>
          <section className={styles.section}>
            <h3>可替换 / 补充棋子</h3>
            <div className={styles.units}>
              {comp.flexUnits.map((name) => <UnitChip key={name} name={name} champions={champions} />)}
            </div>
          </section>

          <section className={styles.section}>
            <h3>关键羁绊</h3>
            <div className={styles.pills}>
              {comp.traits.map((trait) => <span key={trait}>{trait}</span>)}
            </div>
          </section>

          <section className={styles.stageGrid}>
            {comp.stages.map((stage) => (
              <div className={styles.stage} key={stage.stage}>
                <strong>{stage.stage}</strong>
                <p>{stage.text}</p>
              </div>
            ))}
          </section>
        </div>
      )}

      <div className={styles.actions}>
        <button onClick={() => setExpanded((value) => !value)}>
          {expanded ? "收起" : "查看运营"}
        </button>
        <a href={comp.sourceUrl} target="_blank" rel="noreferrer">来源：{comp.source}</a>
      </div>
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

  const champions = catalog?.champions ?? [];

  return (
    <main className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}>SET 18 · NA META QUICK VIEW</span>
          <h1>当前版本阵容库</h1>
          <p>Patch {metaPatch} · 更新 {metaUpdatedAt} · 快速判断“这局能不能玩”和 Stage 2–4 怎么运营。</p>
        </div>
        <div className={styles.metaStatus}>
          <strong>{metaComps.length}</strong>
          <span>精选玩法</span>
          <small>{catalog ? `${catalog.champions.length} 个英雄已匹配中文` : "正在载入英雄图标…"}</small>
        </div>
      </header>

      <div className={styles.notice}>
        当前 TFT Academy 的 18.1d 页面明确标注“本补丁没有 S Tier 阵容”。这里优先收录仍在更新的 A 级与活跃玩法；评级是第三方环境参考，不是 Riot 官方排名。
      </div>

      <section className={styles.controls}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜阵容 / 英雄 / 羁绊：Nidalee、易大师、Primal…"
        />
        <div className={styles.filters}>
          <button className={filter === "ALL" ? styles.active : ""} onClick={() => setFilter("ALL")}>全部</button>
          <button className={filter === "FAST8" ? styles.active : ""} onClick={() => setFilter("FAST8")}>Fast 8</button>
          <button className={filter === "REROLL" ? styles.active : ""} onClick={() => setFilter("REROLL")}>追三</button>
        </div>
      </section>

      <section className={styles.grid}>
        {filtered.map((comp) => <CompCard key={comp.id} comp={comp} champions={champions} />)}
      </section>

      {filtered.length === 0 && <div className={styles.empty}>没有匹配阵容，换一个英雄名或筛选条件。</div>}

      <footer className={styles.footer}>
        阵容层为人工筛选的当前补丁攻略摘要；英雄中英名称和图标仍由 Riot NA Data Dragon 实时匹配。补丁变化后需要重新审核阵容层，避免旧 Meta 自动冒充新 Meta。
      </footer>
    </main>
  );
}
