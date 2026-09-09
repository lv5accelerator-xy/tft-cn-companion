"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UnitIcon from "./components/UnitIcon";
import { useLocale } from "./components/LocaleProvider";
import { metaComps } from "@/data/meta";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./dashboard.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

export default function HomePage() {
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
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

  const topChampions = useMemo(() => [...champions]
    .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0) || a.nameEn.localeCompare(b.nameEn))
    .slice(0, 6), [champions]);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>TFT Meta Trends</h1>
          <p>{tr("Set 18 · Enchanted Wilds · 美服中文辅助视图", "Set 18 · Enchanted Wilds · NA companion view")}</p>
        </div>
        <div className={styles.filters}>
          <span className={styles.filter}>Season 18</span><span className={styles.filter}>NA</span><span className={styles.filter}>{tr("全部段位", "All Tiers")}</span><span className={styles.filter}>Patch 18.1</span>
        </div>
      </header>

      <section className={styles.kpis}>
        <div className={styles.kpi}><span>{tr("精选阵容", "Curated Comps")}</span><strong>{metaComps.length}</strong></div>
        <div className={styles.kpi}><span>{tr("Set 18 英雄", "Set 18 Champions")}</span><strong>{catalog?.champions.length ?? "—"}</strong></div>
        <div className={styles.kpi}><span>{tr("标准装备", "Items")}</span><strong>{catalog?.items.length ?? "—"}</strong></div>
        <div className={styles.kpi}><span>{tr("强化符文", "Augments")}</span><strong>{catalog?.augments.length ?? "—"}</strong></div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>Meta Comps</h2><Link href="/comps">{tr("查看全部", "View all")}</Link></div>
          <div className={styles.compList}>
            {metaComps.slice(0, 6).map((comp) => (
              <Link href="/comps" className={styles.compRow} key={`${comp.sourceId}-${comp.id}`}>
                <span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span>
                <div className={styles.compName}><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><span>{locale === "zh" ? comp.name : comp.nameZh} · {comp.source}</span></div>
                <div className={styles.units}>{[...comp.coreUnits, ...comp.flexUnits.slice(0, 4)].slice(0, 8).map((name) => { const unit = championByName.get(normalize(name)); return unit ? <span key={name} className={styles.unitWrap} title={`${unit.nameZh} / ${unit.nameEn}`}><UnitIcon entry={unit} size={32} />{unit.tier ? <span className={styles.costTag}>{unit.tier}</span> : null}</span> : null; })}</div>
                <span className={styles.playstyle}>{comp.playstyle}</span>
              </Link>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section className={styles.panel}>
            <div className={styles.panelHead}><h2>{tr("快捷入口", "Quick Access")}</h2></div>
            <div className={styles.moduleGrid}>
              <Link className={styles.moduleCard} href="/champions"><b>{tr("英雄", "Champion")}</b><span>{tr("按费用快速查看当前 Set 18 英雄。", "Browse Set 18 champions by cost.")}</span></Link>
              <Link className={styles.moduleCard} href="/items"><b>{tr("装备", "Item")}</b><span>{tr("散件、成装、神器和转职合成。", "Components, completed items, artifacts and emblem recipes.")}</span></Link>
              <Link className={styles.moduleCard} href="/traits"><b>{tr("羁绊", "Synergy")}</b><span>{tr("查看当前羁绊中英文资料。", "Browse current trait names in both languages.")}</span></Link>
              <Link className={styles.moduleCard} href="/augments"><b>{tr("强化", "Augments")}</b><span>{tr("强化符文中英快速查询。", "Search augments in Chinese or English.")}</span></Link>
              <Link className={styles.moduleCard} href="/builder"><b>Team Builder</b><span>{tr("编辑站位、装备和羁绊并生成分享码。", "Edit positioning, items and traits, then share the build.")}</span></Link>
              <Link className={styles.moduleCard} href="/account"><b>{tr("云同步", "Cloud Sync")}</b><span>{tr("跨设备同步 Builder 和导入阵容。", "Sync Builder and imported comps across devices.")}</span></Link>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}><h2>{tr("高费英雄", "High Cost Champions")}</h2><Link href="/champions">{tr("英雄列表", "Champion List")}</Link></div>
            <div className={styles.champList}>{topChampions.map((champion, index) => <div className={styles.champRow} key={champion.id}><span className={styles.rank}>{index + 1}</span><UnitIcon entry={champion} size={34} /><div className={styles.champName}><strong>{nameOf(champion)}</strong><span>{secondaryNameOf(champion)}</span></div><span className={styles.cost}>{champion.tier ?? "—"} Cost</span></div>)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
