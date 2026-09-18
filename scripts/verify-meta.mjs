import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const snapshot = JSON.parse(await readFile(path.join(root, "data", "live-meta.generated.json"), "utf8"));
const openingRulesSource = await readFile(path.join(root, "lib", "opening-rules.ts"), "utf8");
const expectedSources = ["tuding", "shenchao", "lindo", "tft-academy"];
const blocked = ["金铲铲", "金铲铲之战"];
const expectedStages = ["Stage 2", "Stage 3", "Stage 4"];
const allowedTiers = new Set(["S", "A", "B", "ACTIVE"]);
const allowedDifficulty = new Set(["EASY", "MEDIUM", "HARD"]);

function canonicalOpeningRuleId(id) {
  return id === "tuding-182-rift-blue-reroll" ? "tuding-182-rift-blue" : id;
}

if (snapshot.schemaVersion !== 1) throw new Error(`Unsupported live meta schema: ${snapshot.schemaVersion}`);
if (!Array.isArray(snapshot.sourceStates) || !Array.isArray(snapshot.articles) || !Array.isArray(snapshot.records)) {
  throw new Error("live-meta.generated.json is missing required arrays");
}

const stateIds = new Set(snapshot.sourceStates.map((state) => state.sourceId));
for (const sourceId of expectedSources) {
  if (!stateIds.has(sourceId)) throw new Error(`Missing source state: ${sourceId}`);
}

const articleIds = new Set(snapshot.articles.map((article) => article.id));
const ids = new Set();
for (const record of snapshot.records) {
  if (record.gameMode !== "TFT") throw new Error(`Non-TFT record rejected: ${record.id ?? "unknown"}`);
  if (!expectedSources.includes(record.sourceId)) throw new Error(`Unknown sourceId: ${record.sourceId}`);
  if (ids.has(record.id)) throw new Error(`Duplicate live comp id: ${record.id}`);
  ids.add(record.id);
  if (!articleIds.has(record.articleId)) throw new Error(`Missing source article for ${record.id}: ${record.articleId}`);
  if (!allowedTiers.has(record.tier)) throw new Error(`Invalid tier for ${record.id}: ${record.tier}`);
  if (!allowedDifficulty.has(record.difficulty)) throw new Error(`Invalid difficulty for ${record.id}: ${record.difficulty}`);
  for (const key of ["id", "name", "nameZh", "patch", "playstyle", "whenToPlay", "positioningNote", "articleTitle"]) {
    if (typeof record[key] !== "string" || !record[key].trim()) throw new Error(`Missing ${key} for ${record.id ?? "unknown"}`);
  }
  for (const key of ["coreUnits", "flexUnits", "itemFocus", "traits", "keyNotes", "stages", "board"]) {
    if (!Array.isArray(record[key]) || record[key].length === 0) throw new Error(`${key} missing/empty for ${record.id}`);
  }
  if (record.keyNotes.length < 3) throw new Error(`Too few key notes for ${record.id}`);
  if (record.stages.length !== 3 || record.stages.some((stage, index) => stage?.stage !== expectedStages[index] || typeof stage?.text !== "string" || !stage.text.trim())) {
    throw new Error(`Stage 2/3/4 contract failed for ${record.id}`);
  }
  if (record.board.length < 5 || record.board.length > 10) throw new Error(`Unexpected board unit count for ${record.id}: ${record.board.length}`);

  const core = new Set(record.coreUnits.map((unit) => String(unit).trim()));
  const flex = new Set(record.flexUnits.map((unit) => String(unit).trim()));
  for (const unit of core) if (flex.has(unit)) throw new Error(`Unit appears in core and flex for ${record.id}: ${unit}`);
  const roster = new Set([...core, ...flex]);
  const seenPositions = new Set();
  const seenBoardUnits = new Set();
  for (const position of record.board) {
    if (!Number.isInteger(position.row) || position.row < 0 || position.row > 3 || !Number.isInteger(position.col) || position.col < 0 || position.col > 6) {
      throw new Error(`Invalid board position in ${record.id}: ${JSON.stringify(position)}`);
    }
    const positionKey = `${position.row}:${position.col}`;
    if (seenPositions.has(positionKey)) throw new Error(`Duplicate board hex in ${record.id}: ${positionKey}`);
    seenPositions.add(positionKey);
    if (seenBoardUnits.has(position.unit)) throw new Error(`Duplicate board unit in ${record.id}: ${position.unit}`);
    seenBoardUnits.add(position.unit);
    if (!roster.has(position.unit)) throw new Error(`Board unit is missing from core/flex roster in ${record.id}: ${position.unit}`);
  }

  const ruleId = canonicalOpeningRuleId(record.id);
  if (!openingRulesSource.includes(`"${ruleId}"`)) throw new Error(`Missing reviewed opening rule coverage for ${record.id} (canonical ${ruleId})`);

  const text = JSON.stringify(record);
  const bad = blocked.find((keyword) => text.includes(keyword));
  if (bad) throw new Error(`Blocked Golden Spatula signal '${bad}' found in ${record.id}`);
}

for (const article of snapshot.articles) {
  if (article.gameMode !== "TFT") throw new Error(`Non-TFT article rejected: ${article.id ?? "unknown"}`);
  const text = JSON.stringify(article);
  const bad = blocked.find((keyword) => text.includes(keyword));
  if (bad) throw new Error(`Blocked Golden Spatula signal '${bad}' found in article ${article.id}`);
}

if (snapshot.records.length !== 17) throw new Error(`Expected 17 reviewed Patch 18.2b comps, got ${snapshot.records.length}`);
if (snapshot.articles.length !== 1) throw new Error(`Expected 1 reviewed source article, got ${snapshot.articles.length}`);
if (snapshot.records.some((record) => record.sourceId !== "tuding" || record.patch !== "18.2b")) {
  throw new Error("Reviewed baseline must contain only 兔顶之弈 Patch 18.2b records");
}
const dravenRecords = snapshot.records.filter((record) => record.nameZh === "德子九五" || /draven fast\s*9/i.test(record.name || ""));
if (dravenRecords.length !== 1 || dravenRecords[0].id !== "tuding-182-draven-fast9") {
  throw new Error("德子九五 baseline must contain exactly one reviewed 18.2 record");
}

console.log(`Live meta verified: sources=${snapshot.sourceStates.length}, articles=${snapshot.articles.length}, comps=${snapshot.records.length}`);
console.log("Reviewed baseline verified: 17 × 兔顶之弈 Patch 18.2b comps; all have complete core/flex, Stage 2/3/4, unique board positions and opening rule coverage.");
console.log("德子九五 has one canonical record. Policy verified: Teamfight Tactics only; 金铲铲之战 data is blocked.");
