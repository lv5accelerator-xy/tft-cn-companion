"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
import { FOCUS_KEY, FOCUS_TRAY_KEY, WORKSPACE_EVENT } from "@/lib/workspace";
import styles from "./focus-plan-trail.module.css";

type FocusRef = { sourceId: string; id: string };
type CandidateSlot = FocusRef | null;

function parseRef(value: unknown): FocusRef | null {
  if (!value || typeof value !== "object") return null;
  const ref = value as Partial<FocusRef>;
  return typeof ref.sourceId === "string" && typeof ref.id === "string" ? { sourceId: ref.sourceId, id: ref.id } : null;
}

function readState() {
  try {
    const trayValue = JSON.parse(window.localStorage.getItem(FOCUS_TRAY_KEY) || "[]") as unknown;
    const tray: CandidateSlot[] = Array.isArray(trayValue) ? [0, 1, 2].map((index) => parseRef(trayValue[index])) : [null, null, null];
    const focus = parseRef(JSON.parse(window.localStorage.getItem(FOCUS_KEY) || "null") as unknown);
    return { tray, focus };
  } catch {
    return { tray: [null, null, null] as CandidateSlot[], focus: null };
  }
}

function sameRef(left: FocusRef | null, right: FocusRef | null) {
  return Boolean(left && right && left.sourceId === right.sourceId && left.id === right.id);
}

export default function FocusPlanTrail({ pathname }: { pathname: string }) {
  const { tr } = useLocale();
  const [state, setState] = useState<{ tray: CandidateSlot[]; focus: FocusRef | null }>({ tray: [null, null, null], focus: null });

  useEffect(() => {
    if (!pathname.startsWith("/focus")) return;
    const reload = () => setState(readState());
    reload();
    const timer = window.setInterval(reload, 800);
    window.addEventListener(WORKSPACE_EVENT, reload);
    window.addEventListener("popstate", reload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(WORKSPACE_EVENT, reload);
      window.removeEventListener("popstate", reload);
    };
  }, [pathname]);

  if (!pathname.startsWith("/focus")) return null;

  return (
    <div className={styles.trail} aria-label={tr("候选计划", "Candidate plans")}>
      {state.tray.map((ref, index) => {
        const label = String.fromCharCode(65 + index);
        if (!ref) return <span className={styles.empty} key={label}>PLAN {label}</span>;
        const href = `/focus?source=${encodeURIComponent(ref.sourceId)}&id=${encodeURIComponent(ref.id)}`;
        return <Link className={sameRef(ref, state.focus) ? styles.active : ""} href={href} key={label}>PLAN {label}</Link>;
      })}
      <Link className={styles.compare} href="/compare">{tr("对比", "Compare")}</Link>
    </div>
  );
}
