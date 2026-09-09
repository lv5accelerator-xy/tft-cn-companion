"use client";

import { DragEvent, useMemo, useState } from "react";
import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry } from "@/data/tft";
import UnitIcon from "./UnitIcon";
import { useLocale } from "./LocaleProvider";
import styles from "./board-editor.module.css";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

type Props = {
  roster: CatalogEntry[];
  positions: BoardPosition[];
  onChange: (positions: BoardPosition[]) => void;
};

export default function BoardEditor({ roster, positions, onChange }: Props) {
  const { tr, nameOf } = useLocale();
  const [activeId, setActiveId] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    roster.forEach((unit) => {
      map.set(normalize(unit.id), unit);
      map.set(normalize(unit.nameEn), unit);
      map.set(normalize(unit.nameZh), unit);
    });
    return map;
  }, [roster]);

  const byCell = useMemo(() => {
    const map = new Map<string, BoardPosition>();
    positions.forEach((position) => map.set(`${position.row}:${position.col}`, position));
    return map;
  }, [positions]);

  const placedNames = useMemo(() => new Set(positions.map((position) => normalize(position.unit))), [positions]);
  const active = activeId ? roster.find((unit) => unit.id === activeId) ?? null : null;

  function place(unit: CatalogEntry, row: number, col: number) {
    const targetKey = `${row}:${col}`;
    const occupant = byCell.get(targetKey);
    const previous = positions.find((position) => normalize(position.unit) === normalize(unit.nameEn));
    let next = positions.filter((position) => normalize(position.unit) !== normalize(unit.nameEn));

    if (occupant && normalize(occupant.unit) !== normalize(unit.nameEn)) {
      next = next.filter((position) => `${position.row}:${position.col}` !== targetKey);
      if (previous) {
        next.push({ unit: occupant.unit, row: previous.row, col: previous.col });
      }
    }

    next.push({ unit: unit.nameEn, row: row as BoardPosition["row"], col: col as BoardPosition["col"] });
    onChange(next);
    setActiveId(unit.id);
  }

  function removeUnit(unit: CatalogEntry) {
    onChange(positions.filter((position) => normalize(position.unit) !== normalize(unit.nameEn)));
    if (activeId === unit.id) setActiveId(null);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>, row: number, col: number) {
    event.preventDefault();
    const id = event.dataTransfer.getData("application/x-tft-unit") || event.dataTransfer.getData("text/plain");
    const unit = roster.find((entry) => entry.id === id) ?? lookup.get(normalize(id));
    if (unit) place(unit, row, col);
  }

  function mirror() {
    onChange(positions.map((position) => ({ ...position, col: (6 - position.col) as BoardPosition["col"] })));
  }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <div>
          <strong>{tr("站位编辑", "Board positioning")}</strong>
          <span>{tr("拖英雄到棋盘，或先点英雄再点格子；双击棋子可移除。", "Drag a champion onto the board, or select one then click a hex. Double-click to remove.")}</span>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={mirror}>{tr("左右镜像", "Mirror")}</button>
          <button type="button" onClick={() => onChange([])} disabled={!positions.length}>{tr("清空站位", "Clear")}</button>
        </div>
      </div>

      <div className={styles.roster}>
        {roster.map((unit) => {
          const selected = activeId === unit.id;
          const placed = placedNames.has(normalize(unit.nameEn));
          return (
            <button
              type="button"
              key={unit.id}
              className={`${styles.rosterUnit} ${selected ? styles.active : ""} ${placed ? styles.placed : ""}`}
              onClick={() => setActiveId(selected ? null : unit.id)}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-tft-unit", unit.id);
                event.dataTransfer.setData("text/plain", unit.id);
              }}
              title={`${unit.nameZh} / ${unit.nameEn}`}
            >
              <UnitIcon entry={unit} size={36} />
              <span>{nameOf(unit)}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.boardWrap}>
        <div className={styles.axis}>{tr("前排", "Front")}</div>
        <div className={styles.board}>
          {[0, 1, 2, 3].map((row) => (
            <div className={`${styles.row} ${row % 2 ? styles.shifted : ""}`} key={row}>
              {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                const position = byCell.get(`${row}:${col}`);
                const unit = position ? lookup.get(normalize(position.unit)) : undefined;
                return (
                  <button
                    type="button"
                    className={`${styles.hex} ${unit ? styles.filled : ""}`}
                    key={`${row}-${col}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, row, col)}
                    onClick={() => {
                      if (active) place(active, row, col);
                      else if (unit) setActiveId(unit.id);
                    }}
                    onDoubleClick={() => unit && removeUnit(unit)}
                    draggable={Boolean(unit)}
                    onDragStart={(event) => {
                      if (!unit) return;
                      event.dataTransfer.setData("application/x-tft-unit", unit.id);
                      event.dataTransfer.setData("text/plain", unit.id);
                    }}
                    title={unit ? `${unit.nameZh} / ${unit.nameEn}` : tr(`第 ${row + 1} 排 · 第 ${col + 1} 格`, `Row ${row + 1} · Hex ${col + 1}`)}
                  >
                    {unit ? (
                      <>
                        <UnitIcon entry={unit} size={44} />
                        <span>{nameOf(unit)}</span>
                      </>
                    ) : <span className={styles.plus}>+</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className={styles.axis}>{tr("后排", "Back")}</div>
      </div>
    </div>
  );
}
