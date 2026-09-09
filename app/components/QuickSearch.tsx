"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UnitIcon from "./UnitIcon";
import { useLocale } from "./LocaleProvider";
import { metaComps } from "@/data/meta";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./quick-search.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

export default function QuickSearch() {
  const router = useRouter();
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (!open || catalog) return;
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, [catalog, open]);

  const q = normalize(query);
  const results = useMemo(() => {
    const filterEntries = (entries: CatalogEntry[], limit: number) => {
      if (!q) return [];
      return entries.filter((entry) => normalize([entry.nameZh, entry.nameEn, ...(entry.aliases ?? []), entry.id].join(" ")).includes(q)).slice(0, limit);
    };
    return {
      champions: filterEntries(catalog?.champions ?? [], 4),
      items: filterEntries(catalog?.items ?? [], 4),
      traits: filterEntries(catalog?.traits ?? [], 3),
      augments: filterEntries(catalog?.augments ?? [], 3),
      comps: !q ? [] : metaComps.filter((comp) => normalize([comp.name, comp.nameZh, comp.source, comp.playstyle, ...comp.coreUnits, ...comp.flexUnits, ...comp.traits].join(" ")).includes(q)).slice(0, 4),
    };
  }, [catalog, q]);

  const hasResults = results.champions.length + results.items.length + results.traits.length + results.augments.length + results.comps.length > 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setOpen(true);
      return;
    }
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function catalogLink(type: "champion" | "item" | "trait" | "augment", entry: CatalogEntry) {
    if (type === "champion") return `/stats?champion=${encodeURIComponent(entry.id)}`;
    return `/search?q=${encodeURIComponent(entry.nameEn)}`;
  }

  function renderEntries(title: string, type: "champion" | "item" | "trait" | "augment", entries: CatalogEntry[]) {
    if (!entries.length) return null;
    return (
      <section className={styles.group}>
        <div className={styles.groupTitle}>{title}</div>
        {entries.map((entry) => (
          <Link className={styles.result} href={catalogLink(type, entry)} key={`${type}-${entry.id}`} onClick={() => setOpen(false)}>
            <UnitIcon entry={entry} size={34} />
            <span><strong>{nameOf(entry)}</strong><small>{secondaryNameOf(entry)}</small></span>
            <em>{type === "champion" ? tr("属性实验室", "Stat Lab") : tr("查看资料", "Open")}</em>
          </Link>
        ))}
      </section>
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <form className={`${styles.search} ${open ? styles.searchOpen : ""}`} onSubmit={submit}>
        <span className={styles.icon}>⌕</span>
        <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={tr("搜索英雄、装备、羁绊、强化或阵容", "Search champions, items, traits, augments or comps")} aria-label={tr("全局搜索", "Global search")} autoComplete="off" />
        <kbd>Ctrl K</kbd>
      </form>

      {open && (
        <div className={styles.dropdown}>
          {!q ? (
            <div className={styles.hint}><strong>{tr("快速查询", "Quick Search")}</strong><span>{tr("输入中英文名称；英雄可直接进入属性实验室，阵容可直接进入对局模式。", "Search Chinese or English names; open champions in Stat Lab and comps in Game Focus.")}</span></div>
          ) : (
            <div className={styles.results}>
              {results.comps.length > 0 && <section className={styles.group}><div className={styles.groupTitle}>{tr("阵容", "Comps")}</div>{results.comps.map((comp) => <Link className={styles.compResult} href={`/focus?source=${encodeURIComponent(comp.sourceId)}&id=${encodeURIComponent(comp.id)}`} key={`${comp.sourceId}-${comp.id}`} onClick={() => setOpen(false)}><span className={styles.tier}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span><span><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><small>{comp.source} · {comp.playstyle}</small></span><em>{tr("对局模式", "Focus")}</em></Link>)}</section>}
              {renderEntries(tr("英雄", "Champions"), "champion", results.champions)}
              {renderEntries(tr("装备", "Items"), "item", results.items)}
              {renderEntries(tr("羁绊", "Traits"), "trait", results.traits)}
              {renderEntries(tr("强化", "Augments"), "augment", results.augments)}
              {!hasResults && <div className={styles.noResults}>{tr("没有即时结果，按 Enter 查看完整搜索。", "No instant results. Press Enter for full search.")}</div>}
            </div>
          )}
          <div className={styles.footer}><span>Enter {tr("完整搜索", "full search")}</span><span>Esc {tr("关闭", "close")}</span></div>
        </div>
      )}
    </div>
  );
}
