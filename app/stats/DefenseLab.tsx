"use client";

import { useMemo, useState } from "react";
import { useLocale } from "../components/LocaleProvider";
import { projectDefense } from "@/lib/tft-defense-calculator";
import type { ComputedChampionStats, StarLevel } from "@/data/stat-simulator";
import styles from "./defense-lab.module.css";

type Comparison = {
  star: StarLevel;
  base: ComputedChampionStats;
  a: ComputedChampionStats;
  b: ComputedChampionStats;
};

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

function changeValue(current: number | undefined, baseline: number | undefined) {
  if (current === undefined || baseline === undefined || Math.abs(baseline) < 0.000001) return undefined;
  return (current - baseline) / Math.abs(baseline);
}

function manaProgress(stats: ComputedChampionStats) {
  if (stats.initialMana === undefined || stats.maxMana === undefined || stats.maxMana <= 0) return undefined;
  return Math.min(1, Math.max(0, stats.initialMana / stats.maxMana));
}

function insightText(
  label: "output" | "startup" | "physical" | "magic" | "sustain" | "safety",
  stats: ComputedChampionStats,
  base: ComputedChampionStats,
  defense: ReturnType<typeof projectDefense>,
  baseDefense: ReturnType<typeof projectDefense>,
  tr: (zh: string, en: string) => string,
) {
  if (label === "output") {
    const gain = signedChange(stats.dps, base.dps);
    return gain
      ? `${tr("普攻 DPS", "Auto DPS")} ${gain}`
      : tr("固定面板没有直接提高普攻 DPS", "No direct static-sheet Auto DPS gain");
  }
  if (label === "startup") {
    const before = manaProgress(base);
    const after = manaProgress(stats);
    if (before === undefined || after === undefined || Math.abs(after - before) < 0.0001) {
      return tr("固定面板没有直接改变起始法力进度", "No direct change to starting mana progress");
    }
    const points = (after - before) * 100;
    return `${tr("开局法力进度", "Starting mana progress")} ${points >= 0 ? "+" : ""}${number(points, 1)}pp`;
  }
  if (label === "physical") {
    const gain = signedChange(defense.physicalEhp, baseDefense.physicalEhp);
    return gain ? `${tr("物理 EHP", "Physical EHP")} ${gain}` : tr("物理 EHP 无直接变化", "No direct Physical EHP change");
  }
  if (label === "magic") {
    const gain = signedChange(defense.magicEhp, baseDefense.magicEhp);
    return gain ? `${tr("魔法 EHP", "Magic EHP")} ${gain}` : tr("魔法 EHP 无直接变化", "No direct Magic EHP change");
  }
  if (label === "sustain") {
    return stats.omnivampPct > 0
      ? `${tr("固定全能吸血", "Static Omnivamp")} ${percent(stats.omnivampPct, 1)}`
      : tr("没有可解析的固定全能吸血", "No parseable static Omnivamp");
  }
  const gain = signedChange(defense.mixedEhp, baseDefense.mixedEhp);
  return gain
    ? `${tr("当前混伤 EHP", "Current mixed EHP")} ${gain}`
    : tr("当前混伤容错没有直接变化", "No direct change to current mixed-damage safety");
}

