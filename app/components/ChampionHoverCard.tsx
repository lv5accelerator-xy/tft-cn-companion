"use client";

import Image from "next/image";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogEntry } from "@/data/tft";
import type { ChampionDetail } from "@/data/champion-details";
import { detailForEntry, loadChampionDetails } from "@/lib/champion-details-client";
import { useLocale } from "./LocaleProvider";
import styles from "./champion-hover-card.module.css";

type Position = { top: number; left: number; side: "left" | "right" };

function formatNumber(value: number | undefined, suffix = "") {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}${suffix}`;
}

function costClass(cost: number | undefined) {
  if (!cost) return styles.cost1;
  return styles[`cost${Math.min(Math.max(cost, 1), 5)}`] ?? styles.cost1;
}

export default function ChampionHoverCard({ entry, children }: { entry: CatalogEntry; children: ReactNode }) {
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ChampionDetail | null>(null);
  const [position, setPosition] = useState<Position>({ top: 12, left: 12, side: "right" });

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const node = triggerRef.current;
    if (!node || typeof window === "undefined") return;
    const rect = node.getBoundingClientRect();
    const width = Math.min(410, Math.max(300, window.innerWidth - 24));
    const estimatedHeight = Math.min(560, Math.max(380, window.innerHeight - 24));
    const gap = 12;
    const canRight = rect.right + gap + width <= window.innerWidth - 10;
    const left = canRight
      ? rect.right + gap
      : Math.max(10, rect.left - width - gap);
    const top = Math.max(10, Math.min(rect.top - 24, window.innerHeight - estimatedHeight - 10));
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
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    loadChampionDetails(locale)
      .then((index) => {
        if (!cancelled) setDetail(detailForEntry(index, entry));
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entry, locale, open]);

  const statRows = useMemo(() => {
    const stats = detail?.stats;
    if (!stats) return [];
    const mana = stats.mana !== undefined
      ? `${formatNumber(stats.initialMana ?? 0)} / ${formatNumber(stats.mana)}`
      : "—";
    return [
      [tr("生命", "Health"), formatNumber(stats.hp)],
      [tr("法力", "Mana"), mana],
      [tr("攻击力", "Attack Damage"), formatNumber(stats.damage)],
      [tr("攻速", "Attack Speed"), formatNumber(stats.attackSpeed)],
      [tr("护甲", "Armor"), formatNumber(stats.armor)],
      [tr("魔抗", "Magic Resist"), formatNumber(stats.magicResist)],
      [tr("射程", "Range"), formatNumber(stats.range)],
      [tr("暴击", "Crit"), stats.critChance !== undefined ? formatNumber(stats.critChance * 100, "%") : "—"],
    ];
  }, [detail, tr]);

  const tooltip = open && mounted ? createPortal(
    <aside
      className={`${styles.card} ${styles[position.side]}`}
      style={{ top: position.top, left: position.left }}
      role="tooltip"
    >
      <div className={styles.header}>
        <div className={`${styles.portrait} ${costClass(detail?.cost ?? entry.tier)}`}>
          {entry.imageUrl ? (
            <Image src={entry.imageUrl} alt={entry.nameEn} width={62} height={62} unoptimized />
          ) : (
            <span>{nameOf(entry).slice(0, 1)}</span>
          )}
        </div>
        <div className={styles.identity}>
          <div className={styles.nameLine}>
            <h3>{nameOf(entry)}</h3>
            <span className={`${styles.costBadge} ${costClass(detail?.cost ?? entry.tier)}`}>{detail?.cost ?? entry.tier ?? "—"} {tr("费", "Cost")}</span>
          </div>
          <p>{secondaryNameOf(entry)}</p>
          <div className={styles.traits}>
            {(detail?.traits ?? []).map((trait) => <span key={trait}>{trait}</span>)}
            {!loading && detail && detail.traits.length === 0 ? <span>{tr("无羁绊资料", "No trait data")}</span> : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>{tr("正在载入当前版本英雄资料…", "Loading current-patch champion details…")}</div>
      ) : detail ? (
        <>
          <div className={styles.stats}>
            {statRows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className={styles.ability}>
            <div className={styles.abilityHead}>
              {detail.abilityIconUrl ? (
                <Image src={detail.abilityIconUrl} alt={detail.abilityName || "Ability"} width={38} height={38} unoptimized />
              ) : <span className={styles.abilityFallback}>✦</span>}
              <div>
                <span>{tr("技能", "Ability")}</span>
                <strong>{detail.abilityName || tr("当前数据未提供技能名", "Ability name unavailable")}</strong>
              </div>
            </div>
            {detail.abilityDesc ? <p>{detail.abilityDesc}</p> : <p className={styles.muted}>{tr("当前版本数据没有可显示的技能说明。", "No displayable ability description is available for this patch.")}</p>}
          </div>

          <div className={styles.footer}>{tr("当前 Set 18 静态资料", "Current Set 18 static data")} · CommunityDragon</div>
        </>
      ) : (
        <div className={styles.loading}>{tr("未找到该英雄的当前版本详细资料。", "No current-patch detail record was found for this champion.")}</div>
      )}
    </aside>,
    document.body,
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.trigger}
        onMouseEnter={() => {
          updatePosition();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
