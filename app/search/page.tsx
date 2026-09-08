"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import { metaComps } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./search.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

export default function SearchPage() {
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(q);
    setActiveQuery(q);
  }, []);

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const results = useMemo(() => {
    const q = normalize(activeQuery);
    const empty = { champions: [] as CatalogEntry[], items: [] as CatalogEntry[], traits: [] as CatalogEntry[], augments: [] as CatalogEntry[] };
    if (!catalog || !q) return empty;

    const filter = (entries: CatalogEntry[]) => entries.filter((entry) =>
      normalize([entry.nameZh, entry.nameEn, ...(entry.aliases ?? []), entry.id].join(" ")).includes(q),
    ).slice(0, 12);

    return {
      champions: filter(catalog.champions),
      items: filter(catalog.items),
      traits: filter(catalog.traits),
      augments: filter(catalog.augments),
    };
  }, [activeQuery, catalog]);

  const compResults = useMemo(() => {
    const q = normalize(activeQuery);
    if (!q) return [];
    return metaComps.filter((comp) => normalize([
      comp.name,
      comp.nameZh,
      ...comp.coreUnits,
      ...comp.flexUnits,
      ...comp.traits,
      ...comp.itemFocus,
    ].join(" ")).includes(q)).slice(0, 8);
  }, [activeQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    setActiveQuery(value);
    window.history.replaceState(null, "", value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  const sections: Array<[string, CatalogEntry[]]> = [
    ["Champions", results.champions],
    ["Items", results.items],
    ["Synergies", results.traits],
    ["Augments", results.augments],
  ];

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1>Integrated Search</h1>
        <p>统一查找英雄、装备、羁绊、强化和当前收录阵容。</p>
      </header>

      <form className={styles.searchBox} onSubmit={submit}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nidalee / 奈德丽 / Primal / Morellonomicon…" />
        <button type="submit">Search</button>
      </form>

      {!activeQuery ? (
        <div className={styles.empty}>输入关键词开始搜索。</div>
      ) : (
        <>
          {compResults.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHead}><strong>Comps</strong><span>{compResults.length} results</span></div>
              <div className={styles.grid}>
                {compResults.map((comp) => (
                  <div className={styles.compCard} key={comp.id}>
                    <strong>{comp.nameZh}</strong>
                    <span>{comp.name}</span>
                    <span>{comp.playstyle} · {comp.tier}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {sections.map(([title, entries]) => entries.length > 0 ? (
            <section className={styles.section} key={title}>
              <div className={styles.sectionHead}><strong>{title}</strong><span>{entries.length} results</span></div>
              <div className={styles.grid}>
                {entries.map((entry) => (
                  <div className={styles.card} key={entry.id}>
                    <UnitIcon entry={entry} size={34} />
                    <div>
                      <strong>{entry.nameZh}</strong>
                      <span>{entry.nameEn}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null)}

          {compResults.length === 0 && sections.every(([, entries]) => entries.length === 0) && (
            <div className={styles.empty}>没有找到与 “{activeQuery}” 匹配的资料。</div>
          )}
        </>
      )}
    </div>
  );
}
