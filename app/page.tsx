"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UnitIcon from "./components/UnitIcon";
import { metaComps } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./dashboard.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

export default function HomePage() {
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const champions = catalog?.champions ?? [];
  const championByName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => map.set(normalize(champion.nameEn), champion));
    return map;
  }, [champions]);

  const topChampions = useMemo(() => {
    return [...champions]
      .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0) || a.nameEn.localeCompare(b.nameEn))
      .slice(0, 6);
  }, [champions]);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>TFT Meta Trends</h1>
          <p>Set 18 · Enchanted Wilds · 美服中文辅助视图</p>
        </div>
        <div className={styles.filters}>
          <span className={styles.filter}>Season 18</span>
          <span className={styles.filter}>NA</span>
          <span className={styles.filter}>All Tiers</span>
          <span className={styles.filter}>Patch 18.1</span>
        </div>
      </header>

      <section className={styles.kpis}>
        <div className={styles.kpi}><span>精选阵容</span><strong>{metaComps.length}</strong></div>
        <div className={styles.kpi}><span>Set 18 英雄</span><strong>{catalog?.champions.length ?? "—"}</strong></div>
        <div className={styles.kpi}><span>标准装备</span><strong>{catalog?.items.length ?? "—"}</strong></div>
        <div className={styles.kpi}><span>强化符文</span><strong>{catalog?.augments.length ?? "—"}</strong></div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Meta Comps</h2>
            <Link href="/comps">查看全部</Link>
          </div>
          <div className={styles.compList}>
            {metaComps.slice(0, 6).map((comp) => (
              <Link href="/comps" className={styles.compRow} key={comp.id}>
                <span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span>
                <div className={styles.compName}>
                  <strong>{comp.nameZh}</strong>
                  <span>{comp.name}</span>
                </div>
                <div className={styles.units}>
                  {[...comp.coreUnits, ...comp.flexUnits.slice(0, 4)].slice(0, 8).map((name) => {
                    const unit = championByName.get(normalize(name));
                    return unit ? (
                      <span key={name} className={styles.unitWrap} title={`${unit.nameZh} / ${unit.nameEn}`}>
                        <UnitIcon entry={unit} size={32} />
                        {unit.tier ? <span className={styles.costTag}>{unit.tier}</span> : null}
                      </span>
                    ) : null;
                  })}
                </div>
                <span className={styles.playstyle}>{comp.playstyle}</span>
              </Link>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Quick Access</h2>
            </div>
            <div className={styles.moduleGrid}>
              <Link className={styles.moduleCard} href="/champions"><b>Champion</b><span>按费用快速查看当前 Set 18 英雄。</span></Link>
              <Link className={styles.moduleCard} href="/items"><b>Item</b><span>基础散件、成装与中英名称。</span></Link>
              <Link className={styles.moduleCard} href="/traits"><b>Synergy</b><span>查看当前羁绊的中英文名称。</span></Link>
              <Link className={styles.moduleCard} href="/augments"><b>Augments</b><span>强化符文中英快速查询。</span></Link>
              <Link className={styles.moduleCard} href="/builder"><b>Team Builder</b><span>像客户端一样快速组阵并保存。</span></Link>
              <Link className={styles.moduleCard} href="/search"><b>Integrated Search</b><span>统一搜索本地 TFT 数据。</span></Link>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>High Cost Champions</h2>
              <Link href="/champions">Champion List</Link>
            </div>
            <div className={styles.champList}>
              {topChampions.map((champion, index) => (
                <div className={styles.champRow} key={champion.id}>
                  <span className={styles.rank}>{index + 1}</span>
                  <UnitIcon entry={champion} size={34} />
                  <div className={styles.champName}>
                    <strong>{champion.nameZh}</strong>
                    <span>{champion.nameEn}</span>
                  </div>
                  <span className={styles.cost}>{champion.tier ?? "—"} Cost</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
