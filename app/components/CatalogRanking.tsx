"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "./UnitIcon";
import { useLocale } from "./LocaleProvider";
import type { CatalogEntry, ItemSubtype, TftCatalogPayload } from "@/data/tft";
import styles from "./catalog-ranking.module.css";

type CatalogKey = "champions" | "items" | "traits" | "augments";
type ItemFilter = "all" | ItemSubtype;

type Config = {
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  labelZh: string;
  labelEn: string;
};

const configs: Record<CatalogKey, Config> = {
  champions: { titleZh: "英雄排行", titleEn: "Champion Ranking", subtitleZh: "Set 18 英雄中英资料与费用筛选", subtitleEn: "Set 18 champions with bilingual names and cost filters", labelZh: "英雄", labelEn: "Champion" },
  items: { titleZh: "装备图鉴", titleEn: "Item Explorer", subtitleZh: "散件、成装、转职纹章、神器与合成路径", subtitleEn: "Components, completed items, emblems, artifacts and recipes", labelZh: "装备", labelEn: "Item" },
  traits: { titleZh: "羁绊排行", titleEn: "Trait Ranking", subtitleZh: "Set 18 羁绊中英名称", subtitleEn: "Set 18 trait library with bilingual names", labelZh: "羁绊", labelEn: "Trait" },
  augments: { titleZh: "强化排行", titleEn: "Augment Ranking", subtitleZh: "Set 18 强化符文中英资料", subtitleEn: "Set 18 augment library with bilingual names", labelZh: "强化", labelEn: "Augment" },
};

const itemFilters: Array<{ value: ItemFilter; zh: string; en: string }> = [
  { value: "all", zh: "全部", en: "All" },
  { value: "component", zh: "基础散件", en: "Components" },
  { value: "completed", zh: "成装", en: "Completed" },
  { value: "emblem", zh: "转职纹章", en: "Emblems" },
  { value: "artifact", zh: "神器装备", en: "Artifacts" },
  { value: "tactician", zh: "战术家装备", en: "Tactician" },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’']/g, "").replace(/\s+/g, " ");
}

function subtypeLabel(subtype: ItemSubtype | undefined, locale: "zh" | "en") {
  const found = itemFilters.find((entry) => entry.value === subtype);
  return found ? (locale === "zh" ? found.zh : found.en) : "—";
}

function itemDirectionTags(entry: CatalogEntry, locale: "zh" | "en") {
  const text = normalize([entry.nameZh, entry.nameEn, entry.descriptionZh ?? "", entry.descriptionEn ?? ""].join(" "));
  const tags: Array<[string, string]> = [];
  const add = (zh: string, en: string) => {
    if (!tags.some((tag) => tag[0] === zh)) tags.push([zh, en]);
  };
  if (/attack damage|critical|crit|攻击力|暴击|物理伤害/.test(text)) add("物理输出", "AD");
  if (/ability power|magic damage|法术强度|魔法伤害/.test(text)) add("法系输出", "AP");
  if (/attack speed|攻击速度/.test(text)) add("攻速", "Attack Speed");
  if (/mana|法力|回蓝/.test(text)) add("启动 / 回蓝", "Mana");
  if (/armor|magic resist|health|shield|healing|护甲|魔抗|生命|护盾|治疗/.test(text)) add("生存 / 前排", "Tank / Sustain");
  if (entry.subtype === "emblem") add("转职", "Emblem");
  if (entry.subtype === "artifact") add("特殊效果", "Special Effect");
  if (entry.subtype === "tactician") add("人口 / 战术家", "Tactician");
  if (entry.subtype === "component" && tags.length === 0) add("基础属性", "Base Stat");
  return tags.slice(0, 4).map((tag) => locale === "zh" ? tag[0] : tag[1]);
}

