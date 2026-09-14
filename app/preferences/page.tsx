"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PREFERENCES_KEY, defaultPreferences, parsePreferences, type UserPreferences } from "@/lib/preferences";
import { useLocale } from "../components/LocaleProvider";
import styles from "./preferences.module.css";

export default function PreferencesPage() {
  const { tr } = useLocale();
  const [prefs, setPrefs] = useState<UserPreferences>({ ...defaultPreferences });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFERENCES_KEY);
      setPrefs(parsePreferences(raw ? JSON.parse(raw) : null));
    } catch {
      setPrefs({ ...defaultPreferences });
    }
  }, []);

  function update(patch: Partial<UserPreferences>) {
    setPrefs((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  function save() {
    const next = { ...prefs, updatedAt: Date.now() };
    setPrefs(next);
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  function reset() {
    setPrefs({ ...defaultPreferences });
    try { window.localStorage.removeItem(PREFERENCES_KEY); } catch {}
    setSaved(true);
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span>V1.5.1 · PERSONALIZATION</span><h1>{tr("个人偏好", "Personalization")}</h1><p>{tr("这些设置只影响推荐排序和默认体验，不改变攻略来源数据。当前偏好保存在本机，不自动公开。", "These settings affect recommendation ordering and defaults only; they do not alter source data. Preferences stay on this device and are not public.")}</p></div>
        <div><Link href="/insights">{tr("个人洞察", "Insights")}</Link><Link href="/coach">{tr("智能指导", "Smart Guidance")}</Link></div>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHead}><span>01</span><div><h2>{tr("常用节奏", "Preferred tempo")}</h2><p>{tr("用于同分候选的个性化排序。", "Used as a tie-breaker for personalized ranking.")}</p></div></div>
          <div className={styles.options}>{[
            ["auto", tr("自动", "Auto")],
            ["fast8", "Fast 8"],
            ["reroll", "Reroll"],
            ["flex", "Flex"],
          ].map(([value, label]) => <button key={value} className={prefs.tempo === value ? styles.active : ""} onClick={() => update({ tempo: value as UserPreferences["tempo"] })}>{label}</button>)}</div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}><span>02</span><div><h2>{tr("风险偏好", "Risk preference")}</h2><p>{tr("不会替你做决定，只影响解释和排序倾向。", "Does not make decisions for you; it only changes explanation and ranking bias.")}</p></div></div>
          <div className={styles.options}>{[
            ["safe", tr("稳健", "Safe")],
            ["balanced", tr("平衡", "Balanced")],
            ["ceiling", tr("追上限", "Ceiling")],
          ].map(([value, label]) => <button key={value} className={prefs.risk === value ? styles.active : ""} onClick={() => update({ risk: value as UserPreferences["risk"] })}>{label}</button>)}</div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}><span>03</span><div><h2>{tr("练习目标", "Learning goal")}</h2><p>{tr("用于推荐理由中的侧重点。", "Changes what the guidance emphasizes.")}</p></div></div>
          <div className={styles.options}>{[
            ["consistency", tr("稳定执行", "Consistency")],
            ["top4", "Top 4"],
            ["experiment", tr("练新阵容", "Experiment")],
          ].map(([value, label]) => <button key={value} className={prefs.goal === value ? styles.active : ""} onClick={() => update({ goal: value as UserPreferences["goal"] })}>{label}</button>)}</div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}><span>04</span><div><h2>{tr("开局英雄范围", "Opening unit range")}</h2><p>{tr("决定你默认更想看到哪些费用的开局英雄。", "Controls which unit costs you prefer to see by default in opening workflows.")}</p></div></div>
          <div className={styles.options}><button className={prefs.openingCosts === "low" ? styles.active : ""} onClick={() => update({ openingCosts: "low" })}>1–3 Cost</button><button className={prefs.openingCosts === "all" ? styles.active : ""} onClick={() => update({ openingCosts: "all" })}>{tr("全部", "All costs")}</button></div>
        </article>
      </section>

      <section className={styles.toggles}>
        <label><input type="checkbox" checked={prefs.prioritizeFamiliar} onChange={(event) => update({ prioritizeFamiliar: event.target.checked })} /><span><strong>{tr("优先熟悉阵容", "Prioritize familiar comps")}</strong><small>{tr("如果你已有复盘样本，Smart Guidance 会把熟悉度作为轻量加分，不会覆盖开局资源匹配。", "If review samples exist, Smart Guidance uses familiarity as a small bonus without overriding opening-resource fit.")}</small></span></label>
        <label><input type="checkbox" checked={prefs.preferSimpleExecution} onChange={(event) => update({ preferSimpleExecution: event.target.checked })} /><span><strong>{tr("偏好简单执行", "Prefer simpler execution")}</strong><small>{tr("困难阵容在同等资源下会被轻微降权。", "Hard comps receive a small penalty when resource fit is otherwise similar.")}</small></span></label>
      </section>

      <section className={styles.saveBar}><div><strong>{saved ? tr("已保存到本机", "Saved on this device") : tr("有未保存的偏好", "Unsaved preferences")}</strong><span>{tr("后续可以随时修改或重置。", "You can change or reset these at any time.")}</span></div><div><button onClick={reset}>{tr("恢复默认", "Reset")}</button><button className={styles.primary} onClick={save}>{tr("保存偏好", "Save preferences")}</button></div></section>
    </div>
  );
}
