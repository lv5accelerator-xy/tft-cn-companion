"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogEntry } from "@/data/tft";
import type { AnalysisComp, Carry } from "./types";
import styles from "./import.module.css";

const ERASE = "__erase__";

function splitList(value: string) {
  return value
    .split(/[\n,，;；|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function shortUnit(value: string) {
  if (value.length <= 8) return value;
  const parts = value.split(" ");
  if (parts.length > 1) return parts.map((part) => part[0]).join("").slice(0, 5);
  return `${value.slice(0, 7)}…`;
}

export default function CompCorrectionEditor({
  comp,
  activeBoardUnit,
  onActiveBoardUnitChange,
  onChange,
  onDone,
  onReset,
}: {
  comp: AnalysisComp;
  activeBoardUnit: string;
  onActiveBoardUnitChange: (unit: string) => void;
  onChange: (comp: AnalysisComp) => void;
  onDone: () => void;
  onReset: () => void;
}) {
  const [champions, setChampions] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { champions?: CatalogEntry[] }) => {
        setChampions(Array.isArray(payload.champions) ? payload.champions : []);
      })
      .catch(() => setChampions([]));
  }, []);

  const championByName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => {
      map.set(normalizeName(champion.nameEn), champion);
      map.set(normalizeName(champion.nameZh), champion);
    });
    return map;
  }, [champions]);

  function displayUnit(value: string) {
    return championByName.get(normalizeName(value))?.nameZh || value;
  }

  function canonicalUnit(value: string) {
    return championByName.get(normalizeName(value))?.nameEn || value.trim();
  }

  function displayUnitList(values: string[]) {
    return values.map(displayUnit).join("\n");
  }

  function parseUnitList(value: string) {
    return splitList(value).map(canonicalUnit);
  }

  const boardUnits = unique([
    ...comp.coreUnits,
    ...comp.flexUnits,
    ...comp.carries.map((carry) => carry.unit),
    ...comp.board.map((position) => position.unit),
  ]);

  function patch(patchValue: Partial<AnalysisComp>) {
    onChange({ ...comp, ...patchValue });
  }

  function updateCarry(index: number, value: Partial<Carry>) {
    const carries = comp.carries.map((carry, carryIndex) => carryIndex === index ? { ...carry, ...value } : carry);
    patch({ carries });
  }

  function removeCarry(index: number) {
    patch({ carries: comp.carries.filter((_, carryIndex) => carryIndex !== index) });
  }

  function addCarry() {
    patch({ carries: [...comp.carries, { unit: "", role: "CARRY", items: [], alternatives: [] }] });
  }

  function setBoardCell(row: number, col: number) {
    const occupied = comp.board.find((position) => position.row === row && position.col === col);
    if (!activeBoardUnit && occupied) {
      onActiveBoardUnitChange(occupied.unit);
      return;
    }
    if (!activeBoardUnit) return;

    let board = comp.board.filter((position) => !(position.row === row && position.col === col));
    if (activeBoardUnit !== ERASE) {
      board = board.filter((position) => normalizeName(position.unit) !== normalizeName(activeBoardUnit));
      board.push({ unit: activeBoardUnit, row, col });
    }
    board.sort((a, b) => a.row - b.row || a.col - b.col);
    patch({ board });
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorHead}>
        <div>
          <strong>人工校正</strong>
          <span>当前默认显示中文英雄名；内部仍保存美服英文标准名，后续可直接增加中 / 英文切换。</span>
        </div>
        <div className={styles.editorHeadActions}>
          <button className={styles.secondary} onClick={onReset}>恢复 AI 结果</button>
          <button className={styles.primary} onClick={onDone}>完成校正</button>
        </div>
      </div>

      <div className={styles.editGrid}>
        <label>
          <span>中文阵容名</span>
          <input value={comp.nameZh} onChange={(event) => patch({ nameZh: event.target.value })} />
        </label>
        <label>
          <span>英文阵容名</span>
          <input value={comp.nameEn} onChange={(event) => patch({ nameEn: event.target.value })} />
        </label>
        <label>
          <span>Tier</span>
          <select value={comp.tier} onChange={(event) => patch({ tier: event.target.value as AnalysisComp["tier"] })}>
            <option value="S">S</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="ACTIVE">Active</option>
          </select>
        </label>
        <label>
          <span>难度</span>
          <select value={comp.difficulty} onChange={(event) => patch({ difficulty: event.target.value as AnalysisComp["difficulty"] })}>
            <option value="EASY">简单</option>
            <option value="MEDIUM">中等</option>
            <option value="HARD">较难</option>
          </select>
        </label>
        <label className={styles.wideField}>
          <span>玩法</span>
          <input value={comp.playstyle} onChange={(event) => patch({ playstyle: event.target.value })} />
        </label>
      </div>

      <div className={styles.editLists}>
        <label>
          <span>核心英雄 · 每行一个</span>
          <textarea value={displayUnitList(comp.coreUnits)} onChange={(event) => patch({ coreUnits: parseUnitList(event.target.value) })} />
        </label>
        <label>
          <span>补充 / Flex 英雄</span>
          <textarea value={displayUnitList(comp.flexUnits)} onChange={(event) => patch({ flexUnits: parseUnitList(event.target.value) })} />
        </label>
        <label>
          <span>装备优先</span>
          <textarea value={comp.itemFocus.join("\n")} onChange={(event) => patch({ itemFocus: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} />
        </label>
        <label>
          <span>强化</span>
          <textarea value={comp.augments.join("\n")} onChange={(event) => patch({ augments: splitList(event.target.value) })} />
        </label>
        <label>
          <span>羁绊</span>
          <textarea value={comp.traits.join("\n")} onChange={(event) => patch({ traits: splitList(event.target.value) })} />
        </label>
        <label>
          <span>关键说明</span>
          <textarea value={comp.keyNotes.join("\n")} onChange={(event) => patch({ keyNotes: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} />
        </label>
      </div>

      <div className={styles.editGrid}>
        <label className={styles.wideField}>
          <span>什么时候玩</span>
          <input value={comp.whenToPlay} onChange={(event) => patch({ whenToPlay: event.target.value })} />
        </label>
        <label className={styles.wideField}>
          <span>阵容码</span>
          <input value={comp.compCode} onChange={(event) => patch({ compCode: event.target.value })} placeholder="TFTSet18..." />
        </label>
        <label className={styles.wideField}>
          <span>站位备注</span>
          <input value={comp.positioningNote} onChange={(event) => patch({ positioningNote: event.target.value })} />
        </label>
      </div>

      <div className={styles.stageEditor}>
        <strong>运营节点</strong>
        {comp.stages.map((stage, index) => (
          <label key={`${stage.stage}-${index}`}>
            <span>{stage.stage}</span>
            <input
              value={stage.text}
              onChange={(event) => patch({
                stages: comp.stages.map((entry, stageIndex) => stageIndex === index ? { ...entry, text: event.target.value } : entry),
              })}
            />
          </label>
        ))}
      </div>

      <div className={styles.carryEditor}>
        <div className={styles.sectionHead}>
          <div>
            <strong>主 C / 主坦 / 副 C</strong>
            <span>英雄名显示中文；装备在这里校正后会跟随图片导入结果保存。</span>
          </div>
          <button className={styles.secondary} onClick={addCarry}>+ 增加角色</button>
        </div>
        {comp.carries.length === 0 && <div className={styles.emptyEditor}>AI 没有可靠识别主 C / 主坦，可手动增加。</div>}
        {comp.carries.map((carry, index) => (
          <div className={styles.carryRow} key={`${carry.unit}-${index}`}>
            <input
              value={displayUnit(carry.unit)}
              onChange={(event) => updateCarry(index, { unit: canonicalUnit(event.target.value) })}
              placeholder="英雄"
            />
            <select value={carry.role} onChange={(event) => updateCarry(index, { role: event.target.value as Carry["role"] })}>
              <option value="CARRY">主 C</option>
              <option value="TANK">主坦</option>
              <option value="SECONDARY">副 C</option>
            </select>
            <input value={carry.items.join(", ")} onChange={(event) => updateCarry(index, { items: splitList(event.target.value) })} placeholder="核心装备" />
            <input value={carry.alternatives.join(", ")} onChange={(event) => updateCarry(index, { alternatives: splitList(event.target.value) })} placeholder="备选装备" />
            <button className={styles.removeButton} onClick={() => removeCarry(index)} aria-label="删除角色">×</button>
          </div>
        ))}
      </div>

      <div className={styles.boardCorrection}>
        <div className={styles.sectionHead}>
          <div>
            <strong>4×7 站位校正</strong>
            <span>先选英雄，再点格子。前排在上、后排在下；每一排从左到右对应第 1～7 格。</span>
          </div>
          <button className={styles.secondary} onClick={() => patch({ board: [] })}>清空站位</button>
        </div>
        <div className={styles.boardPalette}>
          {boardUnits.map((unit) => {
            const label = displayUnit(unit);
            return (
              <button
                key={unit}
                className={activeBoardUnit === unit ? styles.boardToolActive : ""}
                onClick={() => onActiveBoardUnitChange(unit)}
                title={label === unit ? unit : `${label} / ${unit}`}
              >
                {label}
              </button>
            );
          })}
          <button className={activeBoardUnit === ERASE ? styles.boardToolActive : ""} onClick={() => onActiveBoardUnitChange(ERASE)}>
            橡皮擦
          </button>
        </div>
        <div className={styles.boardGrid}>
          {[0, 1, 2, 3].map((row) => (
            <div className={styles.boardRow} key={row}>
              <span className={styles.rowLabel}>{row === 0 ? "前排" : row === 3 ? "后排" : `第 ${row + 1} 排`}</span>
              <div className={styles.boardCells}>
                {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                  const occupant = comp.board.find((position) => position.row === row && position.col === col);
                  const occupantLabel = occupant ? displayUnit(occupant.unit) : "";
                  return (
                    <button
                      key={`${row}-${col}`}
                      className={occupant ? styles.boardCellFilled : styles.boardCell}
                      onClick={() => setBoardCell(row, col)}
                      title={occupant ? (occupantLabel === occupant.unit ? occupant.unit : `${occupantLabel} / ${occupant.unit}`) : `第 ${row + 1} 排，第 ${col + 1} 格`}
                    >
                      {occupant ? shortUnit(occupantLabel) : "+"}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
