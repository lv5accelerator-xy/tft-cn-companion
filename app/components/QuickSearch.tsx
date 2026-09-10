"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UnitIcon from "./UnitIcon";
import { useLocale } from "./LocaleProvider";
import { metaComps } from "@/data/meta";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./quick-search.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function catalogHref(type: "champion" | "item" | "trait" | "augment", entry: CatalogEntry) {
  if (type === "champion") return `/stats?champion=${encodeURIComponent(entry.id)}`;
  return `/search?q=${encodeURIComponent(entry.nameEn)}`;
}

export default function QuickSearch() {
  const router = useRouter();
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        window.setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
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

  const flatResults = useMemo(() => [
    ...results.comps.map((comp) => ({ key: `comp:${comp.sourceId}:${comp.id}`, href: `/focus?source=${encodeURIComponent(comp.sourceId)}&id=${encodeURIComponent(comp.id)}` })),
    ...results.champions.map((entry) => ({ key: `champion:${entry.id}`, href: catalogHref("champion", entry) })),
    ...results.items.map((entry) => ({ key: `item:${entry.id}`, href: catalogHref("item", entry) })),
    ...results.traits.map((entry) => ({ key: `trait:${entry.id}`, href: catalogHref("trait", entry) })),
    ...results.augments.map((entry) => ({ key: `augment:${entry.id}`, href: catalogHref("augment", entry) })),
  ], [results]);

  const hasResults = flatResults.length > 0;

  useEffect(() => {
    setActiveIndex(flatResults.length ? 0 : -1);
  }, [flatResults.length, query]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`quick-result-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function navigateTo(href: string) {
    setOpen(false);
    if (window.location.pathname === "/focus" && href.startsWith("/focus?")) {
      window.location.assign(href);
      return;
    }
    router.push(href);
  }

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

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (event.key === "ArrowDown" && flatResults.length) {
      event.preventDefault();
      setActiveIndex((current) => current < 0 ? 0 : (current + 1) % flatResults.length);
      return;
    }
    if (event.key === "ArrowUp" && flatResults.length) {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? flatResults.length - 1 : current - 1);
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0 && flatResults[activeIndex]) {
      event.preventDefault();
      navigateTo(flatResults[activeIndex].href);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function resultIndex(key: string) {
    return flatResults.findIndex((result) => result.key === key);
  }

  function resultClick(event: ReactMouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();
    navigateTo(href);
  }

  function renderEntries(title: string, type: "champion" | "item" | "trait" | "augment", entries: CatalogEntry[]) {
    if (!entries.length) return null;
    return (
      <section className={styles.group}>
        <div className={styles.groupTitle}>{title}</div>
        {entries.map((entry) => {
          const key = `${type}:${entry.id}`;
          const href = catalogHref(type, entry);
          const index = resultIndex(key);
          return (
            <Link id={`quick-result-${index}`} className={`${styles.result} ${index === activeIndex ? styles.activeResult : ""}`} href={href} key={key} onMouseEnter={() => setActiveIndex(index)} onClick={(event) => resultClick(event, href)}>
              <UnitIcon entry={entry} size={34} />
              <span><strong>{nameOf(entry)}</strong><small>{secondaryNameOf(entry)}</small></span>
              <em>{type === "champion" ? tr("属性实验室", "Stat Lab") : tr("查看资料", "Open")}</em>
            </Link>
          );
        })}
      </section>
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <form className={`${styles.search} ${open ? styles.searchOpen : ""}`} onSubmit={submit}>
        <span className={styles.icon}>⌕</span>
        <input ref={inputRef} value={query} onKeyDown={onInputKeyDown} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={tr("搜索英雄、装备、羁绊、强化或阵容", "Search champions, items, traits, augments or comps")} aria-label={tr("全局搜索", "Global search")} autoComplete="off" />
        <kbd>Ctrl K</kbd>
      </form>

      {open && (
        <div className={styles.dropdown}>
          {!q ? (
            <div className={styles.hint}><strong>{tr("快速查询", "Quick Search")}</strong><span>{tr("输入中英文名称；↑ ↓ 选择，Enter 打开。英雄直达属性实验室，阵容直达对局模式。", "Search Chinese or English; use ↑ ↓ and Enter. Champions open in Stat Lab and comps in Game Focus.")}</span></div>
          ) : (
            <div className={styles.results}>
              {results.comps.length > 0 && <section className={styles.group}><div className={styles.groupTitle}>{tr("阵容", "Comps")}</div>{results.comps.map((comp) => { const key = `comp:${comp.sourceId}:${comp.id}`; const href = `/focus?source=${encodeURIComponent(comp.sourceId)}&id=${encodeURIComponent(comp.id)}`; const index = resultIndex(key); return <Link id={`quick-result-${index}`} className={`${styles.compResult} ${index === activeIndex ? styles.activeResult : ""}`} href={href} key={key} onMouseEnter={() => setActiveIndex(index)} onClick={(event) => resultClick(event, href)}><span className={styles.tier}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span><span><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><small>{comp.source} · {comp.playstyle}</small></span><em>{tr("对局模式", "Focus")}</em></Link>; })}</section>}
              {renderEntries(tr("英雄", "Champions"), "champion", results.champions)}
              {renderEntries(tr("装备", "Items"), "item", results.items)}
              {renderEntries(tr("羁绊", "Traits"), "trait", results.traits)}
              {renderEntries(tr("强化", "Augments"), "augment", results.augments)}
              {!hasResults && <div className={styles.noResults}>{tr("没有即时结果，按 Enter 查看完整搜索。", "No instant results. Press Enter for full search.")}</div>}
            </div>
          )}
          <div className={styles.footer}><span>↑ ↓ {tr("选择", "select")} · Enter {tr("打开", "open")}</span><span>Esc {tr("关闭", "close")}</span></div>
        </div>
      )}
    </div>
  );
}