export default function CatalogRanking({ kind }: { kind: CatalogKey }) {
  const { locale, tr, nameOf, secondaryNameOf, descriptionOf } = useLocale();
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
    return source.filter((entry) => {
      if (kind === "champions" && cost && entry.tier !== cost) return false;
      if (kind === "items" && itemType !== "all" && entry.subtype !== itemType) return false;
      if (!q) return true;
      return normalize([entry.nameZh, entry.nameEn, ...(entry.aliases ?? []), entry.id, entry.descriptionZh ?? "", entry.descriptionEn ?? ""].join(" ")).includes(q);
    }).sort((a, b) => {
      if (kind === "champions") return (a.tier ?? 99) - (b.tier ?? 99) || a.nameEn.localeCompare(b.nameEn);
      if (kind === "items" && a.subtype !== b.subtype) {
        const order: Record<ItemSubtype, number> = { component: 0, completed: 1, emblem: 2, tactician: 3, artifact: 4 };
        return (a.subtype ? order[a.subtype] : 99) - (b.subtype ? order[b.subtype] : 99);
      }
      return a.nameEn.localeCompare(b.nameEn);
    });
  }, [catalog, cost, itemType, kind, query]);

  useEffect(() => {
    if (kind !== "items") return;
    if (!entries.length) {
      setSelectedItemId(null);
      return;
    }
    if (!selectedItemId || !entries.some((entry) => entry.id === selectedItemId)) setSelectedItemId(entries[0].id);
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

  const selectedA = useMemo(() => catalog && componentA ? catalog.components.find((item) => normalize(item.nameEn) === normalize(componentA)) ?? null : null, [catalog, componentA]);
  const selectedB = useMemo(() => catalog && componentB ? catalog.components.find((item) => normalize(item.nameEn) === normalize(componentB)) ?? null : null, [catalog, componentB]);
  const resultItem = useMemo(() => catalog && recipeResult ? catalog.items.find((item) => normalize(item.nameEn) === normalize(recipeResult.result)) ?? null : null, [catalog, recipeResult]);
  const selectedItem = useMemo(() => catalog && selectedItemId ? catalog.items.find((item) => item.id === selectedItemId) ?? null : null, [catalog, selectedItemId]);
  const selectedItemRecipe = useMemo(() => catalog && selectedItem ? catalog.recipes.find((recipe) => normalize(recipe.result) === normalize(selectedItem.nameEn)) ?? null : null, [catalog, selectedItem]);
  const selectedRecipeParts = useMemo(() => {
    if (!catalog || !selectedItemRecipe) return [];
    return [selectedItemRecipe.a, selectedItemRecipe.b].map((name) => catalog.components.find((item) => normalize(item.nameEn) === normalize(name))).filter((item): item is CatalogEntry => Boolean(item));
  }, [catalog, selectedItemRecipe]);

  function pickComponent(name: string) {
    if (!componentA) return setComponentA(name);
    if (!componentB) return setComponentB(name);
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
        <div><h1>{locale === "zh" ? config.titleZh : config.titleEn}</h1><p>{locale === "zh" ? config.subtitleZh : config.subtitleEn}</p></div>
        <span className={styles.count}>{entries.length || "—"} {tr("条", "entries")}</span>
      </header>

      {kind === "items" && (
        <section className={styles.itemBuilder}>
          <div className={styles.itemBuilderHead}>
            <div><strong>{tr("装备合成器", "Item Combiner")}</strong><span>{tr("点击两个散件查看合成结果 · 包含金铲铲、金锅锅与 Set 18 转职", "Pick two components to see the result · includes Spatula, Frying Pan and Set 18 emblems")}</span></div>
            <button className={styles.clearButton} onClick={clearRecipe} disabled={!componentA && !componentB}>{tr("清空", "Clear")}</button>
          </div>
          <div className={styles.components}>
            {(catalog?.components ?? []).map((component) => {
              const selected = component.nameEn === componentA || component.nameEn === componentB;
              return <button key={component.id} className={`${styles.component} ${selected ? styles.selected : ""}`} onClick={() => pickComponent(component.nameEn)} title={`${component.nameZh} / ${component.nameEn}`}><UnitIcon entry={component} size={32} /></button>;
            })}
          </div>
          <div className={styles.recipe}>
            <div className={`${styles.recipeSlot} ${selectedA ? styles.recipeSlotFilled : ""}`} title={selectedA ? `${selectedA.nameZh} / ${selectedA.nameEn}` : tr("散件 1", "Component 1")}>{selectedA ? <UnitIcon entry={selectedA} size={42} /> : <span>{tr("散件 1", "Part 1")}</span>}</div>
            <span className={styles.operator}>+</span>
            <div className={`${styles.recipeSlot} ${selectedB ? styles.recipeSlotFilled : ""}`} title={selectedB ? `${selectedB.nameZh} / ${selectedB.nameEn}` : tr("散件 2", "Component 2")}>{selectedB ? <UnitIcon entry={selectedB} size={42} /> : <span>{tr("散件 2", "Part 2")}</span>}</div>
            <span className={styles.operator}>=</span>
            <button className={`${styles.recipeResult} ${recipeResult ? styles.ready : ""}`} onClick={() => resultItem && setSelectedItemId(resultItem.id)} disabled={!resultItem}>
              {resultItem ? <UnitIcon entry={resultItem} size={40} /> : null}
              <div><strong>{resultItem ? nameOf(resultItem) : recipeResult?.result ?? tr("选择两个散件", "Pick two components")}</strong><span>{resultItem ? secondaryNameOf(resultItem) : recipeResult?.result ?? tr("支持 Set 18 的 55 种合成", "55 Set 18 recipes supported")}</span></div>
            </button>
          </div>
        </section>
      )}

      <section className={styles.toolbar}>
        <input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr(`搜索 ${config.labelZh} / 中文 / English`, `Search ${config.labelEn} / English / 中文`)} />
        {kind === "champions" && <div className={styles.chips}><button className={`${styles.chip} ${cost === null ? styles.active : ""}`} onClick={() => setCost(null)}>{tr("全部", "All")}</button>{[1,2,3,4,5].map((value) => <button key={value} className={`${styles.chip} ${cost === value ? styles.active : ""}`} onClick={() => setCost(value)}>{value} Cost</button>)}</div>}
        {kind === "items" && <div className={styles.chips}>{itemFilters.map((entry) => <button key={entry.value} className={`${styles.chip} ${itemType === entry.value ? styles.active : ""}`} onClick={() => setItemType(entry.value)}>{locale === "zh" ? entry.zh : entry.en}</button>)}</div>}
        {kind !== "items" && <span className={styles.note}>{tr("Avg. place / Top 4 / 1st / Games 统计后端待接入", "Avg. place / Top 4 / 1st / Games backend coming later")}</span>}
      </section>

      {kind === "items" ? (
        <section className={styles.itemExplorer}>
          <div className={styles.itemGrid}>
            {entries.map((entry) => <button key={entry.id} className={`${styles.itemCard} ${selectedItemId === entry.id ? styles.itemCardActive : ""}`} onClick={() => setSelectedItemId(entry.id)} title={`${entry.nameZh} / ${entry.nameEn}`}><UnitIcon entry={entry} size={46} /><span className={styles.itemCardName}>{nameOf(entry)}</span><span className={styles.itemCardEn}>{secondaryNameOf(entry)}</span><span className={styles.itemCardType}>{subtypeLabel(entry.subtype, locale)}</span></button>)}
            {!entries.length && <div className={styles.empty}>{tr("正在同步资料，或没有符合筛选条件的结果。", "Syncing data, or no results match the current filters.")}</div>}
          </div>
          <aside className={styles.itemDetail}>
            {selectedItem ? <>
              <div className={styles.detailHero}><UnitIcon entry={selectedItem} size={72} /><div><span className={styles.detailType}>{subtypeLabel(selectedItem.subtype, locale)}</span><h2>{nameOf(selectedItem)}</h2><p>{secondaryNameOf(selectedItem)}</p></div></div>
              <div className={styles.detailTags}>{itemDirectionTags(selectedItem, locale).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className={styles.detailBlock}><h3>{tr("装备效果", "Effect")}</h3><p className={styles.description}>{descriptionOf(selectedItem) || tr("Riot 当前数据没有提供可显示的装备说明。", "Riot data does not currently expose a displayable description for this item.")}</p></div>
              <div className={styles.detailBlock}><h3>{tr("合成路径", "Recipe")}</h3>{selectedItemRecipe && selectedRecipeParts.length === 2 ? <div className={styles.detailRecipe}><div title={`${selectedRecipeParts[0].nameZh} / ${selectedRecipeParts[0].nameEn}`}><UnitIcon entry={selectedRecipeParts[0]} size={42} /></div><span>+</span><div title={`${selectedRecipeParts[1].nameZh} / ${selectedRecipeParts[1].nameEn}`}><UnitIcon entry={selectedRecipeParts[1]} size={42} /></div><span>=</span><div className={styles.detailRecipeResult}><UnitIcon entry={selectedItem} size={46} /></div></div> : <p className={styles.detailMuted}>{selectedItem.subtype === "artifact" ? tr("神器装备不能由基础散件直接合成。", "Artifacts cannot be crafted from normal components.") : selectedItem.subtype === "component" ? tr("这是基础散件，可用于装备合成器。", "This is a base component used in recipes.") : tr("当前版本没有基础散件合成路径。", "No normal component recipe exists for this item.")}</p>}</div>
              {(selectedItem.aliases?.length ?? 0) > 0 && <div className={styles.detailBlock}><h3>{tr("旧名 / 别名", "Legacy names / aliases")}</h3><div className={styles.aliases}>{selectedItem.aliases?.map((alias) => <span key={alias}>{alias}</span>)}</div></div>}
              <div className={styles.detailFoot}>{tr("数据", "Data")}: Riot Data Dragon · {catalog?.tftPatch ? `Patch ${catalog.tftPatch}` : tr("当前版本", "Current patch")}</div>
            </> : <div className={styles.detailEmpty}>{tr("点击左侧任意装备查看详情。", "Select any item on the left to view details.")}</div>}
          </aside>
        </section>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}><thead><tr><th>#</th><th>{locale === "zh" ? config.labelZh : config.labelEn}</th><th>{kind === "champions" ? "Cost" : "Set"}</th><th>Avg. place</th><th>Top 4 rate</th><th>1st place</th><th>Games</th></tr></thead><tbody>{entries.map((entry, index) => <tr key={entry.id}><td className={styles.rank}>{index + 1}</td><td><div className={styles.entry}><UnitIcon entry={entry} size={36} /><div><strong>{nameOf(entry)}</strong><span>{secondaryNameOf(entry)}</span></div></div></td><td><span className={styles.tag}>{kind === "champions" ? `${entry.tier ?? "—"} Cost` : "Set 18"}</span></td><td className={styles.placeholder}>—</td><td className={styles.placeholder}>—</td><td className={styles.placeholder}>—</td><td className={styles.placeholder}>—</td></tr>)}</tbody></table>
          {!entries.length && <div className={styles.empty}>{tr("正在同步资料，或没有符合筛选条件的结果。", "Syncing data, or no results match the current filters.")}</div>}
        </div>
      )}
    </div>
  );
}
