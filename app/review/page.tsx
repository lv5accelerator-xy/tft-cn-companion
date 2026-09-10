"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import BoardPreview from "../components/BoardPreview";
import { useLocale } from "../components/LocaleProvider";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { BoardPosition } from "@/data/comps";
import type { CatalogEntry, TftCatalogPayload } from "@/data/tft";
import { deriveStageBoardPlans } from "@/lib/stage-board";
import { deriveTacticalBoardPlan, type TacticalRole } from "@/lib/tactical-board";
import {
  REVIEW_ISSUE_TAGS,
  buildReviewSummary,
  parseReviewDraft,
  parseReviewHistory,
  reviewTagLabel,
  type ReviewDraft,
  type ReviewRecord,
  type ReviewRef,
} from "@/lib/review";
import {
  BUILDER_KEY,
  FOCUS_KEY,
  FOCUS_STAGE_OVERRIDES_KEY,
  FOCUS_TRAY_KEY,
  LOCAL_IMPORT_KEY,
  REVIEW_DRAFT_KEY,
  REVIEW_HISTORY_KEY,
  markWorkspaceChanged,
} from "@/lib/workspace";
import styles from "./review.module.css";

type FocusState = {
  sourceId?: string;
  id?: string;
  stageIndex?: number;
  mirrored?: boolean;
  updatedAt?: number;
};

type StageOverride = {
  rolesByName?: Record<string, TacticalRole>;
  itemsByName?: Record<string, string[]>;
};

type StageOverrideStore = Record<string, Record<string, StageOverride>>;

type BuilderSnapshot = {
  name?: string;
  sourceId?: string;
  sourceCompId?: string;
  stage?: string;
  board?: BoardPosition[];
  championIds?: string[];
  champions?: string[];
  items?: Record<string, string[]>;
  roles?: Record<string, TacticalRole>;
  itemsByName?: Record<string, string[]>;
  rolesByName?: Record<string, TacticalRole>;
  updatedAt?: number;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[’]/g, "'");
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.sourceId === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.board);
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

function parseCandidateRefs(value: unknown): ReviewRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => entry as Partial<ReviewRef>)
    .filter((entry): entry is ReviewRef => typeof entry.sourceId === "string" && typeof entry.id === "string")
    .slice(0, 3);
}

function parseLevelHint(value: string) {
  const matches = value.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];
  return Math.min(10, Math.max(4, matches.at(-1) ?? 8));
}

