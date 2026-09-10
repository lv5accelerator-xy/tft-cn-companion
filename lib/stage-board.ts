import type { BoardPosition, MetaComp } from "@/data/comps";
import type { CatalogEntry } from "@/data/tft";
import type { TacticalBoardPlan, TacticalRole } from "@/lib/tactical-board";

export type StageBoardProvenance = "source-final" | "derived-transition";
export type RollMode = "hold" | "stabilize" | "reroll" | "fast8" | "finish";

export type StageHandoff = {
  role: "CARRY" | "TANK";
  from: string;
  to: string;
};

export type StageBoardPlan = {
  stage: "Stage 2" | "Stage 3" | "Stage 4";
  board: BoardPosition[];
  level: string;
  rollMode: RollMode;
  provenance: StageBoardProvenance;
  rolesByName: Record<string, TacticalRole>;
  itemsByName: Record<string, string[]>;
  handoffs: StageHandoff[];
};

type StageCompInput = Pick<MetaComp, "playstyle" | "board" | "stages">;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function canonicalLookup(champions: CatalogEntry[]) {
  const lookup = new Map<string, CatalogEntry>();
  champions.forEach((champion) => {
    [champion.id, champion.nameEn, champion.nameZh, ...(champion.aliases ?? [])].forEach((name) => {
      if (name) lookup.set(normalize(name), champion);
    });
  });
  return lookup;
}

function copyAssignments(values: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(values).map(([unit, items]) => [unit, [...items].slice(0, 3)]));
}

function roleUnit(roles: Record<string, TacticalRole>, role: TacticalRole) {
  return Object.entries(roles).find(([, value]) => value === role)?.[0] ?? null;
}

function stageLevel(stageIndex: number, playstyle: string) {
  const lower = playstyle.toLocaleLowerCase("en-US");
  const reroll = lower.includes("reroll") || lower.includes("追三");
  const fast8 = lower.includes("fast 8") || lower.includes("fast8");
  if (stageIndex === 0) return "4–5";
  if (stageIndex === 1) return reroll ? "6–7" : "6–7";
  if (reroll) return "7";
  if (fast8) return "8";
  return "7–8";
}

function rollMode(stageIndex: number, playstyle: string): RollMode {
  const lower = playstyle.toLocaleLowerCase("en-US");
  const reroll = lower.includes("reroll") || lower.includes("追三");
  const fast8 = lower.includes("fast 8") || lower.includes("fast8");
  if (stageIndex === 0) return "hold";
  if (stageIndex === 1) return reroll ? "stabilize" : "hold";
  if (reroll) return "reroll";
  if (fast8) return "fast8";
  return "finish";
}

function pickTransitionBoard(
  board: BoardPosition[],
  champions: CatalogEntry[],
  targetCount: number,
) {
  if (board.length <= targetCount) return [...board];
  const lookup = canonicalLookup(champions);
  const costOf = (position: BoardPosition) => lookup.get(normalize(position.unit))?.tier ?? 6;
  const sorted = [...board].sort((left, right) => {
    const costDiff = costOf(left) - costOf(right);
    if (costDiff) return costDiff;
    return left.row - right.row || left.col - right.col;
  });

  const picked: BoardPosition[] = [];
  const add = (candidate: BoardPosition | undefined) => {
    if (!candidate || picked.some((entry) => normalize(entry.unit) === normalize(candidate.unit))) return;
    picked.push(candidate);
  };

  add(sorted.find((entry) => entry.row <= 1));
  add(sorted.find((entry) => entry.row >= 2));
  sorted.forEach((entry) => {
    if (picked.length < targetCount) add(entry);
  });

  return picked
    .slice(0, targetCount)
    .sort((left, right) => left.row - right.row || left.col - right.col);
}

function mentionedSelectedUnit(
  text: string,
  selected: BoardPosition[],
  champions: CatalogEntry[],
  preferredRows: "front" | "back",
) {
  const lookup = canonicalLookup(champions);
  const haystack = normalize(text);
  const candidates = selected
    .filter((position) => preferredRows === "front" ? position.row <= 1 : position.row >= 2)
    .map((position) => ({
      position,
      champion: lookup.get(normalize(position.unit)),
    }))
    .filter((entry) => {
      const names = unique([
        entry.position.unit,
        entry.champion?.id ?? "",
        entry.champion?.nameEn ?? "",
        entry.champion?.nameZh ?? "",
        ...(entry.champion?.aliases ?? []),
      ]).map(normalize);
      return names.some((name) => name.length >= 2 && haystack.includes(name));
    })
    .sort((left, right) => (left.champion?.tier ?? 6) - (right.champion?.tier ?? 6));
  return candidates[0]?.champion?.nameEn ?? candidates[0]?.position.unit ?? null;
}

