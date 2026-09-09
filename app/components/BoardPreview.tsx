"use client";

import { useMemo } from "react";
import UnitIcon from "./UnitIcon";
import { useLocale } from "./LocaleProvider";
import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry } from "@/data/tft";
import styles from "./board-preview.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

export default function BoardPreview({
  positions,
  champions,
  compact = false,
}: {
  positions: BoardPosition[];
  champions: CatalogEntry[];
  compact?: boolean;
}) {
  const { tr, nameOf } = useLocale();
  const byName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((unit) => {
      map.set(normalize(unit.nameEn), unit);
      map.set(normalize(unit.nameZh), unit);
    });
    return map;
  }, [champions]);

  const cells = useMemo(() => {
    const map = new Map<string, BoardPosition>();
    positions.forEach((position) => map.set(`${position.row}-${position.col}`, position));
    return map;
  }, [positions]);

  return (
    <div className={`${styles.board} ${compact ? styles.compact : ""}`} aria-label={tr("参考站位", "Positioning preview")}>
      {[0, 1, 2, 3].map((row) => (
        <div className={`${styles.row} ${row % 2 ? styles.shifted : ""}`} key={row}>
          {[0, 1, 2, 3, 4, 5, 6].map((col) => {
            const position = cells.get(`${row}-${col}`);
            const champion = position ? byName.get(normalize(position.unit)) : undefined;
            return (
              <div
                className={`${styles.hex} ${champion ? styles.filled : ""}`}
                key={`${row}-${col}`}
                title={champion ? `${champion.nameZh} / ${champion.nameEn}` : ""}
              >
                {champion ? (
                  <>
                    <UnitIcon entry={champion} size={compact ? 25 : 34} />
                    {!compact && <span>{nameOf(champion)}</span>}
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
