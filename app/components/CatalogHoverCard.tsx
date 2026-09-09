"use client";

import Image from "next/image";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogEntry, ItemSubtype } from "@/data/tft";
import type { ChampionDetailIndex } from "@/lib/champion-details-client";
import { loadChampionDetails } from "@/lib/champion-details-client";
import { useLocale } from "./LocaleProvider";
import styles from "./catalog-hover-card.module.css";

type Position = { top: number; left: number; side: "left" | "right" };

const subtypeNames: Record<ItemSubtype, { zh: string; en: string }> = {
  component: { zh: "基础散件", en: "Component" },
  completed: { zh: "成装", en: "Completed Item" },
  emblem: { zh: "转职纹章", en: "Emblem" },
  artifact: { zh: "神器装备", en: "Artifact" },
  tactician: { zh: "战术家装备", en: "Tactician Item" },
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’']/g, "").replace(/\s+/g, " ");
}

function typeLabel(entry: CatalogEntry, locale: "zh" | "en") {
  if (entry.type === "装备" && entry.subtype) {
    const item = subtypeNames[entry.subtype];
    return locale === "zh" ? item.zh : item.en;
  }
  if (entry.type === "羁绊") return locale === "zh" ? "羁绊" : "Trait";
  if (entry.type === "强化") return locale === "zh" ? "强化符文" : "Augment";
  return entry.type;
}

export default function CatalogHoverCard({ entry, children }: { entry: CatalogEntry; children: ReactNode }) {
  const { locale, tr, nameOf, secondaryNameOf, descriptionOf } = useLocale();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 12, left: 12, side: "right" });
  const [championIndex, setChampionIndex] = useState<ChampionDetailIndex | null>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const node = triggerRef.current;
    if (!node || typeof window === "undefined") return;
    const rect = node.getBoundingClientRect();
    const width = Math.min(380, Math.max(290, window.innerWidth - 24));
    const estimatedHeight = Math.min(500, Math.max(300, window.innerHeight - 24));
    const gap = 12;
    const canRight = rect.right + gap + width <= window.innerWidth - 10;
    const left = canRight ? rect.right + gap : Math.max(10, rect.left - width - gap);
    const top = Math.max(10, Math.min(rect.top - 18, window.innerHeight - estimatedHeight - 10));
    setPosition({ top, left, side: canRight ? "right" : "left" });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open || entry.type !== "羁绊") return;
    let cancelled = false;
    loadChampionDetails(locale)
      .then((index) => { if (!cancelled) setChampionIndex(index); })
      .catch(() => { if (!cancelled) setChampionIndex(null); });
    return () => { cancelled = true; };
  }, [entry.type, locale, open]);

  const relatedChampions = useMemo(() => {
    if (entry.type !== "羁绊" || !championIndex) return [];
    const wanted = normalize(locale === "zh" ? entry.nameZh : entry.nameEn);
    return Array.from(championIndex.byId.values())
      .filter((champion) => champion.traits.some((trait) => normalize(trait) === wanted))
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }, [championIndex, entry, locale]);

  const detail = descriptionOf(entry);
  const thresholds = entry.thresholds ?? [];
  const tierLabel = entry.type === "强化" && entry.tier
    ? `${tr("等级", "Tier")} ${entry.tier}`
    : null;

  const tooltip = open && mounted ? createPortal(
    <aside className={`${styles.card} ${styles[position.side]}`} style={{ top: position.top, left: position.left }} role="tooltip">
      <div className={styles.header}>
        <div className={styles.icon}>
          {entry.imageUrl ? <Image src={entry.imageUrl} alt={entry.nameEn} width={54} height={54} unoptimized /> : <span>{nameOf(entry).slice(0, 1)}</span>}
        </div>
        <div className={styles.identity}>
          <div className={styles.badges}><span>{typeLabel(entry, locale)}</span>{tierLabel ? <span>{tierLabel}</span> : null}</div>
          <h3>{nameOf(entry)}</h3>
          <p>{secondaryNameOf(entry)}</p>
        </div>
      </div>

      {thresholds.length > 0 && (
        <div className={styles.thresholds}>
          <span className={styles.sectionLabel}>{tr("触发档位", "Breakpoints")}</span>
          <div>{thresholds.map((value) => <strong key={value}>{value}</strong>)}</div>
        </div>
      )}

      <div className={styles.effect}>
        <span className={styles.sectionLabel}>{entry.type === "装备" ? tr("装备效果", "Effect") : entry.type === "羁绊" ? tr("羁绊效果", "Trait effect") : tr("强化效果", "Augment effect")}</span>
        <p>{detail || tr("当前版本数据没有可显示的说明。", "No displayable description is available for the current patch.")}</p>
      </div>

      {entry.type === "羁绊" && relatedChampions.length > 0 && (
        <div className={styles.related}>
          <span className={styles.sectionLabel}>{tr("相关英雄", "Champions")}</span>
          <div className={styles.relatedGrid}>
            {relatedChampions.slice(0, 12).map((champion) => <span key={champion.id}><b>{champion.cost}</b>{champion.name}</span>)}
          </div>
        </div>
      )}

      {entry.type === "装备" && (entry.aliases?.length ?? 0) > 0 && (
        <div className={styles.aliases}><span className={styles.sectionLabel}>{tr("旧名 / 别名", "Legacy / aliases")}</span><p>{entry.aliases?.join(" · ")}</p></div>
      )}

      <div className={styles.footer}>Set 18 · {tr("当前版本静态资料", "Current-patch static data")}</div>
    </aside>,
    document.body,
  ) : null;

  return (
    <>
      <span ref={triggerRef} className={styles.trigger} onMouseEnter={() => { updatePosition(); setOpen(true); }} onMouseLeave={() => setOpen(false)}>{children}</span>
      {tooltip}
    </>
  );
}