function selectedCanonicalNames(board: BoardPosition[], champions: CatalogEntry[]) {
  const lookup = canonicalLookup(champions);
  return board.map((position) => lookup.get(normalize(position.unit))?.nameEn ?? position.unit);
}

export function deriveStageBoardPlans(
  comp: StageCompInput,
  champions: CatalogEntry[],
  tactical: TacticalBoardPlan,
): StageBoardPlan[] {
  const championLookup = canonicalLookup(champions);
  const canonical = (value: string) => championLookup.get(normalize(value))?.nameEn ?? value;
  const finalRoles = Object.fromEntries(Object.entries(tactical.rolesByName).map(([unit, role]) => [canonical(unit), role]));
  const finalItems = Object.fromEntries(Object.entries(tactical.itemsByName).map(([unit, items]) => [canonical(unit), [...items].slice(0, 3)]));
  const finalCarry = roleUnit(finalRoles, "CARRY");
  const finalTank = roleUnit(finalRoles, "TANK");

  return comp.stages.map((stage, stageIndex) => {
    const finalStage = stageIndex === comp.stages.length - 1 || stage.stage === "Stage 4";
    const targetCount = stage.stage === "Stage 2" ? 4 : stage.stage === "Stage 3" ? 6 : comp.board.length;
    const stageBoard = finalStage ? [...comp.board] : pickTransitionBoard(comp.board, champions, targetCount);
    const selected = new Set(selectedCanonicalNames(stageBoard, champions).map(normalize));
    const rolesByName: Record<string, TacticalRole> = {};
    const itemsByName: Record<string, string[]> = {};

    selectedCanonicalNames(stageBoard, champions).forEach((unit) => {
      const sourceRole = finalRoles[unit];
      rolesByName[unit] = sourceRole ?? "FLEX";
      if (finalItems[unit]?.length) itemsByName[unit] = [...finalItems[unit]].slice(0, 3);
    });

    const handoffs: StageHandoff[] = [];
    if (!finalStage) {
      if (finalCarry && !selected.has(normalize(finalCarry))) {
        const mentioned = mentionedSelectedUnit(stage.text, stageBoard, champions, "back");
        const fallback = selectedCanonicalNames(stageBoard.filter((position) => position.row >= 2), champions)[0]
          ?? selectedCanonicalNames(stageBoard, champions)[0]
          ?? null;
        const holder = mentioned ?? fallback;
        if (holder) {
          Object.keys(rolesByName).forEach((unit) => {
            if (rolesByName[unit] === "CARRY") rolesByName[unit] = "FLEX";
          });
          rolesByName[holder] = "CARRY";
          if (finalItems[finalCarry]?.length) itemsByName[holder] = [...finalItems[finalCarry]].slice(0, 3);
          handoffs.push({ role: "CARRY", from: holder, to: finalCarry });
        }
      }

      if (finalTank && !selected.has(normalize(finalTank))) {
        const mentioned = mentionedSelectedUnit(stage.text, stageBoard, champions, "front");
        const fallback = selectedCanonicalNames(stageBoard.filter((position) => position.row <= 1), champions)[0] ?? null;
        const holder = mentioned ?? fallback;
        if (holder) {
          Object.keys(rolesByName).forEach((unit) => {
            if (rolesByName[unit] === "TANK") rolesByName[unit] = "FLEX";
          });
          rolesByName[holder] = "TANK";
          if (finalItems[finalTank]?.length) itemsByName[holder] = [...finalItems[finalTank]].slice(0, 3);
          handoffs.push({ role: "TANK", from: holder, to: finalTank });
        }
      }
    }

    return {
      stage: stage.stage,
      board: stageBoard,
      level: stageLevel(stageIndex, comp.playstyle),
      rollMode: rollMode(stageIndex, comp.playstyle),
      provenance: finalStage ? "source-final" : "derived-transition",
      rolesByName,
      itemsByName: copyAssignments(itemsByName),
      handoffs,
    };
  });
}
