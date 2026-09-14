"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { REVIEW_ISSUE_TAGS, parseReviewHistory, reviewTagLabel, type ReviewIssueTag, type ReviewRecord } from "@/lib/review";
import { REVIEW_HISTORY_KEY, markWorkspaceChanged } from "@/lib/workspace";
import { notifyToast } from "../../components/ToastHost";
import { useLocale } from "../../components/LocaleProvider";
import styles from "./history.module.css";

type WindowSize = 10 | 20 | 50;
type PlacementFilter = "all" | "top4" | "bottom4" | "win";
type EditDraft = Pick<ReviewRecord, "placement" | "level" | "endStage" | "tags" | "note">;
type DeletedState = { record: ReviewRecord; index: number } | null;

function average(records: ReviewRecord[]) { return records.length ? records.reduce((sum, record) => sum + record.placement, 0) / records.length : 0; }
function downloadFile(name: string, content: string, type: string) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function csvCell(value: unknown) { const text = String(value ?? ""); return `"${text.replaceAll('"', '""')}"`; }

export default function ReviewHistoryPage() {
  const { locale, tr } = useLocale();
  const [history, setHistory] = useState<ReviewRecord[]>([]);
  const [windowSize, setWindowSize] = useState<WindowSize>(20);
  const [compFilter, setCompFilter] = useState("all");
  const [placementFilter, setPlacementFilter] = useState<PlacementFilter>("all");
  const [tagFilter, setTagFilter] = useState<"all" | ReviewIssueTag>("all");
  const [editId, setEditId] = useState("");
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [deleted, setDeleted] = useState<DeletedState>(null);

  useEffect(() => { try { const raw = window.localStorage.getItem(REVIEW_HISTORY_KEY); setHistory(parseReviewHistory(raw ? JSON.parse(raw) : [])); } catch { setHistory([]); } }, []);

  const compOptions = useMemo(() => { const map = new Map<string, { zh: string; en: string }>(); history.forEach((record) => map.set(`${record.sourceId}:${record.compId}`, { zh: record.plannedNameZh, en: record.plannedNameEn })); return [...map.entries()]; }, [history]);
  const sample = useMemo(() => history.slice(0, windowSize), [history, windowSize]);
  const filtered = useMemo(() => sample.filter((record) => {
    const key = `${record.sourceId}:${record.compId}`;
    if (compFilter !== "all" && key !== compFilter) return false;
    if (placementFilter === "top4" && record.placement > 4) return false;
    if (placementFilter === "bottom4" && record.placement <= 4) return false;
    if (placementFilter === "win" && record.placement !== 1) return false;
    if (tagFilter !== "all" && !record.tags.includes(tagFilter)) return false;
    return true;
  }), [sample, compFilter, placementFilter, tagFilter]);
  const stats = useMemo(() => ({ games: filtered.length, average: average(filtered), top4: filtered.length ? filtered.filter((record) => record.placement <= 4).length / filtered.length : 0, wins: filtered.length ? filtered.filter((record) => record.placement === 1).length / filtered.length : 0 }), [filtered]);

  function persist(next: ReviewRecord[]) {
    setHistory(next);
    try { window.localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(next)); markWorkspaceChanged(); }
    catch { notifyToast(tr("本地保存失败，请检查浏览器存储权限。", "Local save failed. Check browser storage permissions."), "error"); }
  }
  function beginEdit(record: ReviewRecord) { setEditId(record.id); setEditDraft({ placement: record.placement, level: record.level, endStage: record.endStage, tags: [...record.tags], note: record.note }); }
  function toggleEditTag(tag: ReviewIssueTag) { if (!editDraft) return; setEditDraft({ ...editDraft, tags: editDraft.tags.includes(tag) ? editDraft.tags.filter((item) => item !== tag) : [...editDraft.tags, tag] }); }
  function saveEdit() {
    if (!editId || !editDraft) return;
    const next = history.map((record) => record.id === editId ? { ...record, ...editDraft, placement: Math.max(1, Math.min(8, editDraft.placement)), level: Math.max(4, Math.min(10, editDraft.level)), note: editDraft.note.slice(0, 1000), updatedAt: Date.now() } : record);
    persist(next); setEditId(""); setEditDraft(null); notifyToast(tr("复盘已更新。", "Review updated."), "success");
  }
  function removeRecord(id: string) {
    const index = history.findIndex((record) => record.id === id); if (index < 0) return;
    const record = history[index]; persist(history.filter((item) => item.id !== id)); setDeleted({ record, index });
    if (editId === id) { setEditId(""); setEditDraft(null); }
    notifyToast(tr("复盘已删除，可在页面顶部撤销。", "Review deleted. You can undo from the top of this page."), "warning");
  }
  function undoDelete() { if (!deleted) return; const next = [...history]; next.splice(Math.min(deleted.index, next.length), 0, deleted.record); persist(next); setDeleted(null); notifyToast(tr("已撤销删除。", "Delete undone."), "success"); }
  function exportJson() { downloadFile("tft-review-history.json", JSON.stringify(history, null, 2), "application/json;charset=utf-8"); notifyToast(tr("复盘 JSON 已导出。", "Review JSON exported."), "success"); }
  function exportCsv() { const header = ["date", "comp", "placement", "level", "endStage", "tags", "note"]; const rows = history.map((record) => [new Date(record.createdAt).toISOString(), locale === "zh" ? record.plannedNameZh : record.plannedNameEn, record.placement, record.level, record.endStage, record.tags.map((tag) => reviewTagLabel(tag, locale)).join("|"), record.note]); downloadFile("tft-review-history.csv", [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8"); notifyToast(tr("复盘 CSV 已导出。", "Review CSV exported."), "success"); }

  return <div className={styles.page}>
    <header className={styles.heading}><div><span>V1.6.2 · REVIEW CENTER POLISH</span><h1>{tr("复盘历史管理", "Review History Manager")}</h1><p>{tr("筛选、编辑、删除并撤销、导出你的手动复盘记录。所有统计都只基于你保存的样本。", "Filter, edit, delete with undo, and export your manually saved reviews. All statistics use only your saved sample.")}</p></div><div className={styles.headingActions}><Link href="/review">{tr("记录新一局", "New review")}</Link><Link href="/insights">{tr("个人趋势", "Insights")}</Link><button type="button" onClick={exportCsv}>CSV</button><button type="button" onClick={exportJson}>JSON</button></div></header>
    {deleted ? <div className={styles.undo}><span>{tr(`已删除：${deleted.record.plannedNameZh} #${deleted.record.placement}`, `Deleted: ${deleted.record.plannedNameEn} #${deleted.record.placement}`)}</span><button type="button" onClick={undoDelete}>{tr("撤销删除", "Undo")}</button></div> : null}
    <section className={styles.filters}><label><span>{tr("趋势窗口", "Window")}</span><select value={windowSize} onChange={(event) => setWindowSize(Number(event.target.value) as WindowSize)}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><label><span>{tr("阵容", "Comp")}</span><select value={compFilter} onChange={(event) => setCompFilter(event.target.value)}><option value="all">{tr("全部阵容", "All comps")}</option>{compOptions.map(([key, name]) => <option key={key} value={key}>{locale === "zh" ? name.zh : name.en}</option>)}</select></label><label><span>{tr("名次", "Placement")}</span><select value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value as PlacementFilter)}><option value="all">{tr("全部", "All")}</option><option value="top4">Top 4</option><option value="bottom4">5–8</option><option value="win">#1</option></select></label><label><span>{tr("问题标签", "Issue tag")}</span><select value={tagFilter} onChange={(event) => setTagFilter(event.target.value as "all" | ReviewIssueTag)}><option value="all">{tr("全部标签", "All tags")}</option>{REVIEW_ISSUE_TAGS.map((tag) => <option key={tag} value={tag}>{reviewTagLabel(tag, locale)}</option>)}</select></label></section>
    <section className={styles.kpis}><article><span>{tr("筛选样本", "Filtered")}</span><strong>{stats.games}</strong></article><article><span>{tr("平均名次", "Average")}</span><strong>{stats.games ? stats.average.toFixed(2) : "—"}</strong></article><article><span>Top 4</span><strong>{stats.games ? `${Math.round(stats.top4 * 100)}%` : "—"}</strong></article><article><span>{tr("吃鸡率", "Win rate")}</span><strong>{stats.games ? `${Math.round(stats.wins * 100)}%` : "—"}</strong></article></section>
    <section className={styles.trend}><div><h2>{tr(`最近 ${windowSize} 局窗口`, `Last ${windowSize} window`)}</h2><p>{tr("下方只绘制当前筛选条件匹配的记录。", "Only records matching the current filters are plotted below.")}</p></div><div className={styles.bars}>{filtered.slice().reverse().map((record) => <span key={record.id} title={`${locale === "zh" ? record.plannedNameZh : record.plannedNameEn} #${record.placement}`} style={{ height: `${22 + (9 - record.placement) * 7}px` }} className={record.placement <= 4 ? styles.good : styles.bad}><b>{record.placement}</b></span>)}</div></section>
    <section className={styles.list}>{filtered.length ? filtered.map((record) => {
      const editing = editId === record.id ? editDraft : null;
      return <article key={record.id} className={styles.record}><div className={styles.recordHead}><div><span>{new Date(record.createdAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-CA")}</span><strong>{locale === "zh" ? record.plannedNameZh : record.plannedNameEn}</strong><small>Patch {record.patch || "—"} · {record.source || "TFT"}</small></div><b className={record.placement <= 4 ? styles.placeGood : styles.placeBad}>#{record.placement}</b></div>
      {editing ? <div className={styles.editor}><label><span>{tr("名次", "Placement")}</span><input type="number" min={1} max={8} value={editing.placement} onChange={(event) => setEditDraft({ ...editing, placement: Number(event.target.value) })} /></label><label><span>{tr("等级", "Level")}</span><input type="number" min={4} max={10} value={editing.level} onChange={(event) => setEditDraft({ ...editing, level: Number(event.target.value) })} /></label><label><span>{tr("结束阶段", "End stage")}</span><input value={editing.endStage} onChange={(event) => setEditDraft({ ...editing, endStage: event.target.value })} placeholder="5-1" /></label><div className={styles.tagEdit}>{REVIEW_ISSUE_TAGS.map((tag) => <button type="button" key={tag} className={editing.tags.includes(tag) ? styles.tagActive : ""} onClick={() => toggleEditTag(tag)}>{reviewTagLabel(tag, locale)}</button>)}</div><textarea value={editing.note} maxLength={1000} onChange={(event) => setEditDraft({ ...editing, note: event.target.value })} placeholder={tr("一句复盘", "Review note")} /><div className={styles.editorActions}><button type="button" onClick={() => { setEditId(""); setEditDraft(null); }}>{tr("取消", "Cancel")}</button><button type="button" className={styles.primary} onClick={saveEdit}>{tr("保存修改", "Save changes")}</button></div></div> : <><div className={styles.meta}><span>Lv.{record.level}{record.endStage ? ` · ${record.endStage}` : ""}</span><span>{record.tags.length ? record.tags.map((tag) => reviewTagLabel(tag, locale)).join(" · ") : tr("无问题标签", "No issue tags")}</span></div>{record.note ? <p className={styles.note}>{record.note}</p> : null}<div className={styles.recordActions}><button type="button" onClick={() => beginEdit(record)}>{tr("编辑", "Edit")}</button><Link href="/share">{tr("分享", "Share")}</Link><button type="button" className={styles.delete} onClick={() => removeRecord(record.id)}>{tr("删除", "Delete")}</button></div></>}
      </article>;
    }) : <div className={styles.empty}>{tr("当前筛选条件没有匹配的复盘。", "No reviews match the current filters.")}</div>}</section>
  </div>;
}
