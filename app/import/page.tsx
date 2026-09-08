"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import { isBlockedGoldenSpatulaText, metaSources, type MetaSourceId } from "@/data/meta-sources";
import type { UnifiedMetaComp } from "@/data/meta";
import CompCorrectionEditor from "./CompCorrectionEditor";
import type { AnalysisComp, AnalysisResult } from "./types";
import styles from "./import.module.css";

const LOCAL_KEY = "tft-cn-companion-image-imports-v1";
const BUILDER_KEY = "tft-cn-companion-builder-v2";
const ALLOWED_SOURCES = metaSources.filter((source) => source.id !== "tft-academy");

type PreviewImage = {
  name: string;
  dataUrl: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "imported-comp";
}

function cloneComp(comp: AnalysisComp): AnalysisComp {
  return {
    ...comp,
    coreUnits: [...comp.coreUnits],
    flexUnits: [...comp.flexUnits],
    itemFocus: [...comp.itemFocus],
    traits: [...comp.traits],
    augments: [...comp.augments],
    keyNotes: [...comp.keyNotes],
    stages: comp.stages.map((stage) => ({ ...stage })),
    board: comp.board.map((position) => ({ ...position })),
    carries: comp.carries.map((carry) => ({ ...carry, items: [...carry.items], alternatives: [...carry.alternatives] })),
    warnings: [...comp.warnings],
  };
}

function clampBoard(board: AnalysisComp["board"]) {
  const seenUnits = new Set<string>();
  const seenCells = new Set<string>();
  return board
    .filter((position) => Number.isInteger(position.row) && Number.isInteger(position.col))
    .filter((position) => position.row >= 0 && position.row <= 3 && position.col >= 0 && position.col <= 6)
    .filter((position) => {
      const unit = position.unit.trim().toLocaleLowerCase("en-US");
      const cell = `${position.row}:${position.col}`;
      if (!unit || seenUnits.has(unit) || seenCells.has(cell)) return false;
      seenUnits.add(unit);
      seenCells.add(cell);
      return true;
    })
    .map((position) => ({
      unit: position.unit.trim(),
      row: position.row as 0 | 1 | 2 | 3,
      col: position.col as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    }));
}

async function fileToCompressedDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1400;
  const maxHeight = 4200;
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理图片。 ");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.78);
}

function validateComp(comp: AnalysisComp) {
  if (isBlockedGoldenSpatulaText(JSON.stringify(comp))) return "检测到金铲铲关键词，已阻止保存。";
  if (!comp.nameZh.trim() && !comp.nameEn.trim()) return "请填写阵容名称。";
  if (![...comp.coreUnits, ...comp.flexUnits].some((unit) => unit.trim())) return "至少需要一个可识别的 TFT 英雄。";
  return "";
}

