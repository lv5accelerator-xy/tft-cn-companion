"use client";

import { useEffect, useMemo, useState } from "react";
import UnitIcon from "../components/UnitIcon";
import BoardPreview from "../components/BoardPreview";
import BoardEditor from "../components/BoardEditor";
import { useLocale } from "../components/LocaleProvider";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { BUILDER_KEY, LOCAL_IMPORT_KEY, markWorkspaceChanged } from "@/lib/workspace";
import styles from "./builder.module.css";

const SHARE_PREFIX = "TFTC2:";
const LEGACY_SHARE_PREFIX = "TFTC1:";

type BuilderRole = "CARRY" | "TANK" | "SECONDARY";
type ItemAssignments = Record<string, string[]>;
type RoleAssignments = Record<string, BuilderRole>;

type ImportPayload = {
  name?: string;
  championIds?: string[];
  champions?: string[];
  board?: BoardPosition[];
  items?: ItemAssignments;
  roles?: RoleAssignments;
  itemsByName?: Record<string, string[]>;
  rolesByName?: Record<string, BuilderRole>;
};

type TraitPayload = {
  championTraits: Record<string, string[]>;
  traits: Record<string, { nameEn: string; nameZh: string; thresholds: number[] }>;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function encodeShare(payload: ImportPayload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `${SHARE_PREFIX}${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
}

function decodeShare(value: string): ImportPayload {
  const prefix = value.startsWith(SHARE_PREFIX) ? SHARE_PREFIX : LEGACY_SHARE_PREFIX;
  const encoded = value.slice(prefix.length).replace(/-/g, "+").replace(/_/g, "/");
  const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as ImportPayload;
}

function isBoardPosition(value: unknown): value is BoardPosition {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<BoardPosition>;
  return typeof entry.unit === "string"
    && Number.isInteger(entry.row)
    && Number.isInteger(entry.col)
    && Number(entry.row) >= 0
    && Number(entry.row) <= 3
    && Number(entry.col) >= 0
    && Number(entry.col) <= 6;
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT"
    && comp.syncOrigin === "manual"
    && typeof comp.id === "string"
    && typeof comp.name === "string"
    && Array.isArray(comp.coreUnits)
    && Array.isArray(comp.flexUnits);
}

function roleLabel(role: BuilderRole, locale: "zh" | "en") {
  const labels: Record<BuilderRole, [string, string]> = {
    CARRY: ["主C", "Carry"],
    TANK: ["主坦", "Tank"],
    SECONDARY: ["副C", "Secondary"],
  };
  return labels[role][locale === "zh" ? 0 : 1];
}

export default function BuilderPage() {
  const { locale, tr, nameOf, secondaryNameOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [traitPayload, setTraitPayload] = useState<TraitPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingPayload, setPendingPayload] = useState<ImportPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [compName, setCompName] = useState("我的阵容");
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState<number | null>(null);
  const [board, setBoard] = useState<BoardPosition[]>([]);
  const [items, setItems] = useState<ItemAssignments>({});
  const [roles, setRoles] = useState<RoleAssignments>({});
  const [activeChampionId, setActiveChampionId] = useState<string | null>(null);
  const [itemQuery, setItemQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()),
      fetch("/api/tft-trait-map").then((response) => response.ok ? response.json() as Promise<TraitPayload> : Promise.reject()),
    ]).then(([catalogPayload, traits]) => {
      setCatalog(catalogPayload);
      setTraitPayload(traits);
    }).catch(() => {
      fetch("/api/tft")
        .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
        .then(setCatalog)
        .catch(() => setCatalog(null));
    });
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BUILDER_KEY);
      if (raw) setPendingPayload(JSON.parse(raw) as ImportPayload);
      const imported = JSON.parse(window.localStorage.getItem(LOCAL_IMPORT_KEY) || "[]") as unknown[];
      setLocalComps(imported.filter(isManualComp));
    } catch {
      // Ignore malformed local state.
    }
  }, []);

  const champions = catalog?.champions ?? [];
  const allItems = catalog?.items ?? [];
  const selected = selectedIds
    .map((id) => champions.find((champion) => champion.id === id))
    .filter((entry): entry is CatalogEntry => Boolean(entry));

  const championLookup = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => {
      map.set(normalize(champion.id), champion);
      map.set(normalize(champion.nameEn), champion);
      map.set(normalize(champion.nameZh), champion);
    });
    return map;
  }, [champions]);

  const itemLookup = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    allItems.forEach((item) => {
      map.set(normalize(item.id), item);
      map.set(normalize(item.nameEn), item);
      map.set(normalize(item.nameZh), item);
      (item.aliases ?? []).forEach((alias) => map.set(normalize(alias), item));
    });
    return map;
  }, [allItems]);

  function persist(
    nextIds: string[],
    name = compName,
    nextBoard = board,
    nextItems = items,
    nextRoles = roles,
  ) {
    const allowed = new Set(nextIds);
    const cleanItems = Object.fromEntries(Object.entries(nextItems).filter(([id]) => allowed.has(id)).map(([id, value]) => [id, value.slice(0, 3)]));
    const cleanRoles = Object.fromEntries(Object.entries(nextRoles).filter(([id]) => allowed.has(id))) as RoleAssignments;
    setSelectedIds(nextIds);
    setBoard(nextBoard);
    setItems(cleanItems);
    setRoles(cleanRoles);
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({
        name,
        championIds: nextIds,
        champions: nextIds.map((id) => champions.find((unit) => unit.id === id)?.nameEn).filter(Boolean),
        board: nextBoard,
        items: cleanItems,
        roles: cleanRoles,
        updatedAt: Date.now(),
      }));
      markWorkspaceChanged();
    } catch {
      // Keep UI state even if localStorage is unavailable.
    }
  }

  useEffect(() => {
    if (!pendingPayload || !champions.length || !allItems.length) return;
    const ids: string[] = [];
    for (const id of pendingPayload.championIds ?? []) {
      const champion = championLookup.get(normalize(id));
      if (champion && !ids.includes(champion.id)) ids.push(champion.id);
    }
    for (const name of pendingPayload.champions ?? []) {
      const cleaned = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
      const champion = championLookup.get(normalize(cleaned));
      if (champion && !ids.includes(champion.id)) ids.push(champion.id);
    }
    const finalIds = ids.slice(0, 10);
    const selectedNames = new Set(finalIds.map((id) => champions.find((unit) => unit.id === id)?.nameEn).filter((value): value is string => Boolean(value)).map(normalize));
    const resolvedBoard = (pendingPayload.board ?? [])
      .filter(isBoardPosition)
      .map((position) => {
        const unit = championLookup.get(normalize(position.unit));
        return unit ? { ...position, unit: unit.nameEn } : position;
      })
      .filter((position) => selectedNames.has(normalize(position.unit)));

    const resolvedItems: ItemAssignments = {};
    const resolveItemSet = (championKey: string, itemKeys: string[]) => {
      const champion = championLookup.get(normalize(championKey));
      if (!champion || !finalIds.includes(champion.id)) return;
      const itemIds = itemKeys.map((key) => itemLookup.get(normalize(key))?.id).filter((value): value is string => Boolean(value));
      if (itemIds.length) resolvedItems[champion.id] = Array.from(new Set(itemIds)).slice(0, 3);
    };
    Object.entries(pendingPayload.items ?? {}).forEach(([key, value]) => {
      const champion = championLookup.get(normalize(key));
      if (champion) resolveItemSet(champion.id, value);
    });
    Object.entries(pendingPayload.itemsByName ?? {}).forEach(([key, value]) => resolveItemSet(key, value));

    const resolvedRoles: RoleAssignments = {};
    const resolveRole = (key: string, role: BuilderRole) => {
      const champion = championLookup.get(normalize(key));
      if (champion && finalIds.includes(champion.id)) resolvedRoles[champion.id] = role;
    };
    Object.entries(pendingPayload.roles ?? {}).forEach(([key, role]) => resolveRole(key, role));
    Object.entries(pendingPayload.rolesByName ?? {}).forEach(([key, role]) => resolveRole(key, role));

    const nextName = pendingPayload.name?.trim() || compName;
    setCompName(nextName);
    persist(finalIds, nextName, resolvedBoard, resolvedItems, resolvedRoles);
    setActiveChampionId(finalIds[0] ?? null);
    setPendingPayload(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems.length, champions.length, pendingPayload]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return champions.filter((champion) => {
      if (cost && champion.tier !== cost) return false;
      if (!q) return true;
      return normalize(`${champion.nameZh} ${champion.nameEn} ${champion.id}`).includes(q);
    });
  }, [champions, cost, query]);

  const grouped = useMemo(() => [1, 2, 3, 4, 5].map((tier) => ({ tier, units: filtered.filter((unit) => unit.tier === tier) })), [filtered]);
  const allMetaComps = useMemo(() => [...localComps, ...metaComps], [localComps]);

  const recommendations = useMemo(() => {
    const selectedNames = new Set(selected.map((unit) => normalize(unit.nameEn)));
    return allMetaComps
      .map((comp) => {
        const pool = [...comp.coreUnits, ...comp.flexUnits].map(normalize);
        const overlap = pool.filter((name) => selectedNames.has(name)).length;
        const coreOverlap = comp.coreUnits.map(normalize).filter((name) => selectedNames.has(name)).length;
        return { comp, overlap, coreOverlap, score: coreOverlap * 3 + overlap };
      })
      .filter((entry) => entry.overlap > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [allMetaComps, selected]);

  const traitStats = useMemo(() => {
    if (!traitPayload) return [];
    const counts = new Map<string, number>();
    selected.forEach((unit) => {
      (traitPayload.championTraits[unit.nameEn] ?? []).forEach((trait) => counts.set(trait, (counts.get(trait) ?? 0) + 1));
    });
    return Array.from(counts.entries()).map(([name, count]) => {
      const meta = traitPayload.traits[name] ?? { nameEn: name, nameZh: name, thresholds: [] };
      const active = [...meta.thresholds].filter((value) => value <= count).pop() ?? null;
      const next = meta.thresholds.find((value) => value > count) ?? null;
      return { ...meta, count, active, next };
    }).sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || b.count - a.count || a.nameEn.localeCompare(b.nameEn));
  }, [selected, traitPayload]);

  const activeChampion = activeChampionId ? champions.find((unit) => unit.id === activeChampionId) ?? null : null;
  const equippedItems = activeChampion ? (items[activeChampion.id] ?? []).map((id) => allItems.find((item) => item.id === id)).filter((item): item is CatalogEntry => Boolean(item)) : [];
  const equipableItems = useMemo(() => {
    const q = normalize(itemQuery);
    return allItems.filter((item) => ["completed", "artifact", "emblem"].includes(item.subtype ?? ""))
      .filter((item) => !q || normalize(`${item.nameZh} ${item.nameEn} ${(item.aliases ?? []).join(" ")}`).includes(q))
      .slice(0, 90);
  }, [allItems, itemQuery]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      const unit = champions.find((champion) => champion.id === id);
      const nextBoard = unit ? board.filter((position) => normalize(position.unit) !== normalize(unit.nameEn)) : board;
      persist(selectedIds.filter((item) => item !== id), compName, nextBoard, items, roles);
      if (activeChampionId === id) setActiveChampionId(selectedIds.find((item) => item !== id) ?? null);
      return;
    }
    if (selectedIds.length >= 10) return;
    const next = [...selectedIds, id];
    persist(next);
    setActiveChampionId(id);
  }

  function loadMetaComp(comp: UnifiedMetaComp) {
    const ids = [...comp.coreUnits, ...comp.flexUnits]
      .map((name) => championLookup.get(normalize(name))?.id)
      .filter((id): id is string => Boolean(id))
      .filter((id, index, array) => array.indexOf(id) === index)
      .slice(0, 10);
    setCompName(comp.nameZh);
    persist(ids, comp.nameZh, comp.board, {}, {});
    setActiveChampionId(ids[0] ?? null);
  }

  function changeBoard(nextBoard: BoardPosition[]) {
    persist(selectedIds, compName, nextBoard, items, roles);
  }

  function assignItem(itemId: string) {
    if (!activeChampion) return;
    const current = items[activeChampion.id] ?? [];
    const next = current.includes(itemId) ? current.filter((id) => id !== itemId) : current.length < 3 ? [...current, itemId] : [current[1], current[2], itemId];
    persist(selectedIds, compName, board, { ...items, [activeChampion.id]: next }, roles);
  }

  function assignRole(role: BuilderRole) {
    if (!activeChampion) return;
    const nextRoles = { ...roles };
    if (nextRoles[activeChampion.id] === role) delete nextRoles[activeChampion.id];
    else nextRoles[activeChampion.id] = role;
    persist(selectedIds, compName, board, items, nextRoles);
  }

  async function copyHumanList() {
    const text = `${compName}: ${selected.map((unit) => `${unit.nameZh} (${unit.nameEn})`).join(" / ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(tr("名单已复制", "Roster copied"));
      window.setTimeout(() => setCopyStatus(""), 1300);
    } catch {
      setCopyStatus(tr("复制失败", "Copy failed"));
    }
  }

  async function copyShareCode() {
    const code = encodeShare({ name: compName, championIds: selectedIds, champions: selected.map((unit) => unit.nameEn), board, items, roles });
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus(tr("V1 阵容码已复制", "V1 share code copied"));
      window.setTimeout(() => setCopyStatus(""), 1300);
    } catch {
      setCopyStatus(tr("复制失败", "Copy failed"));
    }
  }

  function rename(value: string) {
    setCompName(value);
    persist(selectedIds, value, board, items, roles);
  }

  function parseImport(value: string): ImportPayload {
    const trimmed = value.trim();
    if (!trimmed) throw new Error(tr("请先粘贴阵容码、JSON 或英雄名单。", "Paste a share code, JSON, or champion list first."));
    if (trimmed.startsWith(SHARE_PREFIX) || trimmed.startsWith(LEGACY_SHARE_PREFIX)) return decodeShare(trimmed);
    if (trimmed.startsWith("{")) return JSON.parse(trimmed) as ImportPayload;
    return { champions: trimmed.split(/[\n,，;；|/]+/).map((item) => item.trim()).filter(Boolean) };
  }

  function applyImport() {
    try {
      const payload = parseImport(importText);
      setPendingPayload(payload);
      setImportError("");
      setImportOpen(false);
      setImportText("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : tr("无法识别这个阵容。", "Unable to parse this comp."));
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.version}>V1.0 · Builder Pro</span>
          <h1>Team Builder</h1>
          <p>{tr("编辑英雄、4×7 站位、三件装备与主C/主坦角色；分享码会完整保留这些信息。", "Edit champions, 4×7 positioning, three items per unit and carry/tank roles. V1 share codes preserve everything.")}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => setImportOpen((value) => !value)}>{tr("导入阵容", "Import")}</button>
          <button className={styles.button} onClick={() => persist([], compName, [], {}, {})}>{tr("清空", "Clear")}</button>
          <button className={styles.button} onClick={copyHumanList}>{tr("复制名单", "Copy roster")}</button>
          <button className={`${styles.button} ${styles.primary}`} onClick={copyShareCode}>{tr("复制 V1 阵容码", "Copy V1 code")}</button>
        </div>
      </header>

      {copyStatus && <div className={styles.toast}>{copyStatus}</div>}

      {importOpen && (
        <section className={styles.importPanel}>
          <div className={styles.importHead}>
            <div><strong>{tr("导入阵容", "Import Team Comp")}</strong><span>{tr("支持 TFTC2 / 旧 TFTC1 分享码、JSON 或中英文英雄名单。", "Supports TFTC2, legacy TFTC1, JSON, or Chinese/English champion lists.")}</span></div>
            <button className={styles.button} onClick={() => setImportOpen(false)}>{tr("关闭", "Close")}</button>
          </div>
          <textarea value={importText} onChange={(event) => { setImportText(event.target.value); setImportError(""); }} placeholder={tr("粘贴 TFTC2: 开头的阵容码，或英雄名单", "Paste a TFTC2 share code or champion list")} />
          <div className={styles.importFoot}><span className={styles.importError}>{importError}</span><button className={`${styles.button} ${styles.primary}`} onClick={applyImport}>{tr("导入到 Builder", "Import to Builder")}</button></div>
        </section>
      )}

      <section className={styles.rosterPanel}>
        <div className={styles.boardHead}>
          <input value={compName} onChange={(event) => rename(event.target.value)} className={styles.nameInput} aria-label={tr("阵容名称", "Comp name")} />
          <span>{selectedIds.length}/10 {tr("英雄", "champions")}</span>
        </div>
        <div className={styles.slots}>
          {Array.from({ length: 10 }).map((_, index) => {
            const champion = selected[index];
            if (!champion) return <div className={styles.slot} key={`empty-${index}`} />;
            const unitItems = (items[champion.id] ?? []).map((id) => allItems.find((item) => item.id === id)).filter((item): item is CatalogEntry => Boolean(item));
            return (
              <button className={`${styles.slot} ${styles.filled} ${activeChampionId === champion.id ? styles.activeSlot : ""}`} key={champion.id} onClick={() => setActiveChampionId(champion.id)} title={tr("点击编辑；在下方英雄池再次点击可移除", "Click to edit; click again in the champion pool to remove") }>
                <div className={styles.unitTop}><UnitIcon entry={champion} size={48} />{roles[champion.id] && <b className={styles.roleBadge}>{roleLabel(roles[champion.id], locale)}</b>}</div>
                <span>{nameOf(champion)}</span>
                <div className={styles.miniItems}>{unitItems.map((item) => <UnitIcon key={item.id} entry={item} size={20} />)}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.builderGrid}>
        <article className={styles.boardPanel}>
          <BoardEditor roster={selected} positions={board} onChange={changeBoard} />
        </article>

        <aside className={styles.inspector}>
          {activeChampion ? (
            <>
              <div className={styles.inspectorHead}>
                <UnitIcon entry={activeChampion} size={56} />
                <div><strong>{nameOf(activeChampion)}</strong><span>{secondaryNameOf(activeChampion)}</span></div>
              </div>
              <div className={styles.roleRow}>
                {(["CARRY", "TANK", "SECONDARY"] as BuilderRole[]).map((role) => <button key={role} className={roles[activeChampion.id] === role ? styles.roleActive : ""} onClick={() => assignRole(role)}>{roleLabel(role, locale)}</button>)}
              </div>
              <div className={styles.equipped}>
                <div className={styles.sectionTitle}><strong>{tr("装备", "Items")}</strong><span>{equippedItems.length}/3</span></div>
                <div className={styles.equippedSlots}>{[0,1,2].map((index) => equippedItems[index] ? <button key={index} onClick={() => assignItem(equippedItems[index].id)} title={`${equippedItems[index].nameZh} / ${equippedItems[index].nameEn}`}><UnitIcon entry={equippedItems[index]} size={38} /></button> : <div key={index} />)}</div>
              </div>
              <input className={styles.itemSearch} value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder={tr("搜索装备…", "Search items…")} />
              <div className={styles.itemPicker}>{equipableItems.map((item) => <button key={item.id} className={(items[activeChampion.id] ?? []).includes(item.id) ? styles.itemActive : ""} onClick={() => assignItem(item.id)} title={`${item.nameZh} / ${item.nameEn}`}><UnitIcon entry={item} size={32} /><span>{nameOf(item)}</span></button>)}</div>
            </>
          ) : <div className={styles.emptyInspector}>{tr("先选择一个英雄，即可编辑角色和装备。", "Select a champion to edit role and items.")}</div>}
        </aside>
      </section>

      <section className={styles.traitsPanel}>
        <div className={styles.recommendHead}><strong>{tr("实时羁绊", "Live Traits")}</strong><span>{tr("按当前 Builder 英雄计算，不读取对局", "Calculated from Builder roster only")}</span></div>
        {traitStats.length ? <div className={styles.traitGrid}>{traitStats.map((trait) => <div className={`${styles.traitCard} ${trait.active ? styles.traitActive : ""}`} key={trait.nameEn}><strong>{locale === "zh" ? trait.nameZh : trait.nameEn}</strong><b>{trait.count}</b><span>{trait.active ? tr(`已激活 ${trait.active}`, `Active ${trait.active}`) : tr("未激活", "Inactive")}{trait.next ? tr(` · 距下一档 ${trait.next - trait.count}`, ` · ${trait.next - trait.count} to next`) : ""}</span></div>)}</div> : <div className={styles.empty}>{tr("选择英雄后显示羁绊统计。", "Select champions to see trait counts.")}</div>}
      </section>

      <section className={styles.recommend}>
        <div className={styles.recommendHead}><strong>{tr("基于英雄的阵容推荐", "Champion-Based Recommendations")}</strong><span>{tr("仅根据你手动选择的英雄匹配", "Matches only the champions you selected")}</span></div>
        {recommendations.length ? <div className={styles.recGrid}>{recommendations.map(({ comp, overlap, coreOverlap }) => <div className={styles.recCard} key={`${comp.sourceId}-${comp.id}`}><div className={styles.recMeta}><div><strong>{locale === "zh" ? comp.nameZh : comp.name}</strong><span>{locale === "zh" ? comp.name : comp.nameZh}</span><span>{comp.source} · {comp.playstyle} · {comp.tier}</span><span className={styles.recScore}>{tr(`匹配 ${overlap} 个英雄 · 核心命中 ${coreOverlap}`, `${overlap} matched · ${coreOverlap} core`)}</span></div><button className={`${styles.button} ${styles.primary}`} onClick={() => loadMetaComp(comp)}>{tr("载入", "Load")}</button></div><BoardPreview positions={comp.board} champions={champions} compact /><p className={styles.positionNote}>{comp.positioningNote}</p></div>)}</div> : <div className={styles.empty}>{tr("选择几个英雄后，这里会推荐已收录的当前版本阵容。", "Select a few champions to match against saved meta comps.")}</div>}
      </section>

      <section className={styles.toolbar}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("搜索英雄", "Search champions")} />
        <div className={styles.chips}><button className={`${styles.chip} ${cost === null ? styles.active : ""}`} onClick={() => setCost(null)}>{tr("全部", "All")}</button>{[1,2,3,4,5].map((value) => <button key={value} className={`${styles.chip} ${cost === value ? styles.active : ""}`} onClick={() => setCost(value)}>{value} Cost</button>)}</div>
      </section>

      <section className={styles.pool}>{grouped.map((group) => group.units.length ? <div className={styles.costGroup} key={group.tier}><div className={styles.costTitle}><span>{group.tier} Cost</span><span className={styles.costLine} /></div><div className={styles.units}>{group.units.map((champion) => { const active = selectedIds.includes(champion.id); return <button key={champion.id} className={`${styles.unit} ${active ? styles.selected : ""}`} onClick={() => toggle(champion.id)}><UnitIcon entry={champion} size={48} /><span>{nameOf(champion)}</span><small>{secondaryNameOf(champion)}</small></button>; })}</div></div> : null)}</section>
    </div>
  );
}
