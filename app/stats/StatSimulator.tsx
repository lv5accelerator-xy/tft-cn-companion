"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import { useLocale } from "../components/LocaleProvider";
import { detailForEntry, loadChampionDetails, type ChampionDetailIndex } from "@/lib/champion-details-client";
import {
  damageTypeLabel,
  estimateAbilityDamageTerm,
  estimateAutoDps,
  projectAbilityTerm,
  scaleLabel,
  termKindLabel,
} from "@/lib/tft-ability-calculator";
import { computeChampionStats, mergeItemBonuses, STAR_SCALING } from "@/lib/tft-stat-calculator";
import {
  EMPTY_ITEM_BONUSES,
  type ComputedChampionStats,
  type ItemEffectRecord,
  type ItemEffectsPayload,
  type ItemStatBonuses,
  type StarLevel,
} from "@/data/stat-simulator";
import type { ChampionAbilityTerm } from "@/data/champion-details";
import type { CatalogEntry, ItemSubtype, TftCatalogPayload } from "@/data/tft";
import styles from "./stat-simulator.module.css";

type ItemFilter = "all" | Exclude<ItemSubtype, "tactician">;
type LoadoutKey = "A" | "B";
type PickerTarget = { loadout: LoadoutKey; slot: number } | null;

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

function signedChange(current: number | undefined, baseline: number | undefined) {
  if (current === undefined || baseline === undefined || Math.abs(baseline) < 0.000001) return null;
  const change = (current - baseline) / Math.abs(baseline);
  return `${change >= 0 ? "+" : ""}${number(change * 100, 1)}%`;
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

function recognizedDamageSummary(
  terms: ChampionAbilityTerm[],
  star: StarLevel,
  stats: ComputedChampionStats,
  targetArmor: number,
  targetMagicResist: number,
) {
  let preMitigation = 0;
  let postMitigation = 0;
  let knownTerms = 0;
  let unknownTerms = 0;

  for (const term of terms) {
    const estimate = estimateAbilityDamageTerm(term, star, stats, targetArmor, targetMagicResist);
    if (!estimate) continue;
    preMitigation += estimate.preMitigation;
    if (estimate.postMitigation === undefined) {
      unknownTerms += 1;
      continue;
    }
    knownTerms += 1;
    postMitigation += estimate.postMitigation;
  }

  return { preMitigation, postMitigation, knownTerms, unknownTerms };
}

export default function StatSimulator({ initialChampionId = "" }: { initialChampionId?: string }) {
  const { locale, tr, nameOf, secondaryNameOf, descriptionOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [details, setDetails] = useState<ChampionDetailIndex | null>(null);
  const [effectRecords, setEffectRecords] = useState<ItemEffectRecord[]>([]);
  const [effectsLoading, setEffectsLoading] = useState(true);
  const [effectsError, setEffectsError] = useState(false);
  const [selectedChampionId, setSelectedChampionId] = useState(initialChampionId);
  const [slotsA, setSlotsA] = useState<Array<string | null>>([null, null, null]);
  const [slotsB, setSlotsB] = useState<Array<string | null>>([null, null, null]);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [itemQuery, setItemQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("completed");
  const [targetArmor, setTargetArmor] = useState(60);
  const [targetMagicResist, setTargetMagicResist] = useState(60);

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
    if (!champions.length) return;
    if (selectedChampionId && champions.some((entry) => entry.id === selectedChampionId)) return;
    setSelectedChampionId(champions[0].id);
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
  const itemForId = (id: string | null) => id ? equippableItems.find((item) => item.id === id) ?? null : null;
  const effectForItem = (item: CatalogEntry | null) => item ? effectIndex.get(normalize(item.id)) ?? effectIndex.get(normalize(item.nameEn)) ?? null : null;

  const selectedItemsA = useMemo(() => slotsA.map(itemForId), [equippableItems, slotsA]);
  const selectedItemsB = useMemo(() => slotsB.map(itemForId), [equippableItems, slotsB]);
  const selectedEffectsA = useMemo(() => selectedItemsA.map(effectForItem), [effectIndex, selectedItemsA]);
  const selectedEffectsB = useMemo(() => selectedItemsB.map(effectForItem), [effectIndex, selectedItemsB]);
  const bonusesA = useMemo(() => mergeItemBonuses(selectedEffectsA.map((record) => record?.bonuses)), [selectedEffectsA]);
  const bonusesB = useMemo(() => mergeItemBonuses(selectedEffectsB.map((record) => record?.bonuses)), [selectedEffectsB]);
  const hasLoadoutB = slotsB.some(Boolean);

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
    a: computeChampionStats(selectedDetail?.stats, star, bonusesA),
    b: computeChampionStats(selectedDetail?.stats, star, bonusesB),
  })), [bonusesA, bonusesB, selectedDetail]);

  const summaryBonusesA = useMemo(() => bonusLabels(bonusesA, locale), [bonusesA, locale]);
  const summaryBonusesB = useMemo(() => bonusLabels(bonusesB, locale), [bonusesB, locale]);
  const abilityTerms = useMemo(() => (selectedDetail?.abilityTerms ?? []).slice(0, 12), [selectedDetail]);

  const targetSummaries = useMemo(() => starComparisons.map(({ star, a, b }) => ({
    star,
    autoA: estimateAutoDps(a, targetArmor),
    autoB: estimateAutoDps(b, targetArmor),
    abilityA: recognizedDamageSummary(abilityTerms, star, a, targetArmor, targetMagicResist),
    abilityB: recognizedDamageSummary(abilityTerms, star, b, targetArmor, targetMagicResist),
  })), [abilityTerms, starComparisons, targetArmor, targetMagicResist]);

  function setItem(target: Exclude<PickerTarget, null>, item: CatalogEntry) {
    const setter = target.loadout === "A" ? setSlotsA : setSlotsB;
    setter((current) => current.map((value, index) => index === target.slot ? item.id : value));
    setPickerTarget(null);
    setItemQuery("");
  }

  function clearSlot(loadout: LoadoutKey, slot: number) {
    const setter = loadout === "A" ? setSlotsA : setSlotsB;
    setter((current) => current.map((value, index) => index === slot ? null : value));
  }

  function renderLoadout(loadout: LoadoutKey, slots: Array<string | null>, items: Array<CatalogEntry | null>) {
    const isA = loadout === "A";
    return (
      <div className={`${styles.loadoutBlock} ${isA ? styles.loadoutA : styles.loadoutB}`}>
        <div className={styles.loadoutHead}>
          <div><strong>{tr(`方案 ${loadout}`, `Loadout ${loadout}`)}</strong><span>{isA ? tr("主方案", "Primary") : tr("对比方案", "Comparison")}</span></div>
          <div className={styles.loadoutActions}>
            {!isA ? <button onClick={() => setSlotsB([...slotsA])}>{tr("复制 A", "Copy A")}</button> : null}
            <button onClick={() => isA ? setSlotsA([null, null, null]) : setSlotsB([null, null, null])} disabled={!slots.some(Boolean)}>{tr("清空", "Clear")}</button>
          </div>
        </div>
        <div className={styles.slots}>
          {slots.map((id, index) => {
            const item = items[index];
            return (
              <div className={`${styles.slot} ${item ? styles.filled : ""}`} key={`${loadout}-${index}`}>
                <button className={styles.slotMain} onClick={() => setPickerTarget({ loadout, slot: index })}>
                  {item ? <><UnitIcon entry={item} size={42} /><span><strong>{nameOf(item)}</strong><small>{secondaryNameOf(item)}</small></span></> : <><span className={styles.plus}>+</span><span><strong>{tr(`装备 ${index + 1}`, `Item ${index + 1}`)}</strong><small>{tr("点击选择", "Choose item")}</small></span></>}
                </button>
                {item ? <button className={styles.remove} onClick={() => clearSlot(loadout, index)} aria-label={tr("移除装备", "Remove item")}>×</button> : null}
              </div>
            );
          })}
        </div>
      </div>
    );
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
          <h1>{tr("英雄装备属性与伤害实验室", "Champion Item & Damage Lab")}</h1>
          <p>{tr("同一英雄同时对比 A/B 两套装备，查看 1★ / 2★ / 3★ 面板、装备增幅、可解析技能系数与目标抗性后的预计伤害。", "Compare two item loadouts on the same champion across 1★ / 2★ / 3★ sheet stats, item gains, parseable ability scaling and estimated post-resist damage.")}</p>
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
            <div><label>{tr("A/B 装备方案", "A/B Item Loadouts")}</label><span>{tr("每套最多 3 件；B 可一键复制 A 后只改一件进行对照", "Up to 3 items each; copy A to B, then change one item for a clean comparison")}</span></div>
          </div>
          <div className={styles.loadoutGrid}>
            {renderLoadout("A", slotsA, selectedItemsA)}
            {renderLoadout("B", slotsB, selectedItemsB)}
          </div>
          <div className={styles.effectStatus}>
            <span className={`${styles.statusDot} ${effectsError ? styles.statusError : effectsLoading ? styles.statusLoading : styles.statusReady}`} />
            {effectsLoading ? tr("正在载入装备固定属性…", "Loading item stat modifiers…") : effectsError ? tr("装备属性源暂不可用；仍可查看英雄星级基础属性。", "Item stat source is unavailable; base star stats still work.") : tr("装备固定属性：CommunityDragon 当前版本", "Static item modifiers: current CommunityDragon data")}
          </div>
        </div>
      </section>

      {pickerTarget ? (
        <section className={styles.picker}>
          <div className={styles.pickerHead}>
            <div><strong>{tr(`方案 ${pickerTarget.loadout} · 选择装备 ${pickerTarget.slot + 1}`, `Loadout ${pickerTarget.loadout} · Choose item ${pickerTarget.slot + 1}`)}</strong><span>{tr("悬停图标仍可查看装备完整效果", "Hover icons for the full item tooltip")}</span></div>
            <button onClick={() => setPickerTarget(null)}>×</button>
          </div>
          <div className={styles.pickerToolbar}>
            <input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder={tr("搜索装备 / 中文 / English", "Search item / English / 中文")} autoFocus />
            <div>{itemFilters.map((filter) => <button key={filter.value} className={itemFilter === filter.value ? styles.active : ""} onClick={() => setItemFilter(filter.value)}>{locale === "zh" ? filter.zh : filter.en}</button>)}</div>
          </div>
          <div className={styles.itemGrid}>
            {filteredItems.map((item) => <button key={item.id} onClick={() => setItem(pickerTarget, item)} title={`${item.nameZh} / ${item.nameEn}`}><UnitIcon entry={item} size={40} /><span>{nameOf(item)}</span></button>)}
          </div>
        </section>
      ) : null}

      <section className={styles.bonusBar}>
        <div><strong>{tr("装备固定加成汇总", "Static item bonus summary")}</strong><span>{tr("只计入能直接改变开战前面板的固定数值", "Only direct pre-combat sheet modifiers are included")}</span></div>
        <div className={styles.loadoutBonuses}>
          <div><b>A</b><div className={styles.bonusChips}>{summaryBonusesA.length ? summaryBonusesA.map((label) => <span key={`a-${label}`}>{label}</span>) : <em>{tr("无固定加成", "No direct bonuses")}</em>}</div></div>
          <div><b>B</b><div className={styles.bonusChips}>{summaryBonusesB.length ? summaryBonusesB.map((label) => <span key={`b-${label}`}>{label}</span>) : <em>{tr("未配置或无固定加成", "Empty or no direct bonuses")}</em>}</div></div>
        </div>
      </section>

      <section className={styles.comparison}>
        <div className={styles.comparisonHead}>
          <div><strong>{tr("各星级装备后属性", "Equipped stats by star level")}</strong><span>{tr("A 大字；下方显示相对裸装增幅；配置 B 后再显示 B 与相对 A 的差异", "A is primary; each cell shows gain vs base. Configure B to add B values and B-vs-A change.")}</span></div>
          <div className={styles.starRule}>{tr("生命：100% / 180% / 324% · 攻击力：100% / 150% / 225%", "HP: 100% / 180% / 324% · AD: 100% / 150% / 225%")}</div>
        </div>

        <div className={styles.statTable}>
          <div className={`${styles.cell} ${styles.corner}`}>{tr("属性", "Stat")}</div>
          {starComparisons.map(({ star }) => <div className={`${styles.cell} ${styles.starHead} ${styles[`star${star}`]}`} key={`head-${star}`}><strong>{star}★</strong><span>HP ×{STAR_SCALING[star].health} · AD ×{STAR_SCALING[star].attackDamage}</span></div>)}

          {rows.map((row) => (
            <div className={styles.statRow} key={row.key}>
              <div className={`${styles.cell} ${styles.statName}`}>{locale === "zh" ? row.zh : row.en}</div>
              {starComparisons.map(({ star, base, a, b }) => {
                const baseValue = base[row.key] as number | undefined;
                const aValue = a[row.key] as number | undefined;
                const bValue = b[row.key] as number | undefined;
                const gainA = signedChange(aValue, baseValue);
                const gainB = signedChange(bValue, aValue);
                return (
                  <div className={`${styles.cell} ${styles.statValue}`} key={`${row.key}-${star}`}>
                    <strong>A {row.format(aValue)}</strong>
                    <span>{tr("基础", "Base")} {row.format(baseValue)}{gainA ? ` · ${gainA}` : ""}</span>
                    {hasLoadoutB ? <em>B {row.format(bValue)}{gainB ? ` · vs A ${gainB}` : ""}</em> : null}
                  </div>
                );
              })}
            </div>
          ))}

          <div className={styles.statRow}>
            <div className={`${styles.cell} ${styles.statName}`}>{tr("法力", "Mana")}</div>
            {starComparisons.map(({ star, base, a, b }) => <div className={`${styles.cell} ${styles.statValue}`} key={`mana-${star}`}><strong>A {number(a.initialMana, 1)} / {number(a.maxMana, 1)}</strong><span>{tr("基础", "Base")} {number(base.initialMana, 1)} / {number(base.maxMana, 1)}</span>{hasLoadoutB ? <em>B {number(b.initialMana, 1)} / {number(b.maxMana, 1)}</em> : null}</div>)}
          </div>
        </div>

        {(bonusesA.damageAmpPct || bonusesA.durabilityPct || bonusesA.omnivampPct || (hasLoadoutB && (bonusesB.damageAmpPct || bonusesB.durabilityPct || bonusesB.omnivampPct))) ? (
          <div className={styles.secondaryStats}>
            {bonusesA.damageAmpPct ? <span>A · {tr("伤害增幅", "Damage Amp")} <strong>{percent(bonusesA.damageAmpPct, 1)}</strong></span> : null}
            {bonusesA.durabilityPct ? <span>A · {tr("耐久度", "Durability")} <strong>{percent(bonusesA.durabilityPct, 1)}</strong></span> : null}
            {bonusesA.omnivampPct ? <span>A · {tr("全能吸血", "Omnivamp")} <strong>{percent(bonusesA.omnivampPct, 1)}</strong></span> : null}
            {hasLoadoutB && bonusesB.damageAmpPct ? <span>B · {tr("伤害增幅", "Damage Amp")} <strong>{percent(bonusesB.damageAmpPct, 1)}</strong></span> : null}
            {hasLoadoutB && bonusesB.durabilityPct ? <span>B · {tr("耐久度", "Durability")} <strong>{percent(bonusesB.durabilityPct, 1)}</strong></span> : null}
            {hasLoadoutB && bonusesB.omnivampPct ? <span>B · {tr("全能吸血", "Omnivamp")} <strong>{percent(bonusesB.omnivampPct, 1)}</strong></span> : null}
          </div>
        ) : null}
      </section>

      <section className={styles.targetLab}>
        <div className={styles.targetHeader}>
          <div><strong>{tr("目标抗性与预计结算伤害", "Target Resists & Estimated Damage")}</strong><span>{tr("输入目标当前有效护甲 / 魔抗；如已被破甲、削弱，请直接填削弱后的数值", "Enter the target's effective Armor / MR. If shred or sunder is active, enter the already-reduced value.")}</span></div>
          <div className={styles.resistControls}>
            <label>{tr("护甲", "Armor")}<input type="number" min={-99} max={500} value={targetArmor} onChange={(event) => setTargetArmor(Number(event.target.value) || 0)} /></label>
            <label>{tr("魔抗", "MR")}<input type="number" min={-99} max={500} value={targetMagicResist} onChange={(event) => setTargetMagicResist(Number(event.target.value) || 0)} /></label>
            <div className={styles.presets}>{[0, 40, 60, 100].map((value) => <button key={value} onClick={() => { setTargetArmor(value); setTargetMagicResist(value); }}>{value}</button>)}</div>
          </div>
        </div>
        <div className={styles.targetCards}>
          {targetSummaries.map(({ star, autoA, autoB, abilityA, abilityB }) => (
            <article key={`target-${star}`} className={styles.targetCard}>
              <div className={`${styles.targetStar} ${styles[`star${star}`]}`}><strong>{star}★</strong><span>{tr("对当前目标", "vs current target")}</span></div>
              <div className={styles.damageMetric}><span>{tr("普攻 DPS（护甲后）", "Auto DPS after Armor")}</span><strong>A {number(autoA, 1)}</strong>{hasLoadoutB ? <em>B {number(autoB, 1)}{signedChange(autoB, autoA) ? ` · ${signedChange(autoB, autoA)}` : ""}</em> : null}</div>
              <div className={styles.damageMetric}><span>{tr("可解析技能伤害合计", "Recognized ability damage")}</span><strong>A {abilityA.knownTerms ? number(abilityA.postMitigation, 1) : "—"}</strong><small>{tr("抗性前", "pre-resist")} {number(abilityA.preMitigation, 1)} · {abilityA.knownTerms} {tr("已识别项", "known terms")}{abilityA.unknownTerms ? ` · ${abilityA.unknownTerms} ${tr("未知类型", "unknown")}` : ""}</small>{hasLoadoutB ? <em>B {abilityB.knownTerms ? number(abilityB.postMitigation, 1) : "—"}{signedChange(abilityB.postMitigation, abilityA.postMitigation) ? ` · ${signedChange(abilityB.postMitigation, abilityA.postMitigation)}` : ""}</em> : null}</div>
            </article>
          ))}
        </div>
        <div className={styles.targetNote}>{tr("预计结算只对 CommunityDragon 中能识别为物理 / 魔法 / 真实伤害的技能变量应用抗性公式；未知伤害类型不会硬算。普攻按物理伤害处理。这里不模拟暴击、羁绊、目标减伤、技能多段次数、持续伤害跳数或战斗中动态叠层。", "Post-resist estimates only apply resistance to CommunityDragon terms whose damage type can be identified as physical / magic / true. Unknown damage types are not forced into a formula. Autos are treated as physical. Crits, traits, target-side damage reduction, hit counts, DoT ticks and combat-state stacking are not simulated.")}</div>
      </section>

      <section className={styles.abilityLab}>
        <div className={styles.abilityHeader}>
          <div className={styles.abilityIdentity}>
            {selectedDetail?.abilityIconUrl ? <Image src={selectedDetail.abilityIconUrl} alt={selectedDetail.abilityName || "Ability"} width={48} height={48} unoptimized /> : <span className={styles.abilityFallback}>✦</span>}
            <div>
              <span>{tr("技能数值实验室", "Ability Scaling Lab")}</span>
              <strong>{selectedDetail?.abilityName || tr("技能资料载入中…", "Loading ability data…")}</strong>
            </div>
          </div>
          <div className={styles.abilityLegend}>{tr("A/B 都按装备后面板换算；伤害类型明确时额外显示当前目标抗性后的估值", "A/B are projected from equipped sheet stats; recognized damage types also show the estimate after current target resists")}</div>
        </div>

        {selectedDetail?.abilityDesc ? <p className={styles.abilityDescription}>{selectedDetail.abilityDesc}</p> : null}

        {abilityTerms.length ? (
          <div className={styles.abilityTable}>
            <div className={`${styles.abilityCell} ${styles.abilityCorner}`}>{tr("技能变量 / 系数", "Ability term / scaling")}</div>
            {starComparisons.map(({ star }) => <div key={`ability-head-${star}`} className={`${styles.abilityCell} ${styles.abilityStarHead} ${styles[`star${star}`]}`}><strong>{star}★</strong><span>A{hasLoadoutB ? " / B" : ""} {tr("换算", "projection")}</span></div>)}

            {abilityTerms.map((term, termIndex) => (
              <div className={styles.abilityRow} key={`${term.key}-${term.scale}-${termIndex}`}>
                <div className={`${styles.abilityCell} ${styles.abilityName}`}>
                  <div><strong>{term.label}</strong><span>{termKindLabel(term.kind, locale)}{term.kind === "damage" ? ` · ${damageTypeLabel(term.damageType, locale)}` : ""}</span></div>
                  <em>{scaleLabel(term.scale, locale)}</em>
                </div>
                {starComparisons.map(({ star, a, b }) => {
                  const projectionA = projectAbilityTerm(term, star, a);
                  const projectionB = projectAbilityTerm(term, star, b);
                  const damageA = estimateAbilityDamageTerm(term, star, a, targetArmor, targetMagicResist);
                  const damageB = estimateAbilityDamageTerm(term, star, b, targetArmor, targetMagicResist);
                  const valueA = projectionA.afterDamageAmp ?? projectionA.contribution ?? projectionA.raw;
                  const valueB = projectionB.afterDamageAmp ?? projectionB.contribution ?? projectionB.raw;
                  const hasProjectionA = projectionA.contribution !== undefined;
                  return (
                    <div className={`${styles.abilityCell} ${styles.abilityValue}`} key={`${term.key}-${star}-${termIndex}`}>
                      <strong>A {number(valueA, 1)}</strong>
                      {hasProjectionA ? <span>{number(projectionA.raw, 1)}% {scaleLabel(term.scale, locale)} → {number(projectionA.contribution, 1)}</span> : <span>{tr("原始技能变量", "raw ability value")} {number(projectionA.raw, 1)}</span>}
                      {damageA?.postMitigation !== undefined ? <em>{damageTypeLabel(damageA.damageType, locale)} · {tr("抗性后", "post-resist")} {number(damageA.postMitigation, 1)}</em> : null}
                      {hasLoadoutB ? <i>B {number(valueB, 1)}{signedChange(valueB, valueA) ? ` · vs A ${signedChange(valueB, valueA)}` : ""}{damageB?.postMitigation !== undefined ? ` · ${tr("抗性后", "post")} ${number(damageB.postMitigation, 1)}` : ""}</i> : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.abilityEmpty}>{tr("该技能当前没有可稳定解析为 1★ / 2★ / 3★ 的数值变量；保留上方官方技能说明，不猜测数值。", "This ability currently exposes no values that can be safely parsed into 1★ / 2★ / 3★ terms. The official description is kept above without guessing numbers.")}</div>
        )}

        <div className={styles.abilityNote}>{tr("说明：这里显示的是 CommunityDragon 工具提示中可识别的技能变量、面板系数和抗性估值，不保证等于最终战斗伤害。无法确认伤害类型、目标数量、技能段数、暴击规则、羁绊和动态触发时，会保留为信息而不会硬算。", "This shows parseable CommunityDragon tooltip variables, sheet-stat coefficients and resistance estimates, not guaranteed final combat damage. When damage type, target count, hit count, crit rules, traits or dynamic triggers cannot be established, the data is shown without forcing a final number.")}</div>
      </section>

      {(selectedItemsA.some(Boolean) || selectedItemsB.some(Boolean)) ? (
        <section className={styles.itemNotes}>
          <div className={styles.sectionTitle}><strong>{tr("A/B 所选装备效果", "Selected A/B item effects")}</strong><span>{tr("用于核对动态效果；动态叠层不会直接加进上面的静态面板", "Use this to verify dynamic effects; combat stacking is not added to the static sheet above")}</span></div>
          <div className={styles.noteGrid}>
            {(["A", "B"] as LoadoutKey[]).flatMap((loadout) => {
              const items = loadout === "A" ? selectedItemsA : selectedItemsB;
              const effects = loadout === "A" ? selectedEffectsA : selectedEffectsB;
              return items.map((item, index) => item ? (
                <article key={`${loadout}-${item.id}-${index}`}>
                  <div className={styles.noteHead}><span className={styles.loadoutTag}>{loadout}</span><UnitIcon entry={item} size={44} /><div><strong>{nameOf(item)}</strong><span>{secondaryNameOf(item)}</span></div></div>
                  <div className={styles.itemBonusLine}>{bonusLabels(effects[index]?.bonuses ?? EMPTY_ITEM_BONUSES, locale).map((label) => <span key={`${loadout}-${label}`}>{label}</span>)}</div>
                  <p>{descriptionOf(item) || tr("当前 Riot 数据没有可显示的装备说明。", "No displayable Riot item description is available.")}</p>
                </article>
              ) : null);
            })}
          </div>
        </section>
      ) : null}

      <section className={styles.method}>
        <strong>{tr("计算口径", "Calculation rules")}</strong>
        <p>{tr("星级只按 TFT 面板规则放大英雄基础生命与攻击力：2★ 生命 ×1.8、攻击力 ×1.5；3★ 生命 ×3.24、攻击力 ×2.25。装备固定面板加成会计入 A/B。物理伤害按护甲、魔法伤害按魔抗使用标准抗性倍率 100/(100+抗性)；负抗性使用对应的增伤公式。技能只有在 CommunityDragon 明确暴露出可解析变量和伤害类型时才给出抗性后估值。鬼索叠层、石像鬼按攻击者数量增抗、低血触发、暴击、羁绊、破甲过程、目标减伤和特殊技能逻辑仍不会被预先假设。", "Star level scales only base HP and AD for the sheet: 2★ HP ×1.8 / AD ×1.5; 3★ HP ×3.24 / AD ×2.25. Direct item sheet modifiers feed both A and B. Physical damage uses Armor and magic damage uses MR with the standard 100/(100+resistance) multiplier; negative resistance uses the corresponding amplification formula. Post-resist ability estimates are only shown when CommunityDragon exposes a parseable term and identifiable damage type. Rageblade stacks, Gargoyle target-count resists, low-health triggers, crits, traits, shred sequencing, target-side reduction and special spell logic remain excluded.")}</p>
      </section>
    </div>
  );
}
