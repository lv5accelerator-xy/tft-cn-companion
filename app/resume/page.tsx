"use client";

import { useEffect } from "react";
import { DESKTOP_LAST_ROUTE_KEY, isRestorableRoute } from "@/lib/desktop-companion";
import { FOCUS_KEY, FOCUS_TRAY_KEY, OPENING_SESSION_KEY } from "@/lib/workspace";
import { useLocale } from "../components/LocaleProvider";
import styles from "./resume.module.css";

function parseObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export default function ResumePage() {
  const { tr } = useLocale();

  useEffect(() => {
    let target = "/";
    try {
      const lastRoute = window.localStorage.getItem(DESKTOP_LAST_ROUTE_KEY);
      if (lastRoute && isRestorableRoute(lastRoute)) {
        target = lastRoute;
      } else {
        const focus = parseObject(window.localStorage.getItem(FOCUS_KEY));
        if (typeof focus?.sourceId === "string" && typeof focus?.id === "string") {
          target = `/focus?source=${encodeURIComponent(focus.sourceId)}&id=${encodeURIComponent(focus.id)}`;
        } else {
          const opening = parseObject(window.localStorage.getItem(OPENING_SESSION_KEY));
          const hasOpening = Array.isArray(opening?.championPicks) && opening.championPicks.length > 0
            || Array.isArray(opening?.componentPicks) && opening.componentPicks.length > 0;
          if (hasOpening) {
            target = "/opening";
          } else {
            const tray = JSON.parse(window.localStorage.getItem(FOCUS_TRAY_KEY) || "[]") as unknown;
            if (Array.isArray(tray) && tray.some((entry) => entry && typeof entry === "object")) target = "/compare";
          }
        }
      }
    } catch {
      target = "/";
    }

    window.location.replace(target);
  }, []);

  return <div className={styles.resume}><div className={styles.logo}>TFT</div><strong>{tr("正在恢复你的副屏工作区…", "Restoring your second-screen workspace…")}</strong><span>{tr("Plan A/B/C、阶段、镜像和开局输入都会继续保留。", "Plan A/B/C, stage, mirror and opening inputs stay intact.")}</span></div>;
}
