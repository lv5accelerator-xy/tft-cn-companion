"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import { useLocale } from "../components/LocaleProvider";
import { detailForEntry, loadChampionDetails, type ChampionDetailIndex } from "@/lib/champion-details-client";
import type { TftCatalogPayload } from "@/data/tft";
import styles from "./champion-explorer.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’']/g, "").replace(/\s+/g, " ");
}

function stat(value: number | undefined) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return String(Math.round(value * 100) / 100);
}

export default function ChampionExplorer() {
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [details, setDetails] = useState<ChampionDetailIndex | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState<number | null>(null);
  const [trait, setTrait] = useState("all");

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDetailsLoading(true);
    loadChampionDetails(locale)
      .then((index) => {
        if (!cancelled) setDetails(index);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const traitOptions = useMemo(() => {
    if (!catalog || !details) return [];
    const names = new Set<string>();
    for (const champion of catalog.champions) {
      const detail = detailForEntry(details, champion);
      for (const name of detail?.traits ?? []) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, locale === "zh" ? "zh-CN" : "en-US"));
  }, [catalog, details, locale]);

  const champions = useMemo(() => {
    if (!catalog) return [];
    const q = normalize(query);
    return catalog.champions.filter((champion) => {
      if (cost && champion.tier !== cost) return false;
      const detail = detailForEntry(details, champion);
      if (trait !== "all" && !(detail?.traits ?? []).includes(trait)) return false;
      if (!q) return true;
      const text = normalize([
        champion.nameZh,
        champion.nameEn,
        detail?.abilityName ?? "",
        detail?.abilityDesc ?? "",
        ...(detail?.traits ?? []),
      ].join(" "));
      return text.includes(q);
    }).sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || a.nameEn.localeCompare(b.nameEn));
  }, [catalog, cost, details, query, trait]);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>SET 18 · CHAMPION INFO</span>
          <h1>{tr("英雄资料库", "Champion Library")}</h1>
          <p>{tr("查看费用、羁绊、技能和基础属性；鼠标悬停任意英雄头像可展开完整详情。", "Browse cost, traits, abilities and base stats. Hover any champion portrait for the full detail card.")}</p>
        </div>
        <div className={styles.summary}>
          <strong>{champions.length || "—"}</strong>
          <span>{tr("当前结果", "results")}</span>
        </div>
      </header>

      <section className={styles.toolbar}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("搜索英雄 / 羁绊 / 技能", "Search champion / trait / ability")} />
        <div className={styles.costs}>
          <button className={cost === null ? styles.active : ""} onClick={() => setCost(null)}>{tr("全部", "All")}</button>
          {[1, 2, 3, 4, 5].map((value) => <button key={value} className={cost === value ? styles.active : ""} onClick={() => setCost(value)}>{value} {tr("费", "Cost")}</button>)}
        </div>
        <select value={trait} onChange={(event) => setTrait(event.target.value)}>
          <option value="all">{tr("全部羁绊", "All traits")}</option>
          {traitOptions.map((name) => <option value={name} key={name}>{name}</option>)}
        </select>
      </section>

      <div className={styles.hint}>
        <span className={styles.dot} />
        {detailsLoading ? tr("正在载入 CommunityDragon 当前版本英雄详情…", "Loading current-patch champion details from CommunityDragon…") : tr("悬停英雄头像：显示技能全文、羁绊、生命、法力、攻击力、攻速、护甲、魔抗、射程与暴击。", "Hover a champion portrait for full ability text, traits, health, mana, AD, AS, armor, MR, range and crit.")}
      </div>

      <section className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>#</th><th>{tr("英雄", "Champion")}</th><th>{tr("费用", "Cost")}</th><th>{tr("羁绊", "Traits")}</th><th>{tr("技能", "Ability")}</th><th>{tr("基础属性", "Base stats")}</th></tr></thead>
          <tbody>
            {champions.map((champion, index) => {
              const detail = detailForEntry(details, champion);
              const mana = detail?.stats?.mana !== undefined ? `${stat(detail.stats.initialMana ?? 0)}/${stat(detail.stats.mana)}` : "—";
              return (
                <tr key={champion.id}>
                  <td className={styles.rank}>{index + 1}</td>
                  <td><div className={styles.champion}><UnitIcon entry={champion} size={44} /><div><strong>{nameOf(champion)}</strong><span>{secondaryNameOf(champion)}</span></div></div></td>
                  <td><span className={`${styles.costBadge} ${styles[`cost${champion.tier ?? 1}`]}`}>{champion.tier ?? "—"}</span></td>
                  <td><div className={styles.traits}>{(detail?.traits ?? []).map((name) => <span key={name}>{name}</span>)}{!detailsLoading && !detail ? <em>—</em> : null}</div></td>
                  <td><div className={styles.ability}><strong>{detail?.abilityName || (detailsLoading ? tr("载入中…", "Loading…") : "—")}</strong>{detail?.abilityDesc ? <span>{detail.abilityDesc}</span> : null}</div></td>
                  <td><div className={styles.stats}><span><b>HP</b> {stat(detail?.stats?.hp)}</span><span><b>AD</b> {stat(detail?.stats?.damage)}</span><span><b>AS</b> {stat(detail?.stats?.attackSpeed)}</span><span><b>Mana</b> {mana}</span><span><b>AR</b> {stat(detail?.stats?.armor)}</span><span><b>MR</b> {stat(detail?.stats?.magicResist)}</span></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!champions.length && <div className={styles.empty}>{tr("没有符合当前筛选条件的英雄。", "No champions match the current filters.")}</div>}
      </section>
    </div>
  );
}