function formatDate(value: number, locale: "zh" | "en") {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-CA", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function recordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ReviewPage() {
  const { locale, tr } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [history, setHistory] = useState<ReviewRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    fetch("/api/tft")
      .then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject())
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const champions = catalog?.champions ?? [];
  const allItems = catalog?.items ?? [];

  const championLookup = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    champions.forEach((champion) => {
      [champion.id, champion.nameEn, champion.nameZh, ...(champion.aliases ?? [])].forEach((name) => {
        if (name) map.set(normalize(name), champion);
      });
    });
    return map;
  }, [champions]);

  const itemLookup = useMemo(() => {
    const map = new Map<string, CatalogEntry>();
    allItems.forEach((item) => {
      [item.id, item.nameEn, item.nameZh, ...(item.aliases ?? [])].forEach((name) => {
        if (name) map.set(normalize(name), item);
      });
    });
    return map;
  }, [allItems]);

  function seedFromCurrent(): ReviewDraft | null {
    if (!catalog) return null;
    const importedValue = safeParse(window.localStorage.getItem(LOCAL_IMPORT_KEY));
    const localComps = Array.isArray(importedValue) ? importedValue.filter(isManualComp) : [];
    const allComps = [...localComps, ...metaComps];
    const focus = (safeParse(window.localStorage.getItem(FOCUS_KEY)) ?? {}) as FocusState;
    const comp = focus.sourceId && focus.id
      ? allComps.find((entry) => entry.sourceId === focus.sourceId && entry.id === focus.id) ?? allComps[0]
      : allComps[0];
    if (!comp) return null;

    const tactical = deriveTacticalBoardPlan(comp, champions, allItems);
    const stagePlans = deriveStageBoardPlans(comp, champions, tactical);
    const stageIndex = Math.max(0, Math.min(Number(focus.stageIndex) || 0, Math.max(0, stagePlans.length - 1)));
    const stagePlan = stagePlans[stageIndex] ?? stagePlans.at(-1);
    const activeStage = comp.stages[stageIndex] ?? comp.stages.at(-1);
    const overrideStoreValue = safeParse(window.localStorage.getItem(FOCUS_STAGE_OVERRIDES_KEY));
    const overrideStore = overrideStoreValue && typeof overrideStoreValue === "object" && !Array.isArray(overrideStoreValue)
      ? overrideStoreValue as StageOverrideStore
      : {};
    const override = activeStage ? overrideStore[`${comp.sourceId}:${comp.id}`]?.[activeStage.stage] : undefined;
    const mirrored = Boolean(focus.mirrored);
    const focusBoard = (stagePlan?.board ?? comp.board).map((position) => mirrored ? { ...position, col: (6 - position.col) as BoardPosition["col"] } : { ...position });
    let finalBoard = focusBoard;
    let rolesByName = { ...(override?.rolesByName ?? stagePlan?.rolesByName ?? tactical.rolesByName) };
    let itemsByName = Object.fromEntries(Object.entries(override?.itemsByName ?? stagePlan?.itemsByName ?? tactical.itemsByName).map(([unit, items]) => [unit, [...items].slice(0, 3)]));
    let captureSource: ReviewDraft["captureSource"] = "focus";
    let focusStage = activeStage?.stage ?? stagePlan?.stage ?? "Stage 4";

    const builderValue = safeParse(window.localStorage.getItem(BUILDER_KEY));
    const builder = builderValue && typeof builderValue === "object" && !Array.isArray(builderValue) ? builderValue as BuilderSnapshot : null;
    const builderBoard = builder?.board?.filter(isBoardPosition) ?? [];
    const builderName = normalize(builder?.name ?? "");
    const compNames = [comp.name, comp.nameZh].map(normalize).filter(Boolean);
    const builderMatches = Boolean(builder && (
      (builder.sourceId === comp.sourceId && builder.sourceCompId === comp.id)
      || compNames.some((name) => name.length >= 2 && builderName.includes(name))
    ));
    const focusUpdatedAt = Number(focus.updatedAt) || 0;
    const builderUpdatedAt = Number(builder?.updatedAt) || 0;

    if (builder && builderMatches && builderBoard.length && builderUpdatedAt >= focusUpdatedAt) {
      finalBoard = builderBoard.map((position) => {
        const champion = championLookup.get(normalize(position.unit));
        return champion ? { ...position, unit: champion.nameEn } : { ...position };
      });
      const nextRoles: Record<string, TacticalRole> = {};
      const roleSources = [builder.roles ?? {}, builder.rolesByName ?? {}];
      roleSources.forEach((source) => Object.entries(source).forEach(([key, role]) => {
        const champion = championLookup.get(normalize(key));
        if (champion && (role === "CARRY" || role === "TANK" || role === "SECONDARY" || role === "FLEX")) nextRoles[champion.nameEn] = role;
      }));
      const nextItems: Record<string, string[]> = {};
      const itemSources = [builder.items ?? {}, builder.itemsByName ?? {}];
      itemSources.forEach((source) => Object.entries(source).forEach(([key, values]) => {
        const champion = championLookup.get(normalize(key));
        if (!champion || !Array.isArray(values)) return;
        const resolved = values
          .map((value) => itemLookup.get(normalize(value))?.nameEn ?? value)
          .filter(Boolean)
          .slice(0, 3);
        if (resolved.length) nextItems[champion.nameEn] = Array.from(new Set(resolved));
      }));
      if (Object.keys(nextRoles).length) rolesByName = nextRoles;
      if (Object.keys(nextItems).length) itemsByName = nextItems;
      captureSource = "builder";
      focusStage = builder.stage || focusStage;
    }

    const trayRefs = parseCandidateRefs(safeParse(window.localStorage.getItem(FOCUS_TRAY_KEY)));
    const levelHint = stagePlan?.level ?? "8";
    const now = Date.now();
    return {
      sourceId: comp.sourceId,
      compId: comp.id,
      patch: comp.patch,
      plannedNameZh: comp.nameZh,
      plannedNameEn: comp.name,
      source: comp.source,
      playstyle: comp.playstyle,
      plannedBoard: comp.board.map((position) => ({ ...position })),
      finalBoard,
      rolesByName,
      itemsByName,
      candidateRefs: trayRefs,
      focusStage,
      levelHint,
      captureSource,
      capturedAt: now,
      placement: 4,
      level: parseLevelHint(levelHint),
      endStage: "",
      tags: [],
      note: "",
      updatedAt: now,
    };
  }

  useEffect(() => {
    if (!catalog || initialized.current) return;
    initialized.current = true;
    const historyValue = safeParse(window.localStorage.getItem(REVIEW_HISTORY_KEY));
    setHistory(parseReviewHistory(historyValue));
    const savedDraft = parseReviewDraft(safeParse(window.localStorage.getItem(REVIEW_DRAFT_KEY)));
    setDraft(savedDraft ?? seedFromCurrent());
    // seedFromCurrent intentionally reads one snapshot after the TFT catalog is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  useEffect(() => {
    if (!initialized.current) return;
    try {
      if (draft) window.localStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }));
      else window.localStorage.removeItem(REVIEW_DRAFT_KEY);
    } catch {
      // Keep the active editor usable when local persistence is unavailable.
    }
  }, [draft]);

  const summaries = useMemo(() => draft ? buildReviewSummary(draft, locale) : [], [draft, locale]);

  const stats = useMemo(() => {
    if (!history.length) return { games: 0, average: 0, top4: 0, wins: 0 };
    const placements = history.map((record) => record.placement);
    return {
      games: history.length,
      average: placements.reduce((sum, value) => sum + value, 0) / placements.length,
      top4: placements.filter((value) => value <= 4).length / placements.length,
      wins: placements.filter((value) => value === 1).length / placements.length,
    };
  }, [history]);

  const compStats = useMemo(() => {
    const groups = new Map<string, { name: string; games: number; placement: number; top4: number }>();
    history.forEach((record) => {
      const key = `${record.sourceId}:${record.compId}`;
      const current = groups.get(key) ?? { name: locale === "zh" ? record.plannedNameZh : record.plannedNameEn, games: 0, placement: 0, top4: 0 };
      current.games += 1;
      current.placement += record.placement;
      if (record.placement <= 4) current.top4 += 1;
      groups.set(key, current);
    });
    return [...groups.values()]
      .map((group) => ({ ...group, average: group.placement / group.games, top4Rate: group.top4 / group.games }))
      .sort((left, right) => right.games - left.games || left.average - right.average)
      .slice(0, 6);
  }, [history, locale]);

  const selectedRecord = history.find((record) => record.id === selectedId) ?? null;

  function updateDraft(patch: Partial<ReviewDraft>) {
    setDraft((current) => current ? { ...current, ...patch, updatedAt: Date.now() } : current);
    setMessage("");
  }

  function toggleTag(tag: ReviewDraft["tags"][number]) {
    if (!draft) return;
    updateDraft({ tags: draft.tags.includes(tag) ? draft.tags.filter((entry) => entry !== tag) : [...draft.tags, tag] });
  }

  function resetFromCurrent() {
    const next = seedFromCurrent();
    setDraft(next);
    setSelectedId("");
    setMessage(next ? tr("已重新读取当前 Focus / Builder 状态。", "Reloaded the current Focus / Builder state.") : tr("没有找到可复盘的当前阵容。", "No current comp was available to review."));
  }

  function saveReview() {
    if (!draft) return;
    const now = Date.now();
    const record: ReviewRecord = { ...draft, id: recordId(), createdAt: now, updatedAt: now };
    const next = [record, ...history].slice(0, 100);
    setHistory(next);
    setSelectedId(record.id);
    setDraft(null);
    try {
      window.localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(next));
      window.localStorage.removeItem(REVIEW_DRAFT_KEY);
      markWorkspaceChanged();
      setMessage(tr("本局复盘已保存，并已纳入云工作区同步。", "Review saved and included in cloud workspace sync."));
    } catch {
      setMessage(tr("复盘已保留在当前页面，但本地保存失败。", "The review remains on this page, but local persistence failed."));
    }
  }

  function deleteReview(id: string) {
    const next = history.filter((record) => record.id !== id);
    setHistory(next);
    if (selectedId === id) setSelectedId("");
    try {
      window.localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(next));
      markWorkspaceChanged();
    } catch {
      // UI still reflects the deletion for this session.
    }
  }

  if (!catalog) {
    return <div className={styles.empty}><strong>{tr("正在准备赛后复盘…", "Preparing Review Center…")}</strong><span>{tr("正在加载英雄与装备数据。", "Loading champion and item data.")}</span></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>V1.3 · POST-GAME REVIEW</span>
          <h1>{tr("赛后复盘中心", "Review Center")}</h1>
          <p>{tr("把本局计划、实际棋盘、名次和失误原因放在一起。当前版本先积累你自己的对局样本，不依赖 Riot API。", "Combine the planned comp, actual board, placement and mistakes. This version builds your own match history without Riot API dependency.")}</p>
        </div>
        <div className={styles.headingActions}>
          <button onClick={resetFromCurrent}>↻ {tr("读取当前对局", "Reload current game")}</button>
          <Link href="/focus">◉ {tr("返回对局模式", "Back to Focus")}</Link>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <article><span>{tr("已复盘", "Reviewed")}</span><strong>{stats.games}</strong><small>{tr("局", "games")}</small></article>
        <article><span>{tr("平均名次", "Avg placement")}</span><strong>{stats.games ? stats.average.toFixed(2) : "—"}</strong><small>{tr("越低越好", "lower is better")}</small></article>
        <article><span>{tr("前四率", "Top 4 rate")}</span><strong>{stats.games ? `${Math.round(stats.top4 * 100)}%` : "—"}</strong><small>Top 4</small></article>
        <article><span>{tr("吃鸡率", "Win rate")}</span><strong>{stats.games ? `${Math.round(stats.wins * 100)}%` : "—"}</strong><small>1st</small></article>
      </section>

      {message ? <div className={styles.message}>{message}</div> : null}

      {draft ? (
        <>
          <section className={styles.resultCard}>
            <div className={styles.resultIdentity}>
              <span>{draft.captureSource === "builder" ? tr("BUILDER 最终快照", "BUILDER FINAL SNAPSHOT") : tr("STAGE BOARD 快照", "STAGE BOARD SNAPSHOT")}</span>
              <h2>{locale === "zh" ? draft.plannedNameZh : draft.plannedNameEn}</h2>
              <p>{draft.source} · Patch {draft.patch} · {draft.playstyle}</p>
            </div>
            <div className={styles.placementPicker}>
              <span>{tr("最终名次", "Placement")}</span>
              <div>{[1, 2, 3, 4, 5, 6, 7, 8].map((placement) => <button key={placement} className={draft.placement === placement ? styles.placementActive : ""} onClick={() => updateDraft({ placement })}>{placement}</button>)}</div>
            </div>
          </section>

          <div className={styles.editorGrid}>
            <section className={styles.formCard}>
              <div className={styles.cardHead}><div><h2>{tr("本局结果", "Game result")}</h2><p>{tr("只记录赛后事实，不做实时对局决策。", "Record post-game facts only; no live gameplay decisions.")}</p></div></div>
              <div className={styles.fieldGrid}>
                <label><span>{tr("结束等级", "Final level")}</span><select value={draft.level} onChange={(event) => updateDraft({ level: Number(event.target.value) })}>{[4, 5, 6, 7, 8, 9, 10].map((level) => <option value={level} key={level}>Lv. {level}</option>)}</select></label>
                <label><span>{tr("结束阶段", "End stage")}</span><input value={draft.endStage} onChange={(event) => updateDraft({ endStage: event.target.value })} placeholder="5-3" maxLength={12} /></label>
                <label><span>{tr("进入复盘时的计划阶段", "Plan phase at review")}</span><input value={draft.focusStage} readOnly /></label>
                <label><span>{tr("该阶段等级参考", "Stage level hint")}</span><input value={`Lv. ${draft.levelHint}`} readOnly /></label>
              </div>

              <div className={styles.tagBlock}>
                <span>{tr("主要问题标签", "Primary issue tags")}</span>
                <div>{REVIEW_ISSUE_TAGS.map((tag) => <button key={tag} className={draft.tags.includes(tag) ? styles.tagActive : ""} onClick={() => toggleTag(tag)}>{reviewTagLabel(tag, locale)}</button>)}</div>
              </div>

              <label className={styles.noteField}><span>{tr("一句复盘", "Review note")}</span><textarea value={draft.note} onChange={(event) => updateDraft({ note: event.target.value })} placeholder={tr("例：4-2 上 8 后搜得太浅，主坦没二星；下局血量低于 45 时提前启动。", "Example: Rolled too shallow after level 8 at 4-2; frontline stayed 1-star. Start earlier next game below 45 HP.")} maxLength={1000} /></label>

              <div className={styles.saveBar}>
                <span>{tr("编辑内容会自动保存为草稿；正式保存后进入历史统计。", "Edits auto-save as a draft; save the review to include it in history stats.")}</span>
                <button onClick={saveReview}>{tr("保存本局复盘", "Save review")}</button>
              </div>
            </section>

            <section className={styles.summaryCard}>
              <div className={styles.cardHead}><div><h2>{tr("自动总结", "Auto summary")}</h2><p>{tr("根据计划棋盘、实际快照、角色装备和标签生成。", "Generated from the planned board, actual snapshot, roles, items and tags.")}</p></div></div>
              <ol>{summaries.map((summary) => <li key={summary}>{summary}</li>)}</ol>
              <div className={styles.candidateBlock}><span>{tr("本局候选阵容", "Candidate tray")}</span><div>{draft.candidateRefs.length ? draft.candidateRefs.map((ref, index) => { const comp = [...metaComps].find((entry) => entry.sourceId === ref.sourceId && entry.id === ref.id); return <b key={`${ref.sourceId}:${ref.id}`}>{index + 1}. {comp ? (locale === "zh" ? comp.nameZh : comp.name) : ref.id}</b>; }) : <em>{tr("未记录候选阵容", "No candidate tray recorded")}</em>}</div></div>
            </section>
          </div>

          <section className={styles.boardCompare}>
            <article>
              <div className={styles.boardHead}><div><span>{tr("原计划", "PLANNED")}</span><strong>{tr("最终成型棋盘", "Final planned board")}</strong></div><small>{tr("来源攻略", "Source comp")}</small></div>
              <BoardPreview positions={draft.plannedBoard} champions={champions} items={allItems} compact />
            </article>
            <article>
              <div className={styles.boardHead}><div><span>{tr("实际快照", "ACTUAL")}</span><strong>{draft.captureSource === "builder" ? tr("Builder 最终阵容", "Builder final board") : `${draft.focusStage} ${tr("棋盘", "board")}`}</strong></div><Link href="/builder">{tr("去 Builder 修正", "Fix in Builder")}</Link></div>
              <BoardPreview positions={draft.finalBoard} champions={champions} items={allItems} rolesByName={draft.rolesByName} itemsByName={draft.itemsByName} compact />
            </article>
          </section>
        </>
      ) : (
        <section className={styles.savedState}>
          <div><strong>{tr("本局已保存", "Review saved")}</strong><span>{tr("可以查看下方历史记录，或读取当前 Focus / Builder 状态开始下一次复盘。", "Inspect history below or reload the current Focus / Builder state to start another review.")}</span></div>
          <button onClick={resetFromCurrent}>{tr("开始新的复盘", "Start another review")}</button>
        </section>
      )}

      <div className={styles.historyGrid}>
        <section className={styles.historyCard}>
          <div className={styles.cardHead}><div><h2>{tr("最近对局", "Recent games")}</h2><p>{tr("最多保存 100 局，页面展示最近 20 局。", "Up to 100 reviews are stored; the latest 20 are shown here.")}</p></div></div>
          <div className={styles.historyList}>
            {history.length ? history.slice(0, 20).map((record) => (
              <div className={`${styles.historyRow} ${selectedId === record.id ? styles.historySelected : ""}`} key={record.id}>
                <button className={styles.historyOpen} onClick={() => setSelectedId(record.id)}>
                  <strong className={record.placement <= 4 ? styles.top4 : styles.bottom4}>#{record.placement}</strong>
                  <span><b>{locale === "zh" ? record.plannedNameZh : record.plannedNameEn}</b><small>{formatDate(record.createdAt, locale)} · Lv.{record.level}{record.endStage ? ` · ${record.endStage}` : ""}</small></span>
                  <em>{record.tags.length ? record.tags.map((tag) => reviewTagLabel(tag, locale)).slice(0, 2).join(" · ") : tr("无问题标签", "No issue tags")}</em>
                </button>
                <button className={styles.deleteButton} onClick={() => deleteReview(record.id)} aria-label={tr("删除复盘", "Delete review")}>×</button>
              </div>
            )) : <div className={styles.noHistory}>{tr("还没有已保存的对局。保存上面的第一局后，这里会开始形成你的个人数据。", "No saved games yet. Save your first review above to start building personal data.")}</div>}
          </div>
        </section>

        <section className={styles.compStatsCard}>
          <div className={styles.cardHead}><div><h2>{tr("阵容表现", "Comp performance")}</h2><p>{tr("按你自己的复盘样本统计，不是全服数据。", "Based on your own reviews, not global ladder data.")}</p></div></div>
          <div className={styles.compStatsList}>{compStats.length ? compStats.map((group) => <div key={group.name}><span><strong>{group.name}</strong><small>{group.games} {tr("局", "games")}</small></span><b>{group.average.toFixed(2)}</b><em>{Math.round(group.top4Rate * 100)}% Top4</em></div>) : <div className={styles.noHistory}>{tr("至少保存一局后生成阵容统计。", "Save at least one review to generate comp stats.")}</div>}</div>
        </section>
      </div>

      {selectedRecord ? (
        <section className={styles.historyDetail}>
          <div className={styles.cardHead}><div><h2>#{selectedRecord.placement} · {locale === "zh" ? selectedRecord.plannedNameZh : selectedRecord.plannedNameEn}</h2><p>{formatDate(selectedRecord.createdAt, locale)} · Lv.{selectedRecord.level}{selectedRecord.endStage ? ` · ${selectedRecord.endStage}` : ""}</p></div><button onClick={() => setSelectedId("")}>{tr("关闭", "Close")}</button></div>
          <div className={styles.detailBody}>
            <BoardPreview positions={selectedRecord.finalBoard} champions={champions} items={allItems} rolesByName={selectedRecord.rolesByName} itemsByName={selectedRecord.itemsByName} compact />
            <div><ul>{buildReviewSummary(selectedRecord, locale).map((summary) => <li key={summary}>{summary}</li>)}</ul>{selectedRecord.note ? <blockquote>{selectedRecord.note}</blockquote> : null}</div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
