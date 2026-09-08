import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const snapshot = JSON.parse(await readFile(path.join(root, "data", "live-meta.generated.json"), "utf8"));
const expectedSources = ["tuding", "shenchao", "lindo", "tft-academy"];
const blocked = ["金铲铲", "金铲铲之战"];

if (snapshot.schemaVersion !== 1) throw new Error(`Unsupported live meta schema: ${snapshot.schemaVersion}`);
if (!Array.isArray(snapshot.sourceStates) || !Array.isArray(snapshot.articles) || !Array.isArray(snapshot.records)) {
  throw new Error("live-meta.generated.json is missing required arrays");
}

const stateIds = new Set(snapshot.sourceStates.map((state) => state.sourceId));
for (const sourceId of expectedSources) {
  if (!stateIds.has(sourceId)) throw new Error(`Missing source state: ${sourceId}`);
}

const ids = new Set();
for (const record of snapshot.records) {
  if (record.gameMode !== "TFT") throw new Error(`Non-TFT record rejected: ${record.id ?? "unknown"}`);
  if (!expectedSources.includes(record.sourceId)) throw new Error(`Unknown sourceId: ${record.sourceId}`);
  if (ids.has(record.id)) throw new Error(`Duplicate live comp id: ${record.id}`);
  ids.add(record.id);
  const text = JSON.stringify(record);
  const bad = blocked.find((keyword) => text.includes(keyword));
  if (bad) throw new Error(`Blocked Golden Spatula signal '${bad}' found in ${record.id}`);
  if (!Array.isArray(record.board)) throw new Error(`Board missing for ${record.id}`);
  for (const position of record.board) {
    if (!Number.isInteger(position.row) || position.row < 0 || position.row > 3 || !Number.isInteger(position.col) || position.col < 0 || position.col > 6) {
      throw new Error(`Invalid board position in ${record.id}: ${JSON.stringify(position)}`);
    }
  }
}

for (const article of snapshot.articles) {
  if (article.gameMode !== "TFT") throw new Error(`Non-TFT article rejected: ${article.id ?? "unknown"}`);
  const text = JSON.stringify(article);
  const bad = blocked.find((keyword) => text.includes(keyword));
  if (bad) throw new Error(`Blocked Golden Spatula signal '${bad}' found in article ${article.id}`);
}

console.log(`Live meta verified: sources=${snapshot.sourceStates.length}, articles=${snapshot.articles.length}, comps=${snapshot.records.length}`);
console.log("Policy verified: Teamfight Tactics only; 金铲铲之战 data is blocked.");
