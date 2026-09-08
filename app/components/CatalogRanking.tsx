"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "./UnitIcon";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import styles from "./catalog-ranking.module.css";

type CatalogKey = "champions" | "items" | "traits" | "augments";

type Config = {
  title: string;
  subtitle: string;
  label: string;
};

const configs: Record<CatalogKey, Config> = {
  champions: { title: "Champion Ranking", subtitle: "Set 18 英雄中英资料与费用筛选", label: "Champion" },
  items: { title: "Item Ranking", subtitle: "标准散件、成装与组合查询", label: "Item" },
  traits: { title: "Synergy Ranking", subtitle: "Set 18 羁绊中英名称", label: "Synergy" },
  augments: { title: "Augment Ranking", subtitle: "Set 18 强化符文中英资料", label: "Augment" },
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export default function CatalogRanking({ kind }: { kind: CatalogKey }) {
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState<number | null>(null);
  const [itemType, setItemType] = useState<"all" | "component" | "completed">("all");
  const [componentA, setComponentA] = useState<string | null>(null);
  const [componentB, setComponentB] = useState<string | null>(null);
  const config = configs[kind];

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const entries = useMemo<CatalogEntry[]>(() => {
    if (!catalog) return [];
    const source = catalog[kind];
    const q = normalize(query);
    return source
      .filter((entry) => {
        if (kind === "champions" && cost && entry.tier !== cost) return false;
        if (kind === "items" && itemType !== "all" && entry.subtype !== itemType) return false;
        if (!q) return true;
        return normalize([entry.nameZh, entry.nameEn, ...(entry.aliases ?? []), entry.id].join(" ")).includes(q);
      })
      .sort((a, b) => {
        if (kind === "champions") return (a.tier ?? 99) - (b.tier ?? 99) || a.nameEn.localeCompare(b.nameEn);
        if (kind === "items" && a.subtype !== b.subtype) return a.subtype === "component" ? -1 : 1;
        return a.nameEn.localeCompare(b.nameEn);
      });
  }, [catalog, cost, itemType, kind, query]);

  const recipeResult = useMemo(() => {
    if (!catalog || !componentA || !componentB) return null;
    return catalog.recipes.find((recipe) =>
      (recipe.a === componentA && recipe.b === componentB)
      || (recipe.a === componentB && recipe.b === componentA),
    ) ?? null;
  }, [catalog, componentA, componentB]);

  const resultItem = useMemo(() => {
    if (!catalog || !recipeResult) return null;
    return catalog.items.find((item) => normalize(item.nameEn) === normalize(recipeResult.result)) ?? null;
  }, [catalog, recipeResult]);

  function pickComponent(name: string) {
    if (!componentA) {
      setComponentA(name);
      return;
    }
    if (!componentB) {
      setComponentB(name);
      return;
    }
    setComponentA(name);
    setComponentB(null);
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <span className={styles.count}>{entries.length || "—"} entries</span>
      </header>

      {kind === "items" && (
        <section className={styles.itemBuilder}>
          <div className={styles.itemBuilderHead}>
            <strong>Item Combination</strong>
            <span>点击两个基础散件查看合成结果</span>
          </div>
          <div className={styles.components}>
            {(catalog?.components ?? []).map((component) => {
              const selected = component.nameEn === componentA || component.nameEn === componentB;
              return (
                <button
                  key={component.id}
                  className={`${styles.component} ${selected ? styles.selected : ""}`}
                  onClick={() => pickComponent(component.nameEn)}
                  title={`${component.nameZh} / ${component.nameEn}`}
                >
                  <UnitIcon entry={component} size={28} />
                  <span>{component.nameZh}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.recipe}>
            <div className={styles.recipeSlot}>{componentA ?? "Component 1"}</div>
            <span className={styles.operator}>+</span>
            <div className={styles.recipeSlot}>{componentB ?? "Component 2"}</div>
            <span className={styles.operator}>=</span>
            <div className={`${styles.recipeResult} ${recipeResult ? styles.ready : ""}`}>
              {resultItem ? <UnitIcon entry={resultItem} size={30} /> : null}
              <div>
                <strong>{resultItem?.nameZh ?? recipeResult?.result ?? "Select two components"}</strong>
                <span>{resultItem?.nameEn ?? recipeResult?.result ?? "36 basic combinations supported"}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className={styles.toolbar}>
        <input
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`搜索 ${config.label} / 中文 / English`}
        />

        {kind === "champions" && (
          <div className={styles.chips}>
            <button className={`${styles.chip} ${cost === null ? styles.active : ""}`} onClick={() => setCost(null)}>All</button>
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} className={`${styles.chip} ${cost === value ? styles.active : ""}`} onClick={() => setCost(value)}>{value} Cost</button>
            ))}
          </div>
        )}

        {kind === "items" && (
          <div className={styles.chips}>
            {(["all", "component", "completed"] as const).map((value) => (
              <button key={value} className={`${styles.chip} ${itemType === value ? styles.active : ""}`} onClick={() => setItemType(value)}>
                {value === "all" ? "All" : value === "component" ? "Components" : "Completed"}
              </button>
            ))}
          </div>
        )}

        <span className={styles.note}>Avg. place / Top 4 / 1st / Games 统计后端待接入</span>
      </section>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>{config.label}</th>
              <th>{kind === "champions" ? "Cost" : kind === "items" ? "Type" : "Set"}</th>
              <th>Avg. place</th>
              <th>Top 4 rate</th>
              <th>1st place</th>
              <th>Games</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id}>
                <td className={styles.rank}>{index + 1}</td>
                <td>
                  <div className={styles.entry}>
                    <UnitIcon entry={entry} size={36} />
                    <div>
                      <strong>{entry.nameZh}</strong>
                      <span>{entry.nameEn}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={styles.tag}>
                    {kind === "champions"
                      ? `${entry.tier ?? "—"} Cost`
                      : kind === "items"
                        ? (entry.subtype === "component" ? "Component" : "Completed")
                        : "Set 18"}
                  </span>
                </td>
                <td className={styles.placeholder}>—</td>
                <td className={styles.placeholder}>—</td>
                <td className={styles.placeholder}>—</td>
                <td className={styles.placeholder}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <div className={styles.empty}>正在同步资料，或没有符合筛选条件的结果。</div>}
      </div>
    </div>
  );
}
