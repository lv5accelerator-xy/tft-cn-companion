import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry } from "@/data/tft";

export type TacticalRole = "CARRY" | "TANK" | "SECONDARY" | "FLEX";

export type TacticalCompInput = {
  coreUnits: string[];
  flexUnits: string[];
  itemFocus: string[];
  keyNotes: string[];
  board: BoardPosition[];
};

export type TacticalBoardPlan = {
  rolesByName: Record<string, TacticalRole>;
  itemsByName: Record<string, string[]>;
  hasSourceRoles: boolean;
  hasSourceItems: boolean;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function deriveTacticalBoardPlan(
  comp: TacticalCompInput,
  champions: CatalogEntry[],
  items: CatalogEntry[],
): TacticalBoardPlan {
  const championLookup = new Map<string, CatalogEntry>();
  champions.forEach((champion) => {
    [champion.id, champion.nameEn, champion.nameZh, ...(champion.aliases ?? [])].forEach((name) => {
      if (name) championLookup.set(normalize(name), champion);
    });
  });

  const canonicalUnit = (value: string) => championLookup.get(normalize(value))?.nameEn ?? value.trim();
  const allUnits = unique([
    ...comp.coreUnits.map(canonicalUnit),
    ...comp.flexUnits.map(canonicalUnit),
    ...comp.board.map((position) => canonicalUnit(position.unit)),
  ]);
  const coreUnits = unique(comp.coreUnits.map(canonicalUnit));

  const unitAliases = new Map<string, string[]>();
  allUnits.forEach((unit) => {
    const champion = championLookup.get(normalize(unit));
    unitAliases.set(unit, unique([
      unit,
      champion?.id ?? "",
      champion?.nameEn ?? "",
      champion?.nameZh ?? "",
      ...(champion?.aliases ?? []),
    ]).map(normalize));
  });

  const boardRows = new Map<string, number>();
  comp.board.forEach((position) => boardRows.set(canonicalUnit(position.unit), position.row));

  const itemAliases = items.flatMap((item) => unique([
    item.id,
    item.nameEn,
    item.nameZh,
    ...(item.aliases ?? []),
  ]).map((alias) => ({ alias: normalize(alias), item })))
    .filter((entry) => entry.alias.length >= 3)
    .sort((left, right) => right.alias.length - left.alias.length);

  const findItems = (text: string) => {
    const haystack = normalize(text);
    const found: string[] = [];
    const seen = new Set<string>();
    for (const candidate of itemAliases) {
      if (!haystack.includes(candidate.alias) || seen.has(candidate.item.id)) continue;
      seen.add(candidate.item.id);
      found.push(candidate.item.nameEn);
    }
    return found.slice(0, 3);
  };

  const findMentionedUnit = (text: string) => {
    const haystack = normalize(text);
    return allUnits.find((unit) => (unitAliases.get(unit) ?? []).some((alias) => alias.length >= 2 && haystack.includes(alias))) ?? null;
  };

  const roles = new Map<string, TacticalRole>();
  const unitItems = new Map<string, string[]>();
  let hasSourceRoles = false;
  let hasSourceItems = false;

  const addItems = (unit: string, values: string[]) => {
    if (!values.length) return;
    const canonical = canonicalUnit(unit);
    const next = unique([...(unitItems.get(canonical) ?? []), ...values]).slice(0, 3);
    unitItems.set(canonical, next);
    hasSourceItems = true;
  };

  for (const note of comp.keyNotes) {
    const roleMatch = note.match(/^(CARRY|TANK|SECONDARY):\s*([^·]+?)(?:\s*·\s*(.*?))?(?:\s*·\s*(?:备选|alternatives?).*)?$/i);
    if (roleMatch) {
      const role = roleMatch[1].toUpperCase() as Exclude<TacticalRole, "FLEX">;
      const unit = canonicalUnit(roleMatch[2]);
      roles.set(unit, role);
      hasSourceRoles = true;
      if (roleMatch[3]) addItems(unit, findItems(roleMatch[3]));
      continue;
    }

    const mentionedUnit = findMentionedUnit(note);
    const mentionedItems = findItems(note);
    if (mentionedUnit && mentionedItems.length) addItems(mentionedUnit, mentionedItems);
  }

  const firstRole = (role: TacticalRole) => allUnits.find((unit) => roles.get(unit) === role) ?? null;
  let carry = firstRole("CARRY");
  if (!carry) {
    carry = coreUnits.find((unit) => (boardRows.get(unit) ?? -1) >= 2)
      ?? coreUnits[0]
      ?? allUnits.find((unit) => (boardRows.get(unit) ?? -1) >= 2)
      ?? allUnits[0]
      ?? null;
    if (carry) roles.set(carry, "CARRY");
  }

  let tank = firstRole("TANK");
  if (!tank) {
    tank = coreUnits
      .filter((unit) => unit !== carry && (boardRows.get(unit) ?? 4) <= 1)
      .sort((left, right) => (boardRows.get(left) ?? 4) - (boardRows.get(right) ?? 4))[0]
      ?? allUnits
        .filter((unit) => unit !== carry && (boardRows.get(unit) ?? 4) <= 1)
        .sort((left, right) => (boardRows.get(left) ?? 4) - (boardRows.get(right) ?? 4))[0]
      ?? null;
    if (tank) roles.set(tank, "TANK");
  }

  let secondary = firstRole("SECONDARY");
  if (!secondary) {
    secondary = coreUnits.find((unit) => !roles.has(unit) && (boardRows.get(unit) ?? -1) >= 2)
      ?? coreUnits.find((unit) => !roles.has(unit))
      ?? null;
    if (secondary) roles.set(secondary, "SECONDARY");
  }

  allUnits.forEach((unit) => {
    if (!roles.has(unit)) roles.set(unit, "FLEX");
  });

  for (const focus of comp.itemFocus) {
    const found = findItems(focus);
    if (!found.length) continue;
    const mentionedUnit = findMentionedUnit(focus);
    if (mentionedUnit) addItems(mentionedUnit, found);
    else if (carry) addItems(carry, found);
  }

  return {
    rolesByName: Object.fromEntries(roles),
    itemsByName: Object.fromEntries(unitItems),
    hasSourceRoles,
    hasSourceItems,
  };
}
