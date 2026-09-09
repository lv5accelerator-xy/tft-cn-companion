"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UnitIcon from "./components/UnitIcon";
import { useLocale } from "./components/LocaleProvider";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { FOCUS_KEY, LOCAL_IMPORT_KEY } from "@/lib/workspace";
import styles from "./dashboard.module.css";

type FocusResume = { sourceId: string; id: string };

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.sourceId === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.board);
}

export default function HomePage() {
  const { locale, tr } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [resume, setResume] = useState<FocusResume | null>(null);

  useEffect(() => {
    fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()).then(setCatalog).catch(() => setCatalog(null));
    try {
      const imported = JSON.parse(window.localStorage.getItem(LOCAL_IMPORT_KEY) || "[]") as unknown[];
      setLocalComps(imported.filter(isManualComp));
      const raw = window.localStorage.getItem(FOCUS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FocusResume>;
        if (typeof parsed.sourceId === "string" && typeof parsed.id === "string") setResume({ sourceId: parsed.sourceId, id: parsed.id });
      }
    } catch {
      setLocalComps([]);
    }
  }, []);

  const champions = catalog?.champions ?? [];
  const championByName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => {
      map.set(normalize(champion.nameEn), champion);
      map.set(normalize(champion.nameZh), champion);
    });
    return map;
  }, [champions]);

  const allComps = useMemo(() => [...localComps, ...metaComps], [localComps]);
  const continueComp = useMemo(() => resume ? allComps.find((comp) => comp.sourceId === resume.sourceId && comp.id === resume.id) ?? null : null, [allComps, resume]);
  const focusHref = (comp: UnifiedMetaComp) => `/focus?source=${encodeURIComponent(comp.sourceId)}&id=${encodeURIComponent(comp.id)}`;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div><div className={styles.eyebrow}>V1.2 · GAME FOCUS</div><h1>{tr("美服云顶中文副屏助手", "NA TFT companion for fast decisions")}</h1><p>{tr("阵容、站位、运营、装备与属性计算集中到一块副屏。对局中按 Ctrl + K，几秒内找到需要的信息。", "Keep comps, positioning, tempo, items and stat checks on one second screen. Press Ctrl + K for instant lookup.")}</p></div>
        <div className={styles.heroActions}><Link className={styles.primaryButton} href="/comps">{tr("选择本局阵容", "Choose a comp")}</Link><Link className={styles.secondaryButton} href="/builder">{tr("打开 Builder", "Open Builder")}</Link></div>
      </section>

      {continueComp && <section className={styles.continueCard}><div className={styles.continueIcon}>▶</div><div className={styles.continueText}><span>{tr("继续上次对局", "Continue last focus")}</span><strong>{locale === "zh" ? continueComp.nameZh : continueComp.name}</strong><small>{continueComp.source} · {continueComp.playstyle}</small></div><Link href={focusHref(continueComp)}>{tr("继续", "Continue")}</Link></section>}

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>{tr("本版本推荐", "Recommended Comps")}</h2><p>{tr("直接进入对局模式，不必来回翻资料页。", "Jump straight into Game Focus without page hopping.")}</p></div><Link href="/comps">{tr("全部阵容", "All comps")}</Link></div>
          <div className={styles.compList}>{metaComps.slice(0,6).map((comp) => {
            const units = [...comp.coreUnits, ...comp.flexUnits].slice(0,8).map((name) => championByName.get(normalize(name))).filter((entry): entry is CatalogEntry => Boolean(entry));
            return <Link href={focusHref(comp)} className={styles.compRow} key={`${comp.sourceId}-${comp.id}`}><span className={`${styles.tier} ${styles[`tier${comp.tier}`]}`}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span><div className={styles.compName}><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><span>{comp.source} · {comp.playstyle}</span></div><div className={styles.units}>{units.map((unit) => <span className={styles.unitWrap} key={unit.id}><UnitIcon entry={unit} size={36} />{unit.tier ? <span className={styles.costTag}>{unit.tier}</span> : null}</span>)}</div><span className={styles.focusCta}>{tr("进入对局", "Focus")}</span></Link>;
          })}</div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>{tr("快速工具", "Quick Tools")}</h2><p>{tr("高频功能优先，不再堆数据库数字。", "High-frequency actions first, not database counters.")}</p></div></div>
          <div className={styles.moduleGrid}>
            <Link className={styles.moduleCard} href="/comps"><b>◆ {tr("阵容库", "Comps")}</b><span>{tr("挑一套阵容后直接进入对局专注模式。", "Pick a comp and enter Game Focus.")}</span></Link>
            <Link className={styles.moduleCard} href="/stats"><b>Σ {tr("属性实验室", "Stat Lab")}</b><span>{tr("英雄三件套 A/B、技能伤害与生存对比。", "Compare loadouts, ability damage and survival.")}</span></Link>
            <Link className={styles.moduleCard} href="/items"><b>◈ {tr("装备与合成", "Items")}</b><span>{tr("查散件、成装、神器、转职和合成路径。", "Components, completed items, artifacts and recipes.")}</span></Link>
            <Link className={styles.moduleCard} href="/builder"><b>+ Builder Pro</b><span>{tr("站位、装备、角色标记与分享码。", "Positioning, items, roles and share codes.")}</span></Link>
            <Link className={styles.moduleCard} href="/import"><b>▧ {tr("一图流导入", "Image Import")}</b><span>{tr("把攻略图解析成可编辑阵容并保存。", "Turn an infographic into an editable saved comp.")}</span></Link>
            <Link className={styles.moduleCard} href="/champions"><b>♟ {tr("英雄资料", "Champions")}</b><span>{tr("中英名称、技能和当前赛季信息。", "Bilingual names, abilities and current-set info.")}</span></Link>
          </div>
          <div className={styles.shortcutTip}><kbd>Ctrl</kbd><span>+</span><kbd>K</kbd><strong>{tr("任何页面快速搜索", "Search from anywhere")}</strong></div>
        </section>
      </div>
    </div>
  );
}
