"use client";

import Image from "next/image";
import { KeyboardEvent, useMemo } from "react";
import UnitIcon from "./UnitIcon";
import { useLocale } from "./LocaleProvider";
import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry } from "@/data/tft";
import type { TacticalRole } from "@/lib/tactical-board";
import styles from "./board-preview.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function roleGlyph(role: TacticalRole) {
  if (role === "CARRY") return "C";
  if (role === "TANK") return "T";
  if (role === "SECONDARY") return "2C";
  return "F";
}

export default function BoardPreview({
  positions,
  champions,
  items = [],
  rolesByName = {},
  itemsByName = {},
  compact = false,
  selectedUnit = "",
  onUnitClick,
}: {
  positions: BoardPosition[];
  champions: CatalogEntry[];
  items?: CatalogEntry[];
  rolesByName?: Record<string, TacticalRole>;
  itemsByName?: Record<string, string[]>;
  compact?: boolean;
  selectedUnit?: string;
  onUnitClick?: (unit: CatalogEntry) => void;
}) {
  const { tr, nameOf } = useLocale();
  const byName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((unit) => {
      [unit.id, unit.nameEn, unit.nameZh, ...(unit.aliases ?? [])].forEach((name) => {
        if (name) map.set(normalize(name), unit);
      });
    });
    return map;
  }, [champions]);

  const itemLookup = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    items.forEach((item) => {
      [item.id, item.nameEn, item.nameZh, ...(item.aliases ?? [])].forEach((name) => {
        if (name) map.set(normalize(name), item);
      });
    });
    return map;
  }, [items]);

  const roleLookup = useMemo(() => {
    const map = new Map<string, TacticalRole>();
    Object.entries(rolesByName).forEach(([name, role]) => map.set(normalize(name), role));
    return map;
  }, [rolesByName]);

  const assignmentLookup = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.entries(itemsByName).forEach(([name, assigned]) => map.set(normalize(name), assigned));
    return map;
  }, [itemsByName]);

  const cells = useMemo(() => {
    const map = new Map<string, BoardPosition>();
    positions.forEach((position) => map.set(`${position.row}-${position.col}`, position));
    return map;
  }, [positions]);

  const roleLabel = (role: TacticalRole) => {
    if (role === "CARRY") return tr("主 C", "Carry");
    if (role === "TANK") return tr("主坦", "Tank");
    if (role === "SECONDARY") return tr("副 C", "Secondary carry");
    return "Flex";
  };

  const activate = (event: KeyboardEvent<HTMLDivElement>, champion: CatalogEntry) => {
    if (!onUnitClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onUnitClick(champion);
  };

  return (
    <div className={`${styles.board} ${compact ? styles.compact : ""}`} aria-label={tr("参考站位", "Positioning preview")}>
      {[0, 1, 2, 3].map((row) => (
        <div className={`${styles.row} ${row % 2 ? styles.shifted : ""}`} key={row}>
          {[0, 1, 2, 3, 4, 5, 6].map((col) => {
            const position = cells.get(`${row}-${col}`);
            const champion = position ? byName.get(normalize(position.unit)) : undefined;
            const role = champion && position
              ? roleLookup.get(normalize(champion.nameEn)) ?? roleLookup.get(normalize(champion.nameZh)) ?? roleLookup.get(normalize(position.unit))
              : undefined;
            const assignedNames = champion && position
              ? assignmentLookup.get(normalize(champion.nameEn)) ?? assignmentLookup.get(normalize(champion.nameZh)) ?? assignmentLookup.get(normalize(position.unit)) ?? []
              : [];
            const assignedItems = assignedNames
              .map((name) => itemLookup.get(normalize(name)))
              .filter((entry): entry is CatalogEntry => Boolean(entry))
              .filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index)
              .slice(0, 3);
            const cost = champion?.tier ? Math.min(5, Math.max(1, champion.tier)) : null;
            const selected = Boolean(champion && selectedUnit && [champion.id, champion.nameEn, champion.nameZh].some((name) => normalize(name) === normalize(selectedUnit)));
            const tacticalTitle = champion
              ? [
                  `${champion.nameZh} / ${champion.nameEn}`,
                  role ? roleLabel(role) : "",
                  cost ? `${cost} ${tr("费", "cost")}` : "",
                  assignedItems.length ? assignedItems.map((item) => nameOf(item)).join(" · ") : "",
                  onUnitClick ? tr("点击编辑角色与装备", "Click to edit role and items") : "",
                ].filter(Boolean).join(" · ")
              : "";

            return (
              <div
                className={[
                  styles.hex,
                  champion ? styles.filled : "",
                  cost ? styles[`cost${cost}`] ?? "" : "",
                  role ? styles[`role${role}`] ?? "" : "",
                  champion && onUnitClick ? styles.interactive : "",
                  selected ? styles.selected : "",
                ].filter(Boolean).join(" ")}
                key={`${row}-${col}`}
                title={tacticalTitle}
                role={champion && onUnitClick ? "button" : undefined}
                tabIndex={champion && onUnitClick ? 0 : undefined}
                aria-pressed={champion && onUnitClick ? selected : undefined}
                onClick={champion && onUnitClick ? () => onUnitClick(champion) : undefined}
                onKeyDown={champion ? (event) => activate(event, champion) : undefined}
              >
                {champion ? (
                  <>
                    <div className={styles.portrait}>
                      <UnitIcon
                        entry={champion}
                        size={compact ? 72 : 112}
                        className={styles.portraitImage}
                      />
                    </div>
                    {role ? <span className={styles.roleBadge} title={roleLabel(role)}>{roleGlyph(role)}</span> : null}
                    {cost ? <span className={styles.costBadge}>{cost}</span> : null}
                    {assignedItems.length ? (
                      <div className={styles.itemStrip} aria-label={tr("推荐装备", "Recommended items")}>
                        {assignedItems.map((item) => item.imageUrl ? (
                          <Image key={item.id} src={item.imageUrl} alt={item.nameEn} width={compact ? 15 : 20} height={compact ? 15 : 20} unoptimized />
                        ) : (
                          <span className={styles.itemFallback} key={item.id}>{nameOf(item).slice(0, 1)}</span>
                        ))}
                      </div>
                    ) : null}
                    {!compact && (
                      <div className={styles.namePlate}>
                        <span>{nameOf(champion)}</span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