export default function ImportPage() {
  const [sourceId, setSourceId] = useState<MetaSourceId>("tuding");
  const [patch, setPatch] = useState("18.1");
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [drafts, setDrafts] = useState<AnalysisComp[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [boardTools, setBoardTools] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [analyzerConfigured, setAnalyzerConfigured] = useState<boolean | null>(null);

  const source = useMemo(() => metaSources.find((entry) => entry.id === sourceId), [sourceId]);

  useEffect(() => {
    fetch("/api/analyze-comp-image")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setAnalyzerConfigured(Boolean(payload?.configured)))
      .catch(() => setAnalyzerConfigured(false));
  }, []);

  async function acceptFiles(files: FileList | File[]) {
    setError("");
    setResult(null);
    setDrafts([]);
    setSaved({});
    const list = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 3);
    if (!list.length) {
      setError("请选择图片文件。 ");
      return;
    }
    try {
      const compressed = await Promise.all(list.map(async (file) => ({ name: file.name, dataUrl: await fileToCompressedDataUrl(file) })));
      const totalChars = compressed.reduce((sum, image) => sum + image.dataUrl.length, 0);
      if (totalChars > 3_700_000) {
        setError("图片压缩后仍然过大。建议只上传一张一图流，或先裁掉公众号页面空白区域。 ");
        return;
      }
      setImages(compressed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片处理失败。 ");
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void acceptFiles(event.target.files);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer.files.length) void acceptFiles(event.dataTransfer.files);
  }

  async function analyze() {
    if (!images.length || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    setDrafts([]);
    setEditingIndex(null);
    setSaved({});
    try {
      const response = await fetch("/api/analyze-comp-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          images: images.map((image) => image.dataUrl),
          sourceId,
          sourceName: source?.name ?? sourceId,
          patch,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "图片分析失败。 ");
      const nextResult = payload.result as AnalysisResult;
      setResult(nextResult);
      setDrafts(nextResult.comps.map(cloneComp));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片分析失败。 ");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(index: number, comp: AnalysisComp) {
    setDrafts((current) => current.map((entry, entryIndex) => entryIndex === index ? comp : entry));
    setSaved((current) => ({ ...current, [index]: false }));
  }

  function restoreDraft(index: number) {
    const original = result?.comps[index];
    if (!original) return;
    updateDraft(index, cloneComp(original));
  }

  function toUnified(comp: AnalysisComp, index: number): UnifiedMetaComp {
    const date = today();
    return {
      id: `manual-${sourceId}-${Date.now()}-${index}-${slugify(comp.nameEn || comp.nameZh)}`,
      name: comp.nameEn || comp.nameZh,
      nameZh: comp.nameZh || comp.nameEn,
      tier: comp.tier,
      patch: result?.patch || patch,
      playstyle: comp.playstyle || "Image Import",
      difficulty: comp.difficulty,
      coreUnits: comp.coreUnits,
      flexUnits: comp.flexUnits,
      itemFocus: comp.itemFocus,
      traits: comp.traits,
      whenToPlay: comp.whenToPlay,
      keyNotes: [
        ...comp.keyNotes,
        ...comp.carries.map((carry) => `${carry.role}: ${carry.unit}${carry.items.length ? ` · ${carry.items.join(" / ")}` : ""}${carry.alternatives.length ? ` · 备选 ${carry.alternatives.join(" / ")}` : ""}`),
        ...(comp.augments.length ? [`强化：${comp.augments.join(" / ")}`] : []),
        ...(comp.compCode ? [`阵容码：${comp.compCode}`] : []),
      ],
      stages: comp.stages,
      board: clampBoard(comp.board),
      positioningNote: comp.positioningNote || "图片识别参考站位；实战根据对手调整。",
      source: source?.name ?? sourceId,
      sourceUrl: "",
      sourceId,
      sourcePublishedAt: date,
      sourceUpdatedAt: date,
      sourceArticleTitle: result?.articleTitle || `手动图片导入 · ${source?.name ?? sourceId}`,
      gameMode: "TFT",
      syncOrigin: "manual",
    };
  }

  function saveComp(comp: AnalysisComp, index: number) {
    const validationError = validateComp(comp);
    if (validationError) {
      setError(validationError);
      return;
    }
    const record = toUnified(comp, index);
    try {
      const existing = JSON.parse(window.localStorage.getItem(LOCAL_KEY) || "[]") as UnifiedMetaComp[];
      const next = [record, ...existing].slice(0, 100);
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      setSaved((current) => ({ ...current, [index]: true }));
      setError("");
    } catch {
      setError("浏览器本地阵容库保存失败。 ");
    }
  }

  function sendToBuilder(comp: AnalysisComp) {
    const validationError = validateComp(comp);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      window.localStorage.setItem(BUILDER_KEY, JSON.stringify({
        name: comp.nameZh || comp.nameEn,
        champions: [...comp.coreUnits, ...comp.flexUnits],
        board: clampBoard(comp.board),
        updatedAt: Date.now(),
      }));
      window.location.href = "/builder";
    } catch {
      setError("无法写入 Team Builder。 ");
    }
  }

  async function copyJson() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify({ ...result, comps: drafts }, null, 2));
    } catch {
      setError("复制 JSON 失败。 ");
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>一图流导入</h1>
          <p>上传兔顶之弈、神超不做人或林小北Lindo的云顶一图流，AI提取后先人工校正，再保存阵容、装备、强化、站位和阵容码。</p>
        </div>
        <div className={styles.headerBadges}>
          <span className={styles.rule}>TFT ONLY · 金铲铲内容拒绝导入</span>
          <span className={analyzerConfigured ? styles.aiReady : styles.aiMissing}>
            {analyzerConfigured === null ? "AI 检查中" : analyzerConfigured ? "AI 已配置" : "AI 未配置"}
          </span>
        </div>
      </header>

      <section className={styles.config}>
        <label>
          <span>来源</span>
          <select value={sourceId} onChange={(event) => setSourceId(event.target.value as MetaSourceId)}>
            {ALLOWED_SOURCES.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
          </select>
        </label>
        <label>
          <span>Patch</span>
          <input value={patch} onChange={(event) => setPatch(event.target.value)} placeholder="18.1" />
        </label>
        <div className={styles.hint}>图片只在点击“AI 分析”时发送到服务端；浏览器会先压缩，原图不会写进阵容库。识别结果必须经人工确认。</div>
      </section>

      <section className={styles.dropzone} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <input id="comp-images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onFileChange} />
        <label htmlFor="comp-images">
          <strong>拖入一图流，或点击选择图片</strong>
          <span>支持 JPG / PNG / WebP · 最多 3 张 · 建议一张完整攻略图</span>
        </label>
      </section>

      {images.length > 0 && (
        <section className={styles.previewSection}>
          <div className={styles.previewGrid}>
            {images.map((image) => (
              <figure key={image.name}>
                <div className={styles.previewImageWrap}>
                  <Image src={image.dataUrl} alt={image.name} fill sizes="(max-width: 620px) 100vw, 420px" unoptimized />
                </div>
                <figcaption>{image.name}</figcaption>
              </figure>
            ))}
          </div>
          <div className={styles.previewActions}>
            <button className={styles.secondary} onClick={() => { setImages([]); setResult(null); setDrafts([]); }}>清空</button>
            <button className={styles.primary} onClick={analyze} disabled={busy || analyzerConfigured === false}>
              {busy ? "正在识别阵容…" : analyzerConfigured === false ? "请先配置 AI" : "AI 分析图片"}
            </button>
          </div>
        </section>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <section className={styles.result}>
          <div className={styles.resultHead}>
            <div>
              <strong>{result.articleTitle || "图片分析结果"}</strong>
              <span>{result.sourceName} · Patch {result.patch || patch} · {drafts.length} 套阵容 · 先校正再保存</span>
            </div>
            <button className={styles.secondary} onClick={copyJson}>复制校正后 JSON</button>
          </div>

          {result.gameMode !== "TFT" ? (
            <div className={styles.rejected}>
              <strong>{result.gameMode === "GOLDEN_SPATULA" ? "检测到金铲铲内容，已拒绝导入" : "无法确认这是 TFT 内容"}</strong>
              <span>{result.summary}</span>
              {result.warnings.map((warning) => <em key={warning}>{warning}</em>)}
            </div>
          ) : (
            <>
              {result.summary && <p className={styles.summary}>{result.summary}</p>}
              {result.warnings.length > 0 && <div className={styles.globalWarnings}>{result.warnings.join(" · ")}</div>}
              <div className={styles.compGrid}>
                {drafts.map((comp, index) => (
                  <article className={`${styles.compCard} ${editingIndex === index ? styles.compCardEditing : ""}`} key={`${index}-${comp.nameZh}`}>
                    <div className={styles.compTop}>
                      <span className={styles.tier}>{comp.tier}</span>
                      <div>
                        <strong>{comp.nameZh || comp.nameEn}</strong>
                        <span>{comp.nameEn} · {comp.playstyle}</span>
                      </div>
                      <b>{Math.round(comp.confidence * 100)}%</b>
                    </div>

                    {editingIndex === index ? (
                      <CompCorrectionEditor
                        comp={comp}
                        activeBoardUnit={boardTools[index] ?? ""}
                        onActiveBoardUnitChange={(unit) => setBoardTools((current) => ({ ...current, [index]: unit }))}
                        onChange={(nextComp) => updateDraft(index, nextComp)}
                        onDone={() => setEditingIndex(null)}
                        onReset={() => restoreDraft(index)}
                      />
                    ) : (
                      <>
                        <div className={styles.block}><span>核心</span><p>{comp.coreUnits.join(" / ") || "—"}</p></div>
                        <div className={styles.block}><span>补充英雄</span><p>{comp.flexUnits.join(" / ") || "—"}</p></div>
                        <div className={styles.block}><span>主 C / 主坦</span><p>{comp.carries.map((carry) => `${carry.role}: ${carry.unit}${carry.items.length ? ` · ${carry.items.join(" / ")}` : ""}`).join("；") || "—"}</p></div>
                        <div className={styles.block}><span>装备</span><p>{comp.itemFocus.join(" · ") || "—"}</p></div>
                        <div className={styles.block}><span>强化</span><p>{comp.augments.join(" / ") || "—"}</p></div>
                        <div className={styles.block}><span>羁绊</span><p>{comp.traits.join(" / ") || "—"}</p></div>
                        <div className={styles.block}><span>站位</span><p>{comp.board.length ? `${clampBoard(comp.board).length} 个棋子已定位到 4×7 棋盘` : "图片无法可靠识别站位，可点“编辑校正”手动补齐"}</p></div>
                        {comp.compCode && <div className={styles.code}>{comp.compCode}</div>}
                        {comp.warnings.length > 0 && <div className={styles.warnings}>{comp.warnings.join("；")}</div>}
                      </>
                    )}

                    <div className={styles.cardActions}>
                      <button className={styles.secondary} onClick={() => setEditingIndex(editingIndex === index ? null : index)}>
                        {editingIndex === index ? "收起校正" : "编辑校正"}
                      </button>
                      <button className={styles.secondary} onClick={() => sendToBuilder(comp)}>载入 Builder</button>
                      <button className={styles.primary} onClick={() => saveComp(comp, index)} disabled={saved[index]}>
                        {saved[index] ? "已保存到阵容库" : "确认并保存"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
