"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogEntry } from "@/data/tft";
import { useLocale } from "../components/LocaleProvider";
import type { AnalysisComp, Carry } from "./types";
import styles from "./import.module.css";

const ERASE = "__erase__";

function splitList(value: string) {
  return value.split(/[\n,，;；|/]+/).map((item) => item.trim()).filter(Boolean);
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

export default function CompCorrectionEditor({ comp, activeBoardUnit, onActiveBoardUnitChange, onChange, onDone, onReset }: {
  comp: AnalysisComp;
  activeBoardUnit: string;
  onActiveBoardUnitChange: (unit: string) => void;
  onChange: (comp: AnalysisComp) => void;
  onDone: () => void;
  onReset: () => void;
}) {
  const { locale, tr } = useLocale();
  const [champions, setChampions] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { champions?: CatalogEntry[] }) => setChampions(Array.isArray(payload.champions) ? payload.champions : []))
      .catch(() => setChampions([]));
  }, []);

  const championByName = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => { map.set(normalizeName(champion.nameEn), champion); map.set(normalizeName(champion.nameZh), champion); });
    return map;
  }, [champions]);

  function displayUnit(value: string) {
    const champion = championByName.get(normalizeName(value));
    if (!champion) return value;
    return locale === "zh" ? (champion.nameZh || champion.nameEn) : (champion.nameEn || champion.nameZh);
  }

  function canonicalUnit(value: string) {
    return championByName.get(normalizeName(value))?.nameEn || value.trim();
  }

  function displayUnitList(values: string[]) { return values.map(displayUnit).join("\n"); }
  function parseUnitList(value: string) { return splitList(value).map(canonicalUnit); }

  const boardUnits = unique([...comp.coreUnits, ...comp.flexUnits, ...comp.carries.map((carry) => carry.unit), ...comp.board.map((position) => position.unit)]);
  function patch(patchValue: Partial<AnalysisComp>) { onChange({ ...comp, ...patchValue }); }
  function updateCarry(index: number, value: Partial<Carry>) { patch({ carries: comp.carries.map((carry, carryIndex) => carryIndex === index ? { ...carry, ...value } : carry) }); }
  function removeCarry(index: number) { patch({ carries: comp.carries.filter((_, carryIndex) => carryIndex !== index) }); }
  function addCarry() { patch({ carries: [...comp.carries, { unit: "", role: "CARRY", items: [], alternatives: [] }] }); }

  function setBoardCell(row: number, col: number) {
    const occupied = comp.board.find((position) => position.row === row && position.col === col);
    if (!activeBoardUnit && occupied) { onActiveBoardUnitChange(occupied.unit); return; }
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
        <div><strong>{tr("人工校正", "Manual Review")}</strong><span>{tr("英雄默认显示当前界面语言；内部始终保存美服英文标准名，便于搜索和跨语言切换。", "Champion labels follow the current UI language while canonical NA English names remain stored internally.")}</span></div>
        <div className={styles.editorHeadActions}><button className={styles.secondary} onClick={onReset}>{tr("恢复 AI 结果", "Reset to AI")}</button><button className={styles.primary} onClick={onDone}>{tr("完成校正", "Finish Review")}</button></div>
      </div>

      <div className={styles.editGrid}>
        <label><span>{tr("中文阵容名", "Chinese comp name")}</span><input value={comp.nameZh} onChange={(event) => patch({ nameZh: event.target.value })} /></label>
        <label><span>{tr("英文阵容名", "English comp name")}</span><input value={comp.nameEn} onChange={(event) => patch({ nameEn: event.target.value })} /></label>
        <label><span>Tier</span><select value={comp.tier} onChange={(event) => patch({ tier: event.target.value as AnalysisComp["tier"] })}><option value="S">S</option><option value="A">A</option><option value="B">B</option><option value="ACTIVE">Active</option></select></label>
        <label><span>{tr("难度", "Difficulty")}</span><select value={comp.difficulty} onChange={(event) => patch({ difficulty: event.target.value as AnalysisComp["difficulty"] })}><option value="EASY">{tr("简单", "Easy")}</option><option value="MEDIUM">{tr("中等", "Medium")}</option><option value="HARD">{tr("较难", "Hard")}</option></select></label>
        <label className={styles.wideField}><span>{tr("玩法", "Playstyle")}</span><input value={comp.playstyle} onChange={(event) => patch({ playstyle: event.target.value })} /></label>
      </div>

      <div className={styles.editLists}>
        <label><span>{tr("核心英雄 · 每行一个", "Core units · one per line")}</span><textarea value={displayUnitList(comp.coreUnits)} onChange={(event) => patch({ coreUnits: parseUnitList(event.target.value) })} /></label>
        <label><span>{tr("补充 / Flex 英雄", "Flex units")}</span><textarea value={displayUnitList(comp.flexUnits)} onChange={(event) => patch({ flexUnits: parseUnitList(event.target.value) })} /></label>
        <label><span>{tr("装备优先", "Item priority")}</span><textarea value={comp.itemFocus.join("\n")} onChange={(event) => patch({ itemFocus: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
        <label><span>{tr("强化", "Augments")}</span><textarea value={comp.augments.join("\n")} onChange={(event) => patch({ augments: splitList(event.target.value) })} /></label>
        <label><span>{tr("羁绊", "Traits")}</span><textarea value={comp.traits.join("\n")} onChange={(event) => patch({ traits: splitList(event.target.value) })} /></label>
        <label><span>{tr("关键说明", "Key notes")}</span><textarea value={comp.keyNotes.join("\n")} onChange={(event) => patch({ keyNotes: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
      </div>

      <div className={styles.editGrid}>
        <label className={styles.wideField}><span>{tr("什么时候玩", "When to play")}</span><input value={comp.whenToPlay} onChange={(event) => patch({ whenToPlay: event.target.value })} /></label>
        <label className={styles.wideField}><span>{tr("阵容码", "Comp code")}</span><input value={comp.compCode} onChange={(event) => patch({ compCode: event.target.value })} placeholder="TFTSet18..." /></label>
        <label className={styles.wideField}><span>{tr("站位备注", "Positioning note")}</span><input value={comp.positioningNote} onChange={(event) => patch({ positioningNote: event.target.value })} /></label>
      </div>

      <div className={styles.stageEditor}><strong>{tr("运营节点", "Stage plan")}</strong>{comp.stages.map((stage, index) => <label key={`${stage.stage}-${index}`}><span>{stage.stage}</span><input value={stage.text} onChange={(event) => patch({ stages: comp.stages.map((entry, stageIndex) => stageIndex === index ? { ...entry, text: event.target.value } : entry) })} /></label>)}</div>

      <div className={styles.carryEditor}>
        <div className={styles.sectionHead}><div><strong>{tr("主 C / 主坦 / 副 C", "Carry / Tank / Secondary")}</strong><span>{tr("这里校正的角色和装备会直接带入 Builder。", "Roles and items reviewed here are passed directly into Builder.")}</span></div><button className={styles.secondary} onClick={addCarry}>+ {tr("增加角色", "Add role")}</button></div>
        {comp.carries.length === 0 && <div className={styles.emptyEditor}>{tr("AI 没有可靠识别主 C / 主坦，可手动增加。", "AI did not confidently detect a carry/tank; add one manually.")}</div>}
        {comp.carries.map((carry, index) => <div className={styles.carryRow} key={`${carry.unit}-${index}`}>
          <input value={displayUnit(carry.unit)} onChange={(event) => updateCarry(index, { unit: canonicalUnit(event.target.value) })} placeholder={tr("英雄", "Champion")} />
          <select value={carry.role} onChange={(event) => updateCarry(index, { role: event.target.value as Carry["role"] })}><option value="CARRY">{tr("主 C", "Carry")}</option><option value="TANK">{tr("主坦", "Tank")}</option><option value="SECONDARY">{tr("副 C", "Secondary")}</option></select>
          <input value={carry.items.join(", ")} onChange={(event) => updateCarry(index, { items: splitList(event.target.value) })} placeholder={tr("核心装备", "Core items")} />
          <input value={carry.alternatives.join(", ")} onChange={(event) => updateCarry(index, { alternatives: splitList(event.target.value) })} placeholder={tr("备选装备", "Alternatives")} />
          <button className={styles.removeButton} onClick={() => removeCarry(index)} aria-label={tr("删除角色", "Delete role")}>×</button>
        </div>)}
      </div>

      <div className={styles.boardCorrection}>
        <div className={styles.sectionHead}><div><strong>{tr("4×7 站位校正", "4×7 Board Review")}</strong><span>{tr("先选英雄，再点格子。前排在上、后排在下；每排从左到右第 1～7 格。", "Select a champion then click a hex. Frontline is on top, backline below; columns run 1–7 left to right.")}</span></div><button className={styles.secondary} onClick={() => patch({ board: [] })}>{tr("清空站位", "Clear board")}</button></div>
        <div className={styles.boardPalette}>{boardUnits.map((unit) => { const label = displayUnit(unit); return <button key={unit} className={activeBoardUnit === unit ? styles.boardToolActive : ""} onClick={() => onActiveBoardUnitChange(unit)} title={label === unit ? unit : `${label} / ${unit}`}>{label}</button>; })}<button className={activeBoardUnit === ERASE ? styles.boardToolActive : ""} onClick={() => onActiveBoardUnitChange(ERASE)}>{tr("橡皮擦", "Erase")}</button></div>
        <div className={styles.boardGrid}>{[0,1,2,3].map((row) => <div className={styles.boardRow} key={row}><span className={styles.rowLabel}>{row === 0 ? tr("前排", "Front") : row === 3 ? tr("后排", "Back") : tr(`第 ${row + 1} 排`, `Row ${row + 1}`)}</span><div className={styles.boardCells}>{[0,1,2,3,4,5,6].map((col) => { const occupant = comp.board.find((position) => position.row === row && position.col === col); const occupantLabel = occupant ? displayUnit(occupant.unit) : ""; return <button key={`${row}-${col}`} className={occupant ? styles.boardCellFilled : styles.boardCell} onClick={() => setBoardCell(row, col)} title={occupant ? (occupantLabel === occupant.unit ? occupant.unit : `${occupantLabel} / ${occupant.unit}`) : tr(`第 ${row + 1} 排，第 ${col + 1} 格`, `Row ${row + 1}, hex ${col + 1}`)}>{occupant ? shortUnit(occupantLabel) : "+"}</button>; })}</div></div>)}</div>
      </div>
    </div>
  );
}
