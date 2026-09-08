"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "./UnitIcon";
import type { CatalogEntry, ItemSubtype, TftCatalogPayload } from "@/data/tft";
import styles from "./catalog-ranking.module.css";

type CatalogKey = "champions" | "items" | "traits" | "augments";
type ItemFilter = "all" | ItemSubtype;

type Config = {
  title: string;
  subtitle: string;
  label: string;
};

const configs: Record<CatalogKey, Config> = {
  champions: { title: "Champion Ranking", subtitle: "Set 18 英雄中英资料与费用筛选", label: "Champion" },
  items: { title: "装备图鉴", subtitle: "散件、成装、转职纹章、神器与合成路径", label: "Item" },
  traits: { title: "Synergy Ranking", subtitle: "Set 18 羁绊中英名称", label: "Synergy" },
  augments: { title: "Augment Ranking", subtitle: "Set 18 强化符文中英资料", label: "Augment" },
};

const itemFilterLabels: Record<ItemFilter, string> = {
  all: "全部",
  component: "基础散件",
  completed: "成装",
  emblem: "转职纹章",
  artifact: "神器装备",
  tactician: "战术家装备",
};

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ");
}

function itemTypeLabel(subtype?: ItemSubtype) {
  if (!subtype) return "—";
  return itemFilterLabels[subtype];
}

function itemDirectionTags(entry: CatalogEntry) {
  const text = normalize([
    entry.nameZh,
    entry.nameEn,
    entry.descriptionZh ?? "",
    entry.descriptionEn ?? "",
  ].join(" "));
  const tags: string[] = [];
  const add = (label: string) => {
    if (!tags.includes(label)) tags.push(label);
  };

  if (/attack damage|critical|crit|攻击力|暴击|物理伤害/.test(text)) add("物理输出");
  if (/ability power|magic damage|法术强度|魔法伤害/.test(text)) add("法系输出");
  if (/attack speed|攻击速度/.test(text)) add("攻速");
  if (/mana|法力|回蓝/.test(text)) add("启动 / 回蓝");
  if (/armor|magic resist|health|shield|healing|护甲|魔抗|生命|护盾|治疗/.test(text)) add("生存 / 前排");
  if (entry.subtype === "emblem") add("转职");
  if (entry.subtype === "artifact") add("特殊效果");
  if (entry.subtype === "tactician") add("人口 / 战术家");
  if (entry.subtype === "component" && tags.length === 0) add("基础属性");
  return tags.slice(0, 4);
}

