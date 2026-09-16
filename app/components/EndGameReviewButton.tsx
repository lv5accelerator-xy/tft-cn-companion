"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";
import styles from "./desktop-shell.module.css";

export default function EndGameReviewButton() {
  const { tr } = useLocale();
  const title = tr(
    "结束当前对局并生成一次新的赛后复盘快照。只在你主动点击时读取当前 Focus / Builder 状态。",
    "End the current game and create a fresh review snapshot. Current Focus / Builder state is captured only when you click this action.",
  );
  return <Link className={styles.endGameAction} href="/review?capture=1" title={title} aria-label={title}>◎ {tr("结束对局", "End game")}</Link>;
}
