"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import { useLocale } from "../components/LocaleProvider";
import { detailForEntry, loadChampionDetails, type ChampionDetailIndex } from "@/lib/champion-details-client";
import { computeChampionStats, mergeItemBonuses, STAR_SCALING } from "@/lib/tft-stat-calculator";
import { EMPTY_ITEM_BONUSES, type ItemEffectRecord, type ItemEffectsPayload, type ItemStatBonuses, type StarLevel } from "@/data/stat-simulator";
import type { CatalogEntry, ItemSubtype, TftCatalogPayload } from "@/data/tft";
import styles from "./stat-simulator.module.css";

type ItemFilter = "all" | Exclude<ItemSubtype, "tactician">;

const itemFilters: Array<{ value: ItemFilter; zh: string; en: string }> = [
  { value: "all", zh: "全部", en: "All" },
  { value: "completed", zh: "成装", en: "Completed" },
  { value: "artifact", zh: "神器", en: "Artifacts" },
  { value: "emblem", zh: "转职", en: "Emblems" },
  { value: "component", zh: "散件", en: "Components" },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’']/g, "").replace(/\s+/g, " ");
}

function number(value: number | undefined, digits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function percent(value: number | undefined, digits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${number(value * 100, digits)}%`;
}

function bonusLabels(bonus: ItemStatBonuses, locale: "zh" | "en") {
  const labels: string[] = [];
  const push = (value: number, zh: string, en: string, formatter: (value: number) => string = (entry) => `+${number(entry, 1)}`) => {
    if (Math.abs(value) < 0.00001) return;
    labels.push(`${locale === "zh" ? zh : en} ${formatter(value)}`);
  };
  push(bonus.health, "生命", "HP");
  push(bonus.maxHealthPct, "最大生命", "Max HP", (value) => `+${percent(value, 1)}`);
  push(bonus.attackDamagePct, "攻击力", "AD", (value) => `+${percent(value, 1)}`);
  push(bonus.abilityPower, "法强", "AP");
  push(bonus.attackSpeedPct, "攻速", "AS", (value) => `+${percent(value, 1)}`);
  push(bonus.armor, "护甲", "Armor");
  push(bonus.magicResist, "魔抗", "MR");
  push(bonus.mana, "初始法力", "Start Mana");
  if (bonus.maxManaDelta) labels.push(`${locale === "zh" ? "最大法力" : "Max Mana"} ${bonus.maxManaDelta > 0 ? "+" : ""}${number(bonus.maxManaDelta, 1)}`);
  push(bonus.critChancePct, "暴击", "Crit", (value) => `+${percent(value, 1)}`);
  push(bonus.range, "射程", "Range");
  push(bonus.damageAmpPct, "伤害增幅", "Damage Amp", (value) => `+${percent(value, 1)}`);
  push(bonus.durabilityPct, "耐久度", "Durability", (value) => `+${percent(value, 1)}`);
  push(bonus.omnivampPct, "全能吸血", "Omnivamp", (value) => `+${percent(value, 1)}`);
  return labels;
}

export default function StatSimulator() {
  const { locale, tr, nameOf, secondaryNameOf, descriptionOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [details, setDetails] = useState<ChampionDetailIndex | null>(null);
  const [effectRecords, setEffectRecords] = useState<ItemEffectRecord[]>([]);
  const [effectsLoading, setEffectsLoading] = useState(true);
  const [effectsError, setEffectsError] = useState(false);
  const [selectedChampionId, setSelectedChampionId] = useState("");
  const [slots, setSlots] = useState<Array<string | null>>([null, null, null]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [itemQuery, setItemQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("completed");

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadChampionDetails(locale)
      .then((index) => {
        if (!cancelled) setDetails(index);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    setEffectsLoading(true);
    setEffectsError(false);
    fetch("/api/tft/item-effects")
      .then((response) => response.ok ? response.json() as Promise<ItemEffectsPayload> : Promise.reject())
      .then((payload) => setEffectRecords(payload.items))
      .catch(() => {
        setEffectRecords([]);
        setEffectsError(true);
      })
      .finally(() => setEffectsLoading(false));
  }, []);

  const champions = useMemo(() => (catalog?.champions ?? []).slice().sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99) || a.nameEn.localeCompare(b.nameEn)), [catalog]);

  useEffect(() => {
    if (!selectedChampionId && champions.length) setSelectedChampionId(champions[0].id);
  }, [champions, selectedChampionId]);

  const selectedChampion = useMemo(() => champions.find((entry) => entry.id === selectedChampionId) ?? null, [champions, selectedChampionId]);
  const selectedDetail = useMemo(() => selectedChampion ? detailForEntry(details, selectedChampion) : null, [details, selectedChampion]);

  const effectIndex = useMemo(() => {
    const map = new Map<string, ItemEffectRecord>();
    for (const record of effectRecords) {
      map.set(normalize(record.id), record);
      map.set(normalize(record.name), record);
    }
    return map;
  }, [effectRecords]);

  const equippableItems = useMemo(() => (catalog?.items ?? []).filter((item) => item.subtype !== "tactician"), [catalog]);
  const selectedItems = useMemo(() => slots.map((id) => id ? equippableItems.find((item) => item.id === id) ?? null : null), [equippableItems, slots]);
  const selectedItemEffects = useMemo(() => selectedItems.map((item) => {
    if (!item) return null;
    return effectIndex.get(normalize(item.id)) ?? effectIndex.get(normalize(item.nameEn)) ?? null;
  }), [effectIndex, selectedItems]);
  const mergedBonuses = useMemo(() => mergeItemBonuses(selectedItemEffects.map((record) => record?.bonuses)), [selectedItemEffects]);

  const filteredItems = useMemo(() => {
    const q = normalize(itemQuery);
    return equippableItems.filter((item) => {
      if (itemFilter !== "all" && item.subtype !== itemFilter) return false;
      if (!q) return true;
      return normalize([item.nameZh, item.nameEn, ...(item.aliases ?? [])].join(" ")).includes(q);
    }).sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  }, [equippableItems, itemFilter, itemQuery]);

  const starComparisons = useMemo(() => ([1, 2, 3] as StarLevel[]).map((star) => ({
    star,
    base: computeChampionStats(selectedDetail?.stats, star, EMPTY_ITEM_BONUSES),
    equipped: computeChampionStats(selectedDetail?.stats, star, mergedBonuses),
  })), [mergedBonuses, selectedDetail]);

  const summaryBonuses = useMemo(() => bonusLabels(mergedBonuses, locale), [locale, mergedBonuses]);

  function setItem(slot: number, item: CatalogEntry) {
    setSlots((current) => current.map((value, index) => index === slot ? item.id : value));
    setPickerSlot(null);
    setItemQuery("");
  }

  function clearSlot(slot: number) {
    setSlots((current) => current.map((value, index) => index === slot ? null : value));
  }

  const rows = [
    { key: "health", zh: "生命值", en: "Health", format: (value: number | undefined) => number(value, 0) },
    { key: "attackDamage", zh: "攻击力", en: "Attack Damage", format: (value: number | undefined) => number(value, 1) },
    { key: "dps", zh: "普攻 DPS", en: "Auto DPS", format: (value: number | undefined) => number(value, 1) },
    { key: "attackSpeed", zh: "攻击速度", en: "Attack Speed", format: (value: number | undefined) => number(value, 3) },
    { key: "abilityPower", zh: "法术强度", en: "Ability Power", format: (value: number | undefined) => number(value, 1) },
    { key: "armor", zh: "护甲", en: "Armor", format: (value: number | undefined) => number(value, 1) },
    { key: "magicResist", zh: "魔抗", en: "Magic Resist", format: (value: number | undefined) => number(value, 1) },
    { key: "critChance", zh: "暴击率", en: "Crit Chance", format: (value: number | undefined) => percent(value, 1) },
    { key: "range", zh: "攻击距离", en: "Range", format: (value: number | undefined) => number(value, 1) },
  ] as const;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>SET 18 · STAT LAB</span>
          <h1>{tr("英雄装备属性模拟器", "Champion Item Stat Lab")}</h1>
          <p>{tr("选择英雄与最多 3 件装备，对比 1★ / 2★ / 3★ 的装备后面板属性。", "Choose a champion and up to 3 items to compare equipped 1★ / 2★ / 3★ sheet stats.")}</p>
        </div>
        <span className={styles.patch}>Patch {catalog?.tftPatch ?? "18.1"}</span>
      </header>

      <section className={styles.setup}>
        <div className={styles.championPanel}>
          <label>{tr("英雄", "Champion")}</label>
          <select value={selectedChampionId} onChange={(event) => setSelectedChampionId(event.target.value)}>
            {champions.map((champion) => <option key={champion.id} value={champion.id}>{champion.tier ?? "—"} · {nameOf(champion)} / {secondaryNameOf(champion)}</option>)}
          </select>
          {selectedChampion ? (
            <div className={styles.selectedChampion}>
              <UnitIcon entry={selectedChampion} size={66} />
              <div>
                <strong>{nameOf(selectedChampion)}</strong>
                <span>{secondaryNameOf(selectedChampion)}</span>
                <small>{selectedDetail?.traits.join(" · ") || tr("正在载入羁绊…", "Loading traits…")}</small>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.itemsPanel}>
          <div className={styles.itemsTitle}>
            <div><label>{tr("装备", "Items")}</label><span>{tr("最多 3 件", "Up to 3")}</span></div>
            <button onClick={() => setSlots([null, null, null])} disabled={!slots.some(Boolean)}>{tr("清空", "Clear")}</button>
          </div>
          <div className={styles.slots}>
            {slots.map((id, index) => {
              const item = selectedItems[index];
              return (
                <div className={`${styles.slot} ${item ? styles.filled : ""}`} key={index}>
                  <button className={styles.slotMain} onClick={() => setPickerSlot(index)}>
                    {item ? <><UnitIcon entry={item} size={42} /><span><strong>{nameOf(item)}</strong><small>{secondaryNameOf(item)}</small></span></> : <><span className={styles.plus}>+</span><span><strong>{tr(`装备 ${index + 1}`, `Item ${index + 1}`)}</strong><small>{tr("点击选择", "Choose item")}</small></span></>}
                  </button>
                  {item ? <button className={styles.remove} onClick={() => clearSlot(index)} aria-label={tr("移除装备", "Remove item")}>×</button> : null}
                </div>
              );
            })}
          </div>
          <div className={styles.effectStatus}>
            <span className={`${styles.statusDot} ${effectsError ? styles.statusError : effectsLoading ? styles.statusLoading : styles.statusReady}`} />
            {effectsLoading ? tr("正在载入装备固定属性…", "Loading item stat modifiers…") : effectsError ? tr("装备属性源暂不可用；仍可查看英雄星级基础属性。", "Item stat source is unavailable; base star stats still work.") : tr("装备固定属性：CommunityDragon 当前版本", "Static item modifiers: current CommunityDragon data")}
          </div>
        </div>
      </section>

      {pickerSlot !== null ? (
        <section className={styles.picker}>
          <div className={styles.pickerHead}>
            <div><strong>{tr(`选择装备 ${pickerSlot + 1}`, `Choose item ${pickerSlot + 1}`)}</strong><span>{tr("悬停图标仍可查看装备完整效果", "Hover icons for the full item tooltip")}</span></div>
            <button onClick={() => setPickerSlot(null)}>×</button>
          </div>
          <div className={styles.pickerToolbar}>
            <input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder={tr("搜索装备 / 中文 / English", "Search item / English / 中文")} autoFocus />
            <div>{itemFilters.map((filter) => <button key={filter.value} className={itemFilter === filter.value ? styles.active : ""} onClick={() => setItemFilter(filter.value)}>{locale === "zh" ? filter.zh : filter.en}</button>)}</div>
          </div>
          <div className={styles.itemGrid}>
            {filteredItems.map((item) => <button key={item.id} onClick={() => setItem(pickerSlot, item)} title={`${item.nameZh} / ${item.nameEn}`}><UnitIcon entry={item} size={40} /><span>{nameOf(item)}</span></button>)}
          </div>
        </section>
      ) : null}

      <section className={styles.bonusBar}>
        <div><strong>{tr("装备固定加成汇总", "Static item bonus summary")}</strong><span>{tr("仅计入能直接改变面板的固定数值", "Only direct sheet-stat modifiers are included")}</span></div>
        <div className={styles.bonusChips}>{summaryBonuses.length ? summaryBonuses.map((label) => <span key={label}>{label}</span>) : <em>{tr("当前未选择装备，或所选装备没有可解析的固定面板加成。", "No items selected, or the selected items have no parsed direct sheet-stat bonus.")}</em>}</div>
      </section>

      <section className={styles.comparison}>
        <div className={styles.comparisonHead}>
          <div><strong>{tr("各星级装备后属性", "Equipped stats by star level")}</strong><span>{tr("大字 = 装备后；小字 = 无装备基础值", "Large = equipped; small = unequipped base")}</span></div>
          <div className={styles.starRule}>{tr("生命：100% / 180% / 324% · 攻击力：100% / 150% / 225%", "HP: 100% / 180% / 324% · AD: 100% / 150% / 225%")}</div>
        </div>

        <div className={styles.statTable}>
          <div className={`${styles.cell} ${styles.corner}`}>{tr("属性", "Stat")}</div>
          {starComparisons.map(({ star }) => <div className={`${styles.cell} ${styles.starHead} ${styles[`star${star}`]}`} key={`head-${star}`}><strong>{star}★</strong><span>HP ×{STAR_SCALING[star].health} · AD ×{STAR_SCALING[star].attackDamage}</span></div>)}

          {rows.map((row) => (
            <div className={styles.statRow} key={row.key}>
              <div className={`${styles.cell} ${styles.statName}`}>{locale === "zh" ? row.zh : row.en}</div>
              {starComparisons.map(({ star, base, equipped }) => {
                const equippedValue = equipped[row.key];
                const baseValue = base[row.key];
                return <div className={`${styles.cell} ${styles.statValue}`} key={`${row.key}-${star}`}><strong>{row.format(equippedValue as number | undefined)}</strong><span>{tr("基础", "Base")} {row.format(baseValue as number | undefined)}</span></div>;
              })}
            </div>
          ))}

          <div className={styles.statRow}>
            <div className={`${styles.cell} ${styles.statName}`}>{tr("法力", "Mana")}</div>
            {starComparisons.map(({ star, base, equipped }) => <div className={`${styles.cell} ${styles.statValue}`} key={`mana-${star}`}><strong>{number(equipped.initialMana, 1)} / {number(equipped.maxMana, 1)}</strong><span>{tr("基础", "Base")} {number(base.initialMana, 1)} / {number(base.maxMana, 1)}</span></div>)}
          </div>
        </div>

        {(mergedBonuses.damageAmpPct || mergedBonuses.durabilityPct || mergedBonuses.omnivampPct) ? (
          <div className={styles.secondaryStats}>
            {mergedBonuses.damageAmpPct ? <span>{tr("伤害增幅", "Damage Amp")} <strong>{percent(mergedBonuses.damageAmpPct, 1)}</strong></span> : null}
            {mergedBonuses.durabilityPct ? <span>{tr("耐久度", "Durability")} <strong>{percent(mergedBonuses.durabilityPct, 1)}</strong></span> : null}
            {mergedBonuses.omnivampPct ? <span>{tr("全能吸血", "Omnivamp")} <strong>{percent(mergedBonuses.omnivampPct, 1)}</strong></span> : null}
          </div>
        ) : null}
      </section>

      {selectedItems.some(Boolean) ? (
        <section className={styles.itemNotes}>
          <div className={styles.sectionTitle}><strong>{tr("所选装备效果", "Selected item effects")}</strong><span>{tr("用于核对动态效果；动态叠层不会直接加进上面的静态面板", "Use this to verify dynamic effects; combat stacking is not added to the static sheet above")}</span></div>
          <div className={styles.noteGrid}>
            {selectedItems.map((item, index) => item ? (
              <article key={`${item.id}-${index}`}>
                <div className={styles.noteHead}><UnitIcon entry={item} size={44} /><div><strong>{nameOf(item)}</strong><span>{secondaryNameOf(item)}</span></div></div>
                <div className={styles.itemBonusLine}>{bonusLabels(selectedItemEffects[index]?.bonuses ?? EMPTY_ITEM_BONUSES, locale).map((label) => <span key={label}>{label}</span>)}</div>
                <p>{descriptionOf(item) || tr("当前 Riot 数据没有可显示的装备说明。", "No displayable Riot item description is available.")}</p>
              </article>
            ) : null)}
          </div>
        </section>
      ) : null}

      <section className={styles.method}>
        <strong>{tr("计算口径", "Calculation rules")}</strong>
        <p>{tr("星级只按 TFT 面板规则放大英雄基础生命与攻击力：2★ 生命 ×1.8、攻击力 ×1.5；3★ 生命 ×3.24、攻击力 ×2.25。护甲、魔抗、攻速、法力、射程等基础值不因星级自动放大。装备的固定生命、护甲、魔抗、法强、攻速、攻击力百分比、初始法力等会计入。鬼索叠层、石像鬼按目标增加双抗、低血触发、击杀触发等战斗中动态效果不会预先计入。", "Star level scales only base HP and AD for the sheet: 2★ HP ×1.8 / AD ×1.5; 3★ HP ×3.24 / AD ×2.25. Armor, MR, AS, mana and range do not automatically scale with stars. Direct item modifiers such as flat HP/resists/AP, AS, AD%, and starting mana are included. Combat-state effects such as Rageblade stacks, Gargoyle per-target resists, low-health triggers and takedown effects are intentionally excluded from the pre-combat sheet.")}</p>
      </section>
    </div>
  );
}
