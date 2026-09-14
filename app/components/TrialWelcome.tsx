"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
import styles from "./trial-welcome.module.css";

const TRIAL_DISMISSED_KEY = "tft-cn-companion-trial-dismissed-v1";

export default function TrialWelcome() {
  const { tr } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(TRIAL_DISMISSED_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try { window.localStorage.setItem(TRIAL_DISMISSED_KEY, "1"); } catch {}
  }

  if (!visible) return null;

  return (
    <section className={styles.banner} aria-label={tr("新用户快速体验", "New user quick trial")}>
      <div className={styles.copy}>
        <span>V1.6.3 · QUICK TRIAL</span>
        <strong>{tr("第一次来？2–3 分钟看完一整局工作流", "New here? See the full workflow in 2–3 minutes")}</strong>
        <p>{tr("开局推荐 → A/B/C 对比 → 对局副屏 → 赛后复盘 → 个人趋势。Demo 不会改动你的收藏、候选或复盘数据。", "Opening recommendation → A/B/C compare → second-screen focus → post-game review → personal trends. The demo does not change your data.")}</p>
      </div>
      <div className={styles.flow}><b>OPENING</b><i>→</i><b>COMPARE</b><i>→</i><b>FOCUS</b><i>→</i><b>REVIEW</b><i>→</i><b>INSIGHTS</b></div>
      <div className={styles.actions}><Link href="/demo">{tr("开始 Demo", "Start demo")}</Link><button type="button" onClick={dismiss}>{tr("我知道了", "Dismiss")}</button></div>
    </section>
  );
}
