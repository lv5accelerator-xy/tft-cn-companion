import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const snapshotPath = path.join(root, "data", "live-meta.generated.json");
const now = new Date().toISOString();

const sources = [
  { id: "tuding", name: "兔顶之弈", env: "TUDING_FEED_URL" },
  { id: "shenchao", name: "神超不做人", env: "SHENCHAO_FEED_URL" },
  { id: "lindo", name: "林小北Lindo", env: "LINDO_FEED_URL" },
];

const blockedSignals = ["金铲铲", "金铲铲之战"];
const tftSignals = ["TFT", "Teamfight Tactics", "云顶之弈", "云顶", "TFTSet18", "Set 18", "S18", "s18"];
const parserUrl = process.env.META_PARSER_URL?.trim();
const bearerToken = process.env.META_FEED_BEARER_TOKEN?.trim();
const parserToken = process.env.META_PARSER_BEARER_TOKEN?.trim() || bearerToken;

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function textOf(article) {
  return [article.title, article.content, article.text, article.body, article.description, article.summary]
    .filter(Boolean)
    .join("\n");
}

function isGoldenSpatula(text) {
  return blockedSignals.some((signal) => text.includes(signal));
}

function isTftArticle(article) {
  const game = String(article.gameMode ?? article.game ?? "").toLowerCase();
  if (["golden-spatula", "goldenspatula", "jcc", "金铲铲"].some((value) => game.includes(value))) return false;
  if (["tft", "teamfight tactics", "云顶之弈"].some((value) => game.includes(value))) return true;
  const text = textOf(article);
  if (isGoldenSpatula(text)) return false;
  return tftSignals.some((signal) => text.includes(signal));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeArticle(sourceId, raw, index) {
  const title = String(raw.title ?? raw.name ?? "未命名文章").trim();
  const url = String(raw.url ?? raw.link ?? raw.articleUrl ?? "").trim();
  const publishedAt = String(raw.publishedAt ?? raw.publishTime ?? raw.createdAt ?? raw.date ?? now);
  const updatedAt = String(raw.updatedAt ?? raw.modifiedAt ?? publishedAt);
  const content = textOf(raw);
  const id = String(raw.id ?? raw.articleId ?? hash(`${sourceId}:${url || title}:${publishedAt}:${index}`).slice(0, 20));
  const contentHash = hash(JSON.stringify({ title, url, publishedAt, updatedAt, content, images: raw.images ?? [], comps: raw.comps ?? raw.records ?? [] }));
  return { ...raw, id, title, url, publishedAt, updatedAt, contentHash };
}

function cleanStringArray(value) {
  return asArray(value).map((item) => String(item).trim()).filter(Boolean);
}

function normalizeBoard(value) {
  return asArray(value)
    .map((position) => ({
      unit: String(position?.unit ?? position?.name ?? "").trim(),
      row: Number(position?.row),
      col: Number(position?.col),
    }))
    .filter((position) => position.unit && Number.isInteger(position.row) && position.row >= 0 && position.row <= 3 && Number.isInteger(position.col) && position.col >= 0 && position.col <= 6);
}

function normalizeStages(value) {
  const allowed = new Set(["Stage 2", "Stage 3", "Stage 4"]);
  return asArray(value)
    .map((stage) => ({ stage: String(stage?.stage ?? ""), text: String(stage?.text ?? "").trim() }))
    .filter((stage) => allowed.has(stage.stage) && stage.text);
}

function normalizeComp(source, article, raw, index) {
  const name = String(raw.name ?? raw.nameEn ?? raw.title ?? "").trim();
  const nameZh = String(raw.nameZh ?? raw.chineseName ?? raw.nameCN ?? name).trim();
  const tierRaw = String(raw.tier ?? "ACTIVE").toUpperCase();
  const tier = ["S", "A", "B", "ACTIVE"].includes(tierRaw) ? tierRaw : "ACTIVE";
  const difficultyRaw = String(raw.difficulty ?? "MEDIUM").toUpperCase();
  const difficulty = ["EASY", "MEDIUM", "HARD"].includes(difficultyRaw) ? difficultyRaw : "MEDIUM";
  const coreUnits = cleanStringArray(raw.coreUnits ?? raw.carries ?? raw.units?.slice?.(0, 4));
  const flexUnits = cleanStringArray(raw.flexUnits ?? raw.units).filter((unit) => !coreUnits.includes(unit));
  const itemFocus = cleanStringArray(raw.itemFocus ?? raw.items ?? raw.coreItems);
  const traits = cleanStringArray(raw.traits ?? raw.synergies);
  const keyNotes = cleanStringArray(raw.keyNotes ?? raw.notes);
  const board = normalizeBoard(raw.board ?? raw.positioning);
  const patch = String(raw.patch ?? raw.version ?? "18.1").trim();
  const identity = String(raw.id ?? raw.compId ?? `${nameZh || name}-${index}`);
  const id = `${source.id}-${identity}`.replace(/\s+/g, "-").toLowerCase();

  return {
    id,
    sourceId: source.id,
    articleId: article.id,
    articleTitle: article.title,
    articleUrl: article.url,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    contentHash: article.contentHash,
    patch,
    name: name || nameZh || "Unknown Comp",
    nameZh: nameZh || name || "未命名阵容",
    tier,
    playstyle: String(raw.playstyle ?? raw.style ?? "Meta Comp").trim(),
    difficulty,
    coreUnits,
    flexUnits,
    itemFocus,
    traits,
    whenToPlay: String(raw.whenToPlay ?? raw.when ?? raw.summary ?? "").trim(),
    keyNotes,
    stages: normalizeStages(raw.stages),
    board,
    positioningNote: String(raw.positioningNote ?? raw.positionNote ?? "参考站位；实战根据对手左右镜像调整。 ").trim(),
    gameMode: "TFT",
  };
}

async function fetchJson(url, token) {
  const headers = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  return response.json();
}

async function parseArticle(source, article) {
  const structured = asArray(article.comps ?? article.records ?? article.teamComps);
  if (structured.length) return structured;
  if (!parserUrl) return [];

  const headers = { "content-type": "application/json", accept: "application/json" };
  if (parserToken) headers.authorization = `Bearer ${parserToken}`;
  const response = await fetch(parserUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sourceId: source.id,
      sourceName: source.name,
      gameMode: "TFT",
      excludeGame: "金铲铲之战",
      article,
    }),
  });
  if (!response.ok) throw new Error(`Parser HTTP ${response.status} ${response.statusText}`);
  const payload = await response.json();
  return asArray(payload.comps ?? payload.records ?? payload);
}

