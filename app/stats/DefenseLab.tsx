"use client";

import { useMemo, useState } from "react";
import { useLocale } from "../components/LocaleProvider";
import { projectDefense } from "@/lib/tft-defense-calculator";
import type { ComputedChampionStats, StarLevel } from "@/data/stat-simulator";
import styles from "./defense-lab.module.css";

type Comparison = {
  star: StarLevel;
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

export default function DefenseLab({ comparisons, hasLoadoutB }: { comparisons: Comparison[]; hasLoadoutB: boolean }) {
  const { tr } = useLocale();
  const [incomingPhysicalDps, setIncomingPhysicalDps] = useState(400);
  const [incomingMagicDps, setIncomingMagicDps] = useState(400);

  const rows = useMemo(() => comparisons.map(({ star, a, b }) => ({
    star,
    a: projectDefense(a, incomingPhysicalDps, incomingMagicDps),
    b: projectDefense(b, incomingPhysicalDps, incomingMagicDps),
  })), [comparisons, incomingMagicDps, incomingPhysicalDps]);

  function setPreset(value: number) {
    setIncomingPhysicalDps(value);
    setIncomingMagicDps(value);
  }

  return (
    <section className={styles.lab}>
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
