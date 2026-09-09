"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import type { ChampionDetailIndex } from "@/lib/champion-details-client";
import { loadChampionDetails } from "@/lib/champion-details-client";
import UnitIcon from "./UnitIcon";
import { useLocale } from "./LocaleProvider";
import styles from "./reference-explorer.module.css";

type ReferenceKind = "traits" | "augments";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’']/g, "").replace(/\s+/g, " ");
}

export default function ReferenceExplorer({ kind }: { kind: ReferenceKind }) {
  const { locale, tr, nameOf, secondaryNameOf, descriptionOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [championIndex, setChampionIndex] = useState<ChampionDetailIndex | null>(null);

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    if (kind !== "traits") return;
    let cancelled = false;
    loadChampionDetails(locale)
      .then((index) => { if (!cancelled) setChampionIndex(index); })
      .catch(() => { if (!cancelled) setChampionIndex(null); });
    return () => { cancelled = true; };
  }, [kind, locale]);

  const source = catalog?.[kind] ?? [];
  const tiers = useMemo(() => Array.from(new Set(source.map((entry) => entry.tier).filter((value): value is number => typeof value === "number"))).sort((a, b) => a - b), [source]);

  const entries = useMemo(() => {
    const q = normalize(query);
    return source.filter((entry) => {
      if (kind === "augments" && tierFilter !== null && entry.tier !== tierFilter) return false;
      if (!q) return true;
      return normalize([
        entry.nameZh,
        entry.nameEn,
        entry.descriptionZh ?? "",
        entry.descriptionEn ?? "",
        ...(entry.thresholds?.map(String) ?? []),
      ].join(" ")).includes(q);
    });
  }, [kind, query, source, tierFilter]);

  useEffect(() => {
    if (!entries.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !entries.some((entry) => entry.id === selectedId)) setSelectedId(entries[0].id);
  }, [entries, selectedId]);

  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  const relatedChampions = useMemo(() => {
    if (kind !== "traits" || !selected || !championIndex || !catalog) return [];
    const wanted = normalize(locale === "zh" ? selected.nameZh : selected.nameEn);
    return Array.from(championIndex.byId.values())
      .filter((champion) => champion.traits.some((trait) => normalize(trait) === wanted))
      .map((champion) => {
        const catalogChampion = catalog.champions.find((entry) => normalize(locale === "zh" ? entry.nameZh : entry.nameEn) === normalize(champion.name));
        return { detail: champion, entry: catalogChampion ?? null };
      })
      .sort((a, b) => a.detail.cost - b.detail.cost || a.detail.name.localeCompare(b.detail.name));
  }, [catalog, championIndex, kind, locale, selected]);

  const title = kind === "traits" ? tr("羁绊资料库", "Trait Library") : tr("强化资料库", "Augment Library");
  const subtitle = kind === "traits"
    ? tr("查看 Set 18 羁绊效果、触发档位与所属英雄", "Browse Set 18 trait effects, breakpoints and champions")
    : tr("查看 Set 18 强化符文完整效果与等级", "Browse Set 18 augment effects and tiers");

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><h1>{title}</h1><p>{subtitle}</p></div>
        <span className={styles.count}>{entries.length || "—"} {tr("条", "entries")}</span>
      </header>

      <section className={styles.toolbar}>
        <input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === "traits" ? tr("搜索羁绊 / 效果 / 中文 / English", "Search traits / effects / English / 中文") : tr("搜索强化 / 效果 / 中文 / English", "Search augments / effects / English / 中文")} />
        {kind === "augments" && tiers.length > 0 && <div className={styles.chips}><button className={`${styles.chip} ${tierFilter === null ? styles.active : ""}`} onClick={() => setTierFilter(null)}>{tr("全部", "All")}</button>{tiers.map((tier) => <button key={tier} className={`${styles.chip} ${tierFilter === tier ? styles.active : ""}`} onClick={() => setTierFilter(tier)}>{tr("等级", "Tier")} {tier}</button>)}</div>}
        <span className={styles.note}>{tr("鼠标悬停图标可快速查看详情", "Hover an icon for quick details")}</span>
      </section>

      <section className={styles.explorer}>
        <div className={styles.library}>
          {entries.map((entry) => (
            <button key={entry.id} className={`${styles.card} ${selectedId === entry.id ? styles.selected : ""}`} onClick={() => setSelectedId(entry.id)}>
              <UnitIcon entry={entry} size={44} />
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}><strong>{nameOf(entry)}</strong>{entry.tier ? <span>{tr("等级", "Tier")} {entry.tier}</span> : null}</div>
                <span className={styles.secondary}>{secondaryNameOf(entry)}</span>
                {entry.thresholds && entry.thresholds.length > 0 ? <div className={styles.breakpointRow}>{entry.thresholds.map((value) => <b key={value}>{value}</b>)}</div> : null}
                <p>{descriptionOf(entry) || tr("当前版本数据没有可显示的说明。", "No displayable description is available for the current patch.")}</p>
              </div>
            </button>
          ))}
          {!entries.length && <div className={styles.empty}>{tr("正在同步资料，或没有符合筛选条件的结果。", "Syncing data, or no results match the current filters.")}</div>}
        </div>

        <aside className={styles.detail}>
          {selected ? <>
            <div className={styles.detailHead}>
              <UnitIcon entry={selected} size={66} />
              <div><span className={styles.detailType}>{kind === "traits" ? tr("羁绊", "Trait") : tr("强化符文", "Augment")}</span><h2>{nameOf(selected)}</h2><p>{secondaryNameOf(selected)}</p></div>
            </div>

            {selected.thresholds && selected.thresholds.length > 0 && <div className={styles.detailBlock}><h3>{tr("触发档位", "Breakpoints")}</h3><div className={styles.bigBreakpoints}>{selected.thresholds.map((value) => <span key={value}>{value}</span>)}</div></div>}

            <div className={styles.detailBlock}><h3>{kind === "traits" ? tr("羁绊效果", "Trait effect") : tr("强化效果", "Augment effect")}</h3><p className={styles.description}>{descriptionOf(selected) || tr("当前版本数据没有可显示的说明。", "No displayable description is available for the current patch.")}</p></div>

            {kind === "traits" && <div className={styles.detailBlock}><h3>{tr("相关英雄", "Champions")}</h3>{relatedChampions.length ? <div className={styles.championGrid}>{relatedChampions.map(({ detail, entry }) => <div className={styles.champion} key={detail.id}>{entry ? <UnitIcon entry={entry} size={38} /> : <span className={styles.championFallback}>{detail.name.slice(0, 1)}</span>}<div><strong>{detail.name}</strong><span>{detail.cost} {tr("费", "Cost")}</span></div></div>)}</div> : <p className={styles.muted}>{tr("正在载入当前版本相关英雄…", "Loading current-patch champions…")}</p>}</div>}

            {kind === "augments" && selected.tier ? <div className={styles.detailBlock}><h3>{tr("强化等级", "Augment tier")}</h3><span className={styles.tierBadge}>{tr("等级", "Tier")} {selected.tier}</span></div> : null}

            <div className={styles.detailFoot}>{tr("数据", "Data")}: Riot Data Dragon · {catalog?.tftPatch ? `Patch ${catalog.tftPatch}` : tr("当前版本", "Current patch")}</div>
          </> : <div className={styles.detailEmpty}>{tr("点击左侧条目查看完整资料。", "Select an entry on the left to view full details.")}</div>}
        </aside>
      </section>
    </div>
  );
}
