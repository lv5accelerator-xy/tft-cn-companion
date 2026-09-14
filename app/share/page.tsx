"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import { parseReviewHistory, reviewTagLabel, type ReviewRecord } from "@/lib/review";
import { FOCUS_KEY, REVIEW_HISTORY_KEY } from "@/lib/workspace";
import { notifyToast } from "../components/ToastHost";
import styles from "./share.module.css";

type FocusRef = { sourceId?: string; id?: string };
type ShareMode = "comp" | "review";
const PRODUCT_URL = "https://tft-cn-companion-web.vercel.app/";

function shortUnit(name: string) { return name.length > 11 ? `${name.slice(0, 10)}…` : name; }
function resolveComp(ref: FocusRef | null): UnifiedMetaComp | null {
  if (ref?.sourceId && ref.id) {
    const matched = metaComps.find((comp) => comp.sourceId === ref.sourceId && comp.id === ref.id);
    if (matched) return matched;
  }
  return metaComps[0] ?? null;
}

function drawBoard(ctx: CanvasRenderingContext2D, board: Array<{ unit: string; row: number; col: number }>, x: number, y: number, width: number, height: number) {
  const cellW = width / 7;
  const cellH = height / 4;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#303644";
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 7; col += 1) {
    const px = x + col * cellW; const py = y + row * cellH;
    ctx.fillStyle = (row + col) % 2 === 0 ? "#151923" : "#181d27";
    ctx.fillRect(px + 1, py + 1, cellW - 2, cellH - 2);
    ctx.strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);
  }
  board.forEach((position) => {
    const px = x + position.col * cellW + cellW / 2;
    const py = y + position.row * cellH + cellH / 2;
    ctx.beginPath(); ctx.fillStyle = "#8f80f7"; ctx.arc(px, py - 3, Math.min(cellW, cellH) * .27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f1f3f8"; ctx.font = "700 16px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(shortUnit(position.unit), px, py + cellH * .33);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", .94));
}

export default function SharePage() {
  const [mode, setMode] = useState<ShareMode>("comp");
  const [focus, setFocus] = useState<FocusRef | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);

  useEffect(() => {
    try {
      const rawFocus = window.localStorage.getItem(FOCUS_KEY);
      setFocus(rawFocus ? JSON.parse(rawFocus) as FocusRef : null);
      const rawReviews = window.localStorage.getItem(REVIEW_HISTORY_KEY);
      setReviews(parseReviewHistory(rawReviews ? JSON.parse(rawReviews) : []));
    } catch { setFocus(null); setReviews([]); }
  }, []);

  const comp = useMemo(() => resolveComp(focus), [focus]);
  const review = reviews[0] ?? null;
  const board = mode === "review" && review ? review.finalBoard : comp?.board ?? [];
  const title = mode === "review" && review ? review.plannedNameZh : comp?.nameZh ?? "TFT CN Companion";
  const subtitle = mode === "review" && review ? `#${review.placement} · Lv.${review.level}${review.endStage ? ` · ${review.endStage}` : ""}` : comp ? `${comp.playstyle} · ${comp.source}` : "SET 18 · NA";

  function buildCanvas() {
    if (!comp && !review) return null;
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 675;
    const ctx = canvas.getContext("2d"); if (!ctx) return null;
    const accent = mode === "review" ? "#d7b566" : "#8f80f7";
    ctx.fillStyle = "#0d0f14"; ctx.fillRect(0, 0, 1200, 675);
    ctx.fillStyle = "#14171f"; ctx.fillRect(44, 42, 1112, 591);
    ctx.fillStyle = accent; ctx.fillRect(44, 42, 9, 591);
    ctx.textAlign = "left"; ctx.fillStyle = "#8d94a4"; ctx.font = "700 18px Arial, sans-serif"; ctx.fillText(mode === "review" ? "POST-GAME REVIEW" : "COMP SHARE", 82, 82);
    ctx.fillStyle = "#f1f3f8"; ctx.font = "800 38px Arial, sans-serif"; ctx.fillText(title, 82, 132);
    ctx.fillStyle = "#aeb4c2"; ctx.font = "600 20px Arial, sans-serif"; ctx.fillText(subtitle, 82, 166);
    drawBoard(ctx, board, 82, 205, 720, 340);
    ctx.fillStyle = "#181d27"; ctx.fillRect(835, 205, 280, 340);
    ctx.fillStyle = "#8d94a4"; ctx.font = "700 15px Arial, sans-serif"; ctx.fillText(mode === "review" ? "REVIEW NOTES" : "KEY INFO", 862, 240);
    ctx.fillStyle = "#f1f3f8"; ctx.font = "700 22px Arial, sans-serif";
    if (mode === "review" && review) {
      ctx.fillText(`#${review.placement} PLACE`, 862, 282); ctx.font = "600 16px Arial, sans-serif"; ctx.fillStyle = "#c7cbd5";
      const tags = review.tags.length ? review.tags.map((tag) => reviewTagLabel(tag, "zh")).slice(0, 3) : ["无问题标签"];
      tags.forEach((tag, index) => ctx.fillText(`• ${tag}`, 862, 322 + index * 30));
      if (review.note) { ctx.fillStyle = "#8d94a4"; ctx.font = "500 14px Arial, sans-serif"; ctx.fillText(review.note.length > 46 ? `${review.note.slice(0, 46)}…` : review.note, 862, 444); }
    } else if (comp) {
      ctx.fillText(`Tier ${comp.tier}`, 862, 282); ctx.font = "600 16px Arial, sans-serif"; ctx.fillStyle = "#c7cbd5";
      ctx.fillText(`Patch ${comp.patch}`, 862, 322); ctx.fillText(comp.playstyle, 862, 352); ctx.fillText(comp.coreUnits.slice(0, 3).join(" · "), 862, 400);
      ctx.fillStyle = "#8d94a4"; ctx.font = "500 14px Arial, sans-serif"; ctx.fillText(comp.source, 862, 446);
    }
    ctx.fillStyle = "#8d94a4"; ctx.font = "600 15px Arial, sans-serif"; ctx.fillText("TFT CN Companion · NA 中文副屏助手", 82, 588);
    ctx.fillStyle = "#c7cbd5"; ctx.fillText(PRODUCT_URL, 82, 616);
    return canvas;
  }

  async function downloadPng() {
    const canvas = buildCanvas(); if (!canvas) return;
    const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = mode === "review" ? "tft-review-share.png" : "tft-comp-share.png"; link.click();
    notifyToast("PNG 已生成；只包含当前卡片可见内容。", "success");
  }

  async function sharePng() {
    const canvas = buildCanvas(); if (!canvas) return;
    const blob = await canvasToBlob(canvas); if (!blob) return;
    const file = new File([blob], mode === "review" ? "tft-review-share.png" : "tft-comp-share.png", { type: "image/png" });
    try {
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await navigator.share({ title: "TFT CN Companion", text: mode === "review" ? "我的 TFT 赛后复盘" : "我的 TFT 阵容卡", files: [file] });
        notifyToast("已打开系统图片分享。", "success");
        return;
      }
    } catch { /* user may cancel native share */ }
    await downloadPng();
  }

  async function shareLink() {
    const text = "TFT CN Companion — 美服 TFT 中文副屏助手";
    try {
      if (navigator.share) { await navigator.share({ title: "TFT CN Companion", text, url: PRODUCT_URL }); notifyToast("已打开系统分享。", "success"); return; }
      await navigator.clipboard.writeText(PRODUCT_URL); notifyToast("试用链接已复制。", "success");
    } catch { notifyToast("分享未完成，可直接复制页面底部链接。", "warning"); }
  }

  return <div className={styles.page}>
    <header className={styles.heading}><div><span>V1.6.4 · SHARE POLISH</span><h1>分享中心</h1><p>固定的阵容卡 / 复盘卡模板，可下载 PNG 或直接调用系统图片分享。链接分享现在也带品牌预览图。</p></div><div className={styles.actions}><Link href="/demo">体验 Demo</Link><button onClick={shareLink}>分享试用链接</button><button onClick={sharePng}>分享 PNG</button><button className={styles.primary} onClick={downloadPng}>下载 PNG</button></div></header>
    <section className={styles.modeTabs}><button className={mode === "comp" ? styles.active : ""} onClick={() => setMode("comp")}>阵容分享卡</button><button className={mode === "review" ? styles.active : ""} onClick={() => setMode("review")} disabled={!review}>最近复盘分享卡</button></section>
    <section className={styles.preview}><div className={styles.previewHead}><span>{mode === "review" ? "POST-GAME REVIEW" : "COMP SHARE"}</span><strong>{title}</strong><small>{subtitle}</small></div><div className={styles.previewBody}><div className={styles.board}>{[0,1,2,3].flatMap((row) => [0,1,2,3,4,5,6].map((col) => { const unit = board.find((position) => position.row === row && position.col === col); return <div className={styles.cell} key={`${row}-${col}`}>{unit ? <span>{shortUnit(unit.unit)}</span> : null}</div>; }))}</div><aside>{mode === "review" && review ? <><b>#{review.placement}</b><span>Lv.{review.level}{review.endStage ? ` · ${review.endStage}` : ""}</span><p>{review.tags.length ? review.tags.map((tag) => reviewTagLabel(tag, "zh")).join(" · ") : "无问题标签"}</p><small>{review.note || "本局未填写额外备注"}</small></> : comp ? <><b>Tier {comp.tier}</b><span>Patch {comp.patch}</span><p>{comp.coreUnits.slice(0,4).join(" · ")}</p><small>{comp.source} · {comp.playstyle}</small></> : null}</aside></div><footer>TFT CN Companion · {PRODUCT_URL}</footer></section>
    <div className={styles.privacy}><strong>分享边界</strong><span>PNG 只输出卡片可见内容；不附带账号、邮箱、完整历史或云同步数据。</span></div>
  </div>;
}
