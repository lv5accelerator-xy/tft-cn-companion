"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { useLocale } from "../components/LocaleProvider";
import type { OriginalGuideImage } from "@/data/tuding-originals";
import styles from "./original-guide.module.css";

export default function OriginalGuide({ guide, name }: { guide?: OriginalGuideImage; name: string }) {
  const { tr } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [opened, setOpened] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!guide) return <span className={styles.pending}>{tr("一图流原图待补充", "Original infographic pending")}</span>;

  function open() {
    setOpened(true);
    setZoomed(false);
    setFailed(false);
    dialog.current?.showModal();
  }

  return <>
    <button className={styles.button} onClick={open}>{tr("查看一图流原图", "View original infographic")}</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={() => setOpened(false)}>
      <header className={styles.header}>
        <strong id={titleId}>{name} · {tr("一图流原图", "Original infographic")}</strong>
        <button className={styles.button} onClick={() => dialog.current?.close()} autoFocus>{tr("关闭", "Close")}</button>
      </header>
      <div className={styles.toolbar}>
        <span>{tr("兔顶之弈 · 图示版本", "Tuding · Image patch")} {guide.imagePatch ?? guide.patch} · {guide.publishedAt} {guide.imagePatch && guide.imagePatch !== guide.patch ? tr(`（${guide.patch}文章配图）`, `(${guide.patch} article)`) : ""}</span>
        <button className={styles.button} disabled={failed} onClick={() => setZoomed((value) => !value)}>{zoomed ? tr("适应屏幕", "Fit to screen") : tr("放大查看", "Zoom in")}</button>
        <a href={guide.url} target="_blank" rel="noreferrer">{tr("新窗口查看原图", "Open original in new tab")}</a>
        <a href={guide.articleUrl} target="_blank" rel="noreferrer">{tr("图片来源", "Image source")}</a>
      </div>
      {opened ? <div className={styles.viewport} tabIndex={0} aria-label={tr("原图查看区域", "Infographic viewer")}>
        {failed ? <p role="status">{tr("原图暂时加载失败，请尝试新窗口查看原图或打开图片来源。", "Image failed to load. Try opening the original or its source.")}</p> : <Image unoptimized src={guide.url} alt={`${name} · ${tr("兔顶之弈一图流原图", "Tuding original infographic")}`} width={guide.width} height={guide.height} referrerPolicy="no-referrer" onError={() => setFailed(true)} style={zoomed ? { width: guide.width * 2 } : undefined} className={zoomed ? styles.zoomed : styles.image} />}
      </div> : null}
    </dialog>
  </>;
}
