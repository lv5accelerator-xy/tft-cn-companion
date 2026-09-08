"use client";

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

function shortUnit(value: string) {
  if (value.length <= 11) return value;
  const parts = value.split(" ");
  if (parts.length > 1) return parts.map((part) => part[0]).join("").slice(0, 5);
  return `${value.slice(0, 9)}…`;
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
      board = board.filter((position) => position.unit.toLocaleLowerCase("en-US") !== activeBoardUnit.toLocaleLowerCase("en-US"));
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
          <span>AI 结果只是草稿。确认英雄、装备和站位后再保存。</span>
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
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </label>
        <label className={styles.wideField}>
          <span>玩法 / Playstyle</span>
          <input value={comp.playstyle} onChange={(event) => patch({ playstyle: event.target.value })} />
        </label>
      </div>

      <div className={styles.editLists}>
        <label>
          <span>核心英雄 · 每行一个</span>
          <textarea value={comp.coreUnits.join("\n")} onChange={(event) => patch({ coreUnits: splitList(event.target.value) })} />
        </label>
        <label>
          <span>补充 / Flex 英雄</span>
          <textarea value={comp.flexUnits.join("\n")} onChange={(event) => patch({ flexUnits: splitList(event.target.value) })} />
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
            <span>装备在这里校正后，会跟随这套图片导入结果保存。</span>
          </div>
          <button className={styles.secondary} onClick={addCarry}>+ 增加角色</button>
        </div>
        {comp.carries.length === 0 && <div className={styles.emptyEditor}>AI 没有可靠识别主 C / 主坦，可手动增加。</div>}
        {comp.carries.map((carry, index) => (
          <div className={styles.carryRow} key={`${carry.unit}-${index}`}>
            <input value={carry.unit} onChange={(event) => updateCarry(index, { unit: event.target.value })} placeholder="Champion" />
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
            <span>先选英雄，再点格子。后排在上，前排在下；“橡皮擦”用于清空格子。</span>
          </div>
          <button className={styles.secondary} onClick={() => patch({ board: [] })}>清空站位</button>
        </div>
        <div className={styles.boardPalette}>
          {boardUnits.map((unit) => (
            <button
              key={unit}
              className={activeBoardUnit === unit ? styles.boardToolActive : ""}
              onClick={() => onActiveBoardUnitChange(unit)}
              title={unit}
            >
              {unit}
            </button>
          ))}
          <button className={activeBoardUnit === ERASE ? styles.boardToolActive : ""} onClick={() => onActiveBoardUnitChange(ERASE)}>
            橡皮擦
          </button>
        </div>
        <div className={styles.boardGrid}>
          {[0, 1, 2, 3].map((row) => (
            <div className={styles.boardRow} key={row}>
              <span className={styles.rowLabel}>{row === 0 ? "后排" : row === 3 ? "前排" : `R${row + 1}`}</span>
              <div className={styles.boardCells}>
                {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                  const occupant = comp.board.find((position) => position.row === row && position.col === col);
                  return (
                    <button
                      key={`${row}-${col}`}
                      className={occupant ? styles.boardCellFilled : styles.boardCell}
                      onClick={() => setBoardCell(row, col)}
                      title={occupant?.unit || `Row ${row + 1}, Col ${col + 1}`}
                    >
                      {occupant ? shortUnit(occupant.unit) : "+"}
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