const previous = JSON.parse(await readFile(snapshotPath, "utf8"));
const previousArticles = new Map((previous.articles ?? []).map((article) => [`${article.sourceId}:${article.id}`, article]));
const previousRecordsByArticle = new Map();
for (const record of previous.records ?? []) {
  const key = `${record.sourceId}:${record.articleId}`;
  const list = previousRecordsByArticle.get(key) ?? [];
  list.push(record);
  previousRecordsByArticle.set(key, list);
}

const nextArticles = [];
const nextRecords = [];
const nextStates = [];
let changed = false;

for (const source of sources) {
  const feedUrl = process.env[source.env]?.trim();
  if (!feedUrl) {
    nextStates.push({
      sourceId: source.id,
      status: "awaiting_feed",
      lastCheckedAt: null,
      lastChangedAt: null,
      message: `等待配置 ${source.env}`,
    });
    continue;
  }

  try {
    const payload = await fetchJson(feedUrl, bearerToken);
    const rawArticles = asArray(payload.articles ?? payload.items ?? payload.entries ?? payload);
    let parsedCount = 0;
    let filteredCount = 0;
    let sourceChanged = false;

    for (let index = 0; index < rawArticles.length; index += 1) {
      const article = normalizeArticle(source.id, rawArticles[index], index);
      const articleText = textOf(article);
      const goldenSpatula = isGoldenSpatula(articleText);
      const tftArticle = isTftArticle(article);
      if (goldenSpatula || !tftArticle) {
        filteredCount += 1;
        continue;
      }

      const key = `${source.id}:${article.id}`;
      const oldArticle = previousArticles.get(key);
      const unchanged = oldArticle?.contentHash === article.contentHash;
      if (!unchanged) {
        sourceChanged = true;
        changed = true;
      }

      let comps = [];
      let status = "synced";
      try {
        if (unchanged && previousRecordsByArticle.has(key)) {
          comps = previousRecordsByArticle.get(key);
        } else {
          const parsed = await parseArticle(source, article);
          comps = parsed.map((comp, compIndex) => normalizeComp(source, article, comp, compIndex));
        }
        if (comps.length) {
          status = "parsed";
          parsedCount += comps.length;
        }
      } catch (error) {
        status = "error";
        console.error(`[${source.id}] parser failed for ${article.title}:`, error instanceof Error ? error.message : error);
      }

      nextArticles.push({
        id: article.id,
        sourceId: source.id,
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        updatedAt: article.updatedAt,
        contentHash: article.contentHash,
        status,
        gameMode: "TFT",
      });
      nextRecords.push(...comps.filter((comp) => !isGoldenSpatula(JSON.stringify(comp))));
    }

    nextStates.push({
      sourceId: source.id,
      status: "ready",
      lastCheckedAt: now,
      lastChangedAt: sourceChanged ? now : (previous.sourceStates ?? []).find((state) => state.sourceId === source.id)?.lastChangedAt ?? null,
      message: `${rawArticles.length} 篇候选 · ${parsedCount} 套阵容 · 已过滤 ${filteredCount} 条非 TFT/金铲铲内容`,
    });
  } catch (error) {
    nextStates.push({
      sourceId: source.id,
      status: "error",
      lastCheckedAt: now,
      lastChangedAt: (previous.sourceStates ?? []).find((state) => state.sourceId === source.id)?.lastChangedAt ?? null,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

nextStates.push({
  sourceId: "tft-academy",
  status: "curated",
  lastCheckedAt: now,
  lastChangedAt: null,
  message: "当前国际服阵容库由项目人工审核；后续可接公开 Feed。",
});

nextArticles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
nextRecords.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

const snapshot = {
  schemaVersion: 1,
  generatedAt: now,
  sourceStates: nextStates,
  articles: nextArticles,
  records: nextRecords,
};

const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
const previousSerialized = `${JSON.stringify(previous, null, 2)}\n`;
if (serialized !== previousSerialized) {
  await writeFile(snapshotPath, serialized, "utf8");
  changed = true;
}

console.log(`TFT meta sync complete: articles=${nextArticles.length}, comps=${nextRecords.length}, changed=${changed}`);
console.log("Policy: Teamfight Tactics only; 金铲铲之战 content is rejected before parsing and before output.");