export default function CatalogRanking({ kind }: { kind: CatalogKey }) {
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState<number | null>(null);
  const [itemType, setItemType] = useState<ItemFilter>("all");
  const [componentA, setComponentA] = useState<string | null>(null);
  const [componentB, setComponentB] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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
        return normalize([
          entry.nameZh,
          entry.nameEn,
          ...(entry.aliases ?? []),
          entry.id,
          entry.descriptionZh ?? "",
          entry.descriptionEn ?? "",
        ].join(" ")).includes(q);
      })
      .sort((a, b) => {
        if (kind === "champions") return (a.tier ?? 99) - (b.tier ?? 99) || a.nameEn.localeCompare(b.nameEn);
        if (kind === "items" && a.subtype !== b.subtype) {
          const order: Record<ItemSubtype, number> = {
            component: 0,
            completed: 1,
            emblem: 2,
            tactician: 3,
            artifact: 4,
          };
          return (a.subtype ? order[a.subtype] : 99) - (b.subtype ? order[b.subtype] : 99);
        }
        return a.nameEn.localeCompare(b.nameEn);
      });
  }, [catalog, cost, itemType, kind, query]);

  useEffect(() => {
    if (kind !== "items") return;
    if (entries.length === 0) {
      setSelectedItemId(null);
      return;
    }
    if (!selectedItemId || !entries.some((entry) => entry.id === selectedItemId)) {
      setSelectedItemId(entries[0].id);
    }
  }, [entries, kind, selectedItemId]);

  const recipeResult = useMemo(() => {
    if (!catalog || !componentA || !componentB) return null;
    const a = normalize(componentA);
    const b = normalize(componentB);
    return catalog.recipes.find((recipe) => {
      const recipeA = normalize(recipe.a);
      const recipeB = normalize(recipe.b);
      return (recipeA === a && recipeB === b) || (recipeA === b && recipeB === a);
    }) ?? null;
  }, [catalog, componentA, componentB]);

  const selectedA = useMemo(() => {
    if (!catalog || !componentA) return null;
    return catalog.components.find((item) => normalize(item.nameEn) === normalize(componentA)) ?? null;
  }, [catalog, componentA]);

  const selectedB = useMemo(() => {
    if (!catalog || !componentB) return null;
    return catalog.components.find((item) => normalize(item.nameEn) === normalize(componentB)) ?? null;
  }, [catalog, componentB]);

  const resultItem = useMemo(() => {
    if (!catalog || !recipeResult) return null;
    return catalog.items.find((item) => normalize(item.nameEn) === normalize(recipeResult.result)) ?? null;
  }, [catalog, recipeResult]);

  const selectedItem = useMemo(() => {
    if (!catalog || !selectedItemId) return null;
    return catalog.items.find((item) => item.id === selectedItemId) ?? null;
  }, [catalog, selectedItemId]);

  const selectedItemRecipe = useMemo(() => {
    if (!catalog || !selectedItem) return null;
    return catalog.recipes.find((recipe) => normalize(recipe.result) === normalize(selectedItem.nameEn)) ?? null;
  }, [catalog, selectedItem]);

  const selectedRecipeParts = useMemo(() => {
    if (!catalog || !selectedItemRecipe) return [];
    return [selectedItemRecipe.a, selectedItemRecipe.b]
      .map((name) => catalog.components.find((item) => normalize(item.nameEn) === normalize(name)))
      .filter((item): item is CatalogEntry => Boolean(item));
  }, [catalog, selectedItemRecipe]);

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

  function clearRecipe() {
    setComponentA(null);
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
            <div>
              <strong>装备合成器</strong>
              <span>点击两个散件查看合成结果 · 包含金铲铲、金锅锅与 Set 18 转职</span>
            </div>
            <button className={styles.clearButton} onClick={clearRecipe} disabled={!componentA && !componentB}>清空</button>
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
                  <UnitIcon entry={component} size={32} />
                  <span>{component.nameZh}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.recipe}>
            <div
              className={`${styles.recipeSlot} ${selectedA ? styles.recipeSlotFilled : ""}`}
              title={selectedA ? `${selectedA.nameZh} / ${selectedA.nameEn}` : "散件 1"}
            >
              {selectedA ? <UnitIcon entry={selectedA} size={42} /> : <span>散件 1</span>}
            </div>
            <span className={styles.operator}>+</span>
            <div
              className={`${styles.recipeSlot} ${selectedB ? styles.recipeSlotFilled : ""}`}
              title={selectedB ? `${selectedB.nameZh} / ${selectedB.nameEn}` : "散件 2"}
            >
              {selectedB ? <UnitIcon entry={selectedB} size={42} /> : <span>散件 2</span>}
            </div>
            <span className={styles.operator}>=</span>
            <button
              className={`${styles.recipeResult} ${recipeResult ? styles.ready : ""}`}
              onClick={() => resultItem && setSelectedItemId(resultItem.id)}
              disabled={!resultItem}
            >
              {resultItem ? <UnitIcon entry={resultItem} size={40} /> : null}
              <div>
                <strong>{resultItem?.nameZh ?? recipeResult?.result ?? "选择两个散件"}</strong>
                <span>{resultItem?.nameEn ?? recipeResult?.result ?? "支持 Set 18 的 55 种合成"}</span>
              </div>
            </button>
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
            {(["all", "component", "completed", "emblem", "artifact", "tactician"] as const).map((value) => (
              <button key={value} className={`${styles.chip} ${itemType === value ? styles.active : ""}`} onClick={() => setItemType(value)}>
                {itemFilterLabels[value]}
              </button>
            ))}
          </div>
        )}

        {kind !== "items" && <span className={styles.note}>Avg. place / Top 4 / 1st / Games 统计后端待接入</span>}
      </section>

      {kind === "items" ? (
        <section className={styles.itemExplorer}>
          <div className={styles.itemGrid}>
            {entries.map((entry) => (
              <button
                key={entry.id}
                className={`${styles.itemCard} ${selectedItemId === entry.id ? styles.itemCardActive : ""}`}
                onClick={() => setSelectedItemId(entry.id)}
                title={`${entry.nameZh} / ${entry.nameEn}`}
              >
                <UnitIcon entry={entry} size={46} />
                <span className={styles.itemCardName}>{entry.nameZh}</span>
                <span className={styles.itemCardEn}>{entry.nameEn}</span>
                <span className={styles.itemCardType}>{itemTypeLabel(entry.subtype)}</span>
              </button>
            ))}
            {entries.length === 0 && <div className={styles.empty}>正在同步资料，或没有符合筛选条件的结果。</div>}
          </div>

          <aside className={styles.itemDetail}>
            {selectedItem ? (
              <>
                <div className={styles.detailHero}>
                  <UnitIcon entry={selectedItem} size={72} />
                  <div>
                    <span className={styles.detailType}>{itemTypeLabel(selectedItem.subtype)}</span>
                    <h2>{selectedItem.nameZh}</h2>
                    <p>{selectedItem.nameEn}</p>
                  </div>
                </div>

                <div className={styles.detailTags}>
                  {itemDirectionTags(selectedItem).map((tag) => <span key={tag}>{tag}</span>)}
                </div>

                <div className={styles.detailBlock}>
                  <h3>装备效果</h3>
                  <p className={styles.description}>
                    {selectedItem.descriptionZh || "Riot 当前数据没有提供可显示的中文装备说明。"}
                  </p>
                </div>

                <div className={styles.detailBlock}>
                  <h3>合成路径</h3>
                  {selectedItemRecipe && selectedRecipeParts.length === 2 ? (
                    <div className={styles.detailRecipe}>
                      <div title={`${selectedRecipeParts[0].nameZh} / ${selectedRecipeParts[0].nameEn}`}><UnitIcon entry={selectedRecipeParts[0]} size={42} /></div>
                      <span>+</span>
                      <div title={`${selectedRecipeParts[1].nameZh} / ${selectedRecipeParts[1].nameEn}`}><UnitIcon entry={selectedRecipeParts[1]} size={42} /></div>
                      <span>=</span>
                      <div className={styles.detailRecipeResult}><UnitIcon entry={selectedItem} size={46} /></div>
                    </div>
                  ) : (
                    <p className={styles.detailMuted}>
                      {selectedItem.subtype === "artifact"
                        ? "神器装备不能由基础散件直接合成。"
                        : selectedItem.subtype === "component"
                          ? "这是基础散件，可用于装备合成器。"
                          : "当前版本没有基础散件合成路径。"}
                    </p>
                  )}
                </div>

                {(selectedItem.aliases?.length ?? 0) > 0 && (
                  <div className={styles.detailBlock}>
                    <h3>旧名 / 别名</h3>
                    <div className={styles.aliases}>{selectedItem.aliases?.map((alias) => <span key={alias}>{alias}</span>)}</div>
                  </div>
                )}

                <div className={styles.detailFoot}>
                  数据：Riot Data Dragon · {catalog?.tftPatch ? `Patch ${catalog.tftPatch}` : "当前版本"}
                </div>
              </>
            ) : (
              <div className={styles.detailEmpty}>点击左侧任意装备查看详情。</div>
            )}
          </aside>
        </section>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>{config.label}</th>
                <th>{kind === "champions" ? "Cost" : "Set"}</th>
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
                      {kind === "champions" ? `${entry.tier ?? "—"} Cost` : "Set 18"}
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
      )}
    </div>
  );
}
