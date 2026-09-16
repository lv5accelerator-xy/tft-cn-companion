"use client";

import Link from "next/link";
import { metaComps } from "@/data/meta";
import { FOCUS_KEY, REVIEW_DRAFT_KEY } from "@/lib/workspace";
import { useLocale } from "./LocaleProvider";
import styles from "./desktop-shell.module.css";

export default function EndGameReviewButton() {
  const { tr } = useLocale();
  const title = tr(
    "结束当前对局并生成一次新的赛后复盘快照。只在你主动点击时读取当前 Focus / Builder 状态。",
    "End the current game and create a fresh review snapshot. Current Focus / Builder state is captured only when you click this action.",
  );
  return <Link className={styles.endGameAction} href="/review?capture=1" title={title} aria-label={title} onClick={(event) => {
    try {
      const focus = JSON.parse(window.localStorage.getItem(FOCUS_KEY) || "null");
      const params = new URLSearchParams(window.location.search);
      if (!focus?.sourceId || !focus?.id || (params.has("source") && params.get("source") !== focus.sourceId) || (params.has("id") && params.get("id") !== focus.id)) {
        event.preventDefault();
        window.alert(tr("当前阵容尚未就绪，请先从阵容库选择有效阵容。", "The current comp is not ready. Choose a valid comp from the library first."));
        return;
      }
      const comp = metaComps.find((entry) => entry.sourceId === focus?.sourceId && entry.id === focus?.id);
      const name = comp ? tr(comp.nameZh, comp.name) : tr("当前阵容", "Current comp");
      const stage = comp?.stages[focus?.stageIndex ?? 0]?.stage ?? "";
      const warning = window.localStorage.getItem(REVIEW_DRAFT_KEY) ? tr("\n现有未保存的复盘草稿将被替换。", "\nYour unsaved review draft will be replaced.") : "";
      if (!window.confirm(tr(`${name} · ${stage}\n读取当前 Focus / 最新匹配的 Builder 棋盘并生成复盘快照？${warning}`, `${name} · ${stage}\nCapture the current Focus / latest matching Builder board for review?${warning}`))) event.preventDefault();
    } catch { event.preventDefault(); window.alert(tr("无法读取当前对局，请检查浏览器存储权限后重试。", "Unable to read the current game. Check browser storage permissions and retry.")); }
  }}>◎ {tr("结束对局并复盘", "End game & review")}</Link>;
}