export default function DefenseLab({ comparisons, hasLoadoutB }: { comparisons: Comparison[]; hasLoadoutB: boolean }) {
  const { tr } = useLocale();
  const [incomingPhysicalDps, setIncomingPhysicalDps] = useState(400);
  const [incomingMagicDps, setIncomingMagicDps] = useState(400);
  const [insightStar, setInsightStar] = useState<StarLevel>(2);

  const rows = useMemo(() => comparisons.map(({ star, base, a, b }) => ({
    star,
    base: projectDefense(base, incomingPhysicalDps, incomingMagicDps),
    a: projectDefense(a, incomingPhysicalDps, incomingMagicDps),
    b: projectDefense(b, incomingPhysicalDps, incomingMagicDps),
    baseStats: base,
    aStats: a,
    bStats: b,
  })), [comparisons, incomingMagicDps, incomingPhysicalDps]);

  const insightRow = rows.find((row) => row.star === insightStar) ?? rows[0];
  const insightCategories = [
    { key: "output", zh: "输出", en: "Output" },
    { key: "startup", zh: "启动", en: "Startup" },
    { key: "physical", zh: "物理坦度", en: "Physical tank" },
    { key: "magic", zh: "魔法坦度", en: "Magic tank" },
    { key: "sustain", zh: "续航", en: "Sustain" },
    { key: "safety", zh: "容错", en: "Safety" },
  ] as const;

  function setPreset(value: number) {
    setIncomingPhysicalDps(value);
    setIncomingMagicDps(value);
  }

  return (
    <section className={styles.lab}>
      <div className={styles.insight}>
        <div className={styles.insightHeader}>
          <div>
            <strong>{tr("装备解释层", "Loadout Explanation")}</strong>
            <span>{tr("不是黑盒推荐：直接把当前英雄穿上 A/B 后，输出、启动、坦度、续航与容错的变化拆出来。", "Not a black-box recommendation: this explains how A/B changes output, startup, tankiness, sustain and safety on the current champion.")}</span>
          </div>
          <div className={styles.starPicker}>{([1, 2, 3] as StarLevel[]).map((star) => <button key={star} className={insightStar === star ? styles.active : ""} onClick={() => setInsightStar(star)}>{star}★</button>)}</div>
        </div>

        {insightRow ? (
          <div className={styles.insightGrid}>
            {insightCategories.map((category) => (
              <article key={category.key}>
                <span>{tr(category.zh, category.en)}</span>
                <strong>A · {insightText(category.key, insightRow.aStats, insightRow.baseStats, insightRow.a, insightRow.base, tr)}</strong>
                {hasLoadoutB ? <em>B · {insightText(category.key, insightRow.bStats, insightRow.baseStats, insightRow.b, insightRow.base, tr)}</em> : null}
                {hasLoadoutB ? <small>{tr("B 相对 A", "B vs A")} · {category.key === "output" ? (signedChange(insightRow.bStats.dps, insightRow.aStats.dps) ?? "—") : category.key === "startup" ? (() => { const a = manaProgress(insightRow.aStats); const b = manaProgress(insightRow.bStats); return a === undefined || b === undefined ? "—" : `${(b - a) >= 0 ? "+" : ""}${number((b - a) * 100, 1)}pp`; })() : category.key === "physical" ? (signedChange(insightRow.b.physicalEhp, insightRow.a.physicalEhp) ?? "—") : category.key === "magic" ? (signedChange(insightRow.b.magicEhp, insightRow.a.magicEhp) ?? "—") : category.key === "sustain" ? `${(insightRow.bStats.omnivampPct - insightRow.aStats.omnivampPct) >= 0 ? "+" : ""}${number((insightRow.bStats.omnivampPct - insightRow.aStats.omnivampPct) * 100, 1)}pp` : (signedChange(insightRow.b.mixedEhp, insightRow.a.mixedEhp) ?? "—")}</small> : null}
              </article>
            ))}
          </div>
        ) : null}

        <div className={styles.insightNote}>{tr("口径：只解释当前能从英雄面板和 CommunityDragon 固定装备属性稳定计算的变化。鬼索叠层、石像鬼多人增抗、低血触发、护盾/治疗触发等动态效果不会伪装成固定收益；每件装备的固定加成与完整效果继续在下方“所选装备效果”逐件展示。", "Scope: only changes that can be stably computed from the champion sheet and CommunityDragon static item modifiers are explained here. Rageblade stacks, Gargoyle target-count resists, low-health triggers, shields/heals and other dynamic effects are not presented as fixed gains; each selected item's direct bonuses and full effect remain listed in the item-effects section below.")}</div>
      </div>

      <div className={styles.header}>
        <div>
          <strong>{tr("坦度 / EHP 实验室", "Defense / EHP Lab")}</strong>
          <span>{tr("比较 A/B 在 1★ / 2★ / 3★ 下的物理 EHP、魔法 EHP、当前伤害构成 EHP 与预计承伤时间。", "Compare A/B physical EHP, magic EHP, current damage-mix EHP and estimated survival time at 1★ / 2★ / 3★.")}</span>
        </div>
        <div className={styles.controls}>
          <label>{tr("敌方物理 DPS", "Incoming physical DPS")}<input type="number" min={0} max={10000} value={incomingPhysicalDps} onChange={(event) => setIncomingPhysicalDps(Math.max(0, Number(event.target.value) || 0))} /></label>
          <label>{tr("敌方魔法 DPS", "Incoming magic DPS")}<input type="number" min={0} max={10000} value={incomingMagicDps} onChange={(event) => setIncomingMagicDps(Math.max(0, Number(event.target.value) || 0))} /></label>
          <div className={styles.presets}>{[200, 400, 800].map((value) => <button key={value} onClick={() => setPreset(value)}>{value}+{value}</button>)}</div>
        </div>
      </div>

      <div className={styles.cards}>
        {rows.map(({ star, a, b }) => (
          <article className={styles.card} key={`defense-${star}`}>
            <div className={`${styles.star} ${styles[`star${star}`]}`}>
              <strong>{star}★</strong>
              <span>A {number(a.health)} HP · {number(a.armor, 1)} AR · {number(a.magicResist, 1)} MR</span>
            </div>

            <div className={styles.metric}>
              <span>{tr("物理 EHP", "Physical EHP")}</span>
              <strong>A {number(a.physicalEhp)}</strong>
              <small>{tr("物理承伤倍率", "physical taken")} {percent(a.physicalTakenMultiplier, 1)}{a.durabilityPct ? ` · ${tr("耐久度", "Durability")} ${percent(a.durabilityPct, 1)}` : ""}</small>
              {hasLoadoutB ? <em>B {number(b.physicalEhp)}{signedChange(b.physicalEhp, a.physicalEhp) ? ` · ${signedChange(b.physicalEhp, a.physicalEhp)}` : ""}</em> : null}
            </div>

            <div className={styles.metric}>
              <span>{tr("魔法 EHP", "Magic EHP")}</span>
              <strong>A {number(a.magicEhp)}</strong>
              <small>{tr("魔法承伤倍率", "magic taken")} {percent(a.magicTakenMultiplier, 1)}</small>
              {hasLoadoutB ? <em>B {number(b.magicEhp)}{signedChange(b.magicEhp, a.magicEhp) ? ` · ${signedChange(b.magicEhp, a.magicEhp)}` : ""}</em> : null}
            </div>

            <div className={styles.metric}>
              <span>{tr("当前伤害构成 EHP", "Current mix EHP")}</span>
              <strong>A {number(a.mixedEhp)}</strong>
              <small>{number(incomingPhysicalDps)} {tr("物理", "physical")} + {number(incomingMagicDps)} {tr("魔法原始 DPS", "magic raw DPS")}</small>
              {hasLoadoutB ? <em>B {number(b.mixedEhp)}{signedChange(b.mixedEhp, a.mixedEhp) ? ` · ${signedChange(b.mixedEhp, a.mixedEhp)}` : ""}</em> : null}
            </div>

            <div className={`${styles.metric} ${styles.survival}`}>
              <span>{tr("预计承伤时间", "Estimated survival")}</span>
              <strong>A {a.survivalSeconds === undefined ? "—" : `${number(a.survivalSeconds, 2)}s`}</strong>
              <small>{tr("实际承受 DPS", "post-mitigation DPS")} {number(a.postMitigationDps, 1)}</small>
              {hasLoadoutB ? <em>B {b.survivalSeconds === undefined ? "—" : `${number(b.survivalSeconds, 2)}s`}{signedChange(b.survivalSeconds, a.survivalSeconds) ? ` · ${signedChange(b.survivalSeconds, a.survivalSeconds)}` : ""}</em> : null}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.note}>{tr("EHP 表示在当前静态生命、护甲、魔抗与固定耐久度下，击杀该单位所需的抗性前等效伤害。承伤时间按你输入的持续物理/魔法 DPS 估算。动态护盾、治疗、全能吸血、控制、闪避、石像鬼按攻击者数量获得的额外双抗、低血触发、羁绊与战斗中叠层不会预先计入；真实伤害也不包含在此承伤模型中。", "EHP is the pre-mitigation equivalent damage required to deplete the unit's current static HP through its Armor, MR and fixed Durability. Survival time uses the continuous physical/magic DPS entered above. Dynamic shields, healing, omnivamp, crowd control, dodge, Gargoyle target-count resists, low-health triggers, traits and combat stacking are excluded; true damage is not included in this incoming-damage model.")}</div>
    </section>
  );
}
