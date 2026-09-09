"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import { useLocale } from "../components/LocaleProvider";
import { metaComps } from "@/data/meta";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./search.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

export default function SearchPage() {
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(q); setActiveQuery(q);
  }, []);
  useEffect(() => { fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()).then(setCatalog).catch(() => setCatalog(null)); }, []);

  const results = useMemo(() => {
    const q = normalize(activeQuery);
    const empty = { champions: [] as CatalogEntry[], items: [] as CatalogEntry[], traits: [] as CatalogEntry[], augments: [] as CatalogEntry[] };
    if (!catalog || !q) return empty;
    const filter = (entries: CatalogEntry[]) => entries.filter((entry) => normalize([entry.nameZh, entry.nameEn, ...(entry.aliases ?? []), entry.id].join(" ")).includes(q)).slice(0, 12);
    return { champions: filter(catalog.champions), items: filter(catalog.items), traits: filter(catalog.traits), augments: filter(catalog.augments) };
  }, [activeQuery, catalog]);

  const compResults = useMemo(() => {
    const q = normalize(activeQuery);
    if (!q) return [];
    return metaComps.filter((comp) => normalize([comp.name, comp.nameZh, comp.source, comp.sourceArticleTitle, ...comp.coreUnits, ...comp.flexUnits, ...comp.traits, ...comp.itemFocus].join(" ")).includes(q)).slice(0, 8);
  }, [activeQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim(); setActiveQuery(value);
    window.history.replaceState(null, "", value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  const sections: Array<[string, CatalogEntry[]]> = [
    [tr("英雄", "Champions"), results.champions], [tr("装备", "Items"), results.items], [tr("羁绊", "Synergies"), results.traits], [tr("强化", "Augments"), results.augments],
  ];

  return (
    <div className={styles.page}>
      <header className={styles.heading}><h1>{tr("综合搜索", "Integrated Search")}</h1><p>{tr("统一查找英雄、装备、羁绊、强化和多来源 TFT 阵容。", "Search champions, items, traits, augments and multi-source TFT comps in one place.")}</p></header>
      <form className={styles.searchBox} onSubmit={submit}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nidalee / 奈德丽 / Primal / 兔顶之弈…" /><button type="submit">{tr("搜索", "Search")}</button></form>
      {!activeQuery ? <div className={styles.empty}>{tr("输入关键词开始搜索。", "Enter a keyword to search.")}</div> : <>
        {compResults.length > 0 && <section className={styles.section}><div className={styles.sectionHead}><strong>{tr("阵容", "Comps")}</strong><span>{compResults.length} {tr("条结果", "results")}</span></div><div className={styles.grid}>{compResults.map((comp) => <div className={styles.compCard} key={`${comp.sourceId}-${comp.id}`}><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><span>{locale === "zh" ? comp.name : comp.nameZh}</span><span>{comp.source} · {comp.playstyle} · {comp.tier}</span></div>)}</div></section>}
        {sections.map(([title, entries]) => entries.length > 0 ? <section className={styles.section} key={title}><div className={styles.sectionHead}><strong>{title}</strong><span>{entries.length} {tr("条结果", "results")}</span></div><div className={styles.grid}>{entries.map((entry) => <div className={styles.card} key={entry.id}><UnitIcon entry={entry} size={34} /><div><strong>{nameOf(entry)}</strong><span>{secondaryNameOf(entry)}</span></div></div>)}</div></section> : null)}
        {compResults.length === 0 && sections.every(([, entries]) => entries.length === 0) && <div className={styles.empty}>{tr(`没有找到与 “${activeQuery}” 匹配的资料。`, `No results found for “${activeQuery}”.`)}</div>}
      </>}
    </div>
  );
}
