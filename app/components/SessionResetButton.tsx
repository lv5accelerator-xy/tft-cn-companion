"use client";

import { useLocale } from "./LocaleProvider";
import styles from "./desktop-shell.module.css";
import {
  BUILDER_KEY,
  FOCUS_COMP_STATES_KEY,
  FOCUS_KEY,
  FOCUS_STAGE_OVERRIDES_KEY,
  FOCUS_TRAY_KEY,
  OPENING_SESSION_KEY,
  REVIEW_DRAFT_KEY,
  markWorkspaceChanged,
} from "@/lib/workspace";

const RESET_KEYS = [
  BUILDER_KEY,
  FOCUS_KEY,
  FOCUS_TRAY_KEY,
  FOCUS_STAGE_OVERRIDES_KEY,
  FOCUS_COMP_STATES_KEY,
  OPENING_SESSION_KEY,
  REVIEW_DRAFT_KEY,
];

export default function SessionResetButton() {
  const { tr } = useLocale();

  function resetSession() {
    try {
      RESET_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // The page reload below still clears in-memory selections for this session.
    }
    markWorkspaceChanged();
    window.location.replace("/");
  }

  const label = tr("一键还原", "Reset");
  const title = tr(
    "还原到未选择状态：清除当前开局、候选、对局、Builder 和未保存复盘；保留收藏、已保存复盘、个人数据与偏好。",
    "Reset current selections: clears opening, candidates, Focus, Builder and unsaved review draft while keeping favorites, saved reviews, personal data and preferences.",
  );

  return <button className={styles.language} onClick={resetSession} title={title} aria-label={title}>↺ {label}</button>;
}
