"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
import styles from "./density-control.module.css";

type UiDensity = "comfortable" | "compact";

const DENSITY_KEY = "tft-cn-companion-ui-density-v1";

function applyDensity(value: UiDensity) {
  document.documentElement.dataset.uiDensity = value;
}

export default function DensityControl() {
  const { tr } = useLocale();
  const [density, setDensity] = useState<UiDensity>("comfortable");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let next: UiDensity = "comfortable";
    try {
      const saved = window.localStorage.getItem(DENSITY_KEY);
      if (saved === "compact" || saved === "comfortable") next = saved;
      else if (window.innerWidth <= 1440 && window.innerHeight <= 900) next = "compact";
    } catch {
      if (window.innerWidth <= 1440 && window.innerHeight <= 900) next = "compact";
    }
    setDensity(next);
    applyDensity(next);
    setReady(true);
  }, []);

  function toggleDensity() {
    const next: UiDensity = density === "compact" ? "comfortable" : "compact";
    setDensity(next);
    applyDensity(next);
    try { window.localStorage.setItem(DENSITY_KEY, next); } catch {}
  }

  const compact = density === "compact";
  const label = compact ? tr("紧凑", "Compact") : tr("舒适", "Comfort");
  const tooltip = compact
    ? tr("当前为紧凑密度；点击切换到舒适模式", "Compact density; switch to comfortable mode")
    : tr("当前为舒适密度；点击切换到紧凑模式", "Comfortable density; switch to compact mode");

  return (
    <button
      type="button"
      className={`${styles.control} ${compact ? styles.compact : ""}`}
      onClick={toggleDensity}
      aria-pressed={compact}
      aria-label={tooltip}
      data-ui-tip={tooltip}
      disabled={!ready}
    >
      <span className={styles.icon} aria-hidden="true">≡</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
