import fs from "node:fs";
const expectedCompCount = JSON.parse(fs.readFileSync("data/live-meta.generated.json", "utf8")).records.length + JSON.parse(fs.readFileSync("data/opgg-meta.generated.json", "utf8")).records.length;
const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const startupTimeoutMs = Number(process.env.SMOKE_STARTUP_TIMEOUT_MS || 30000);
const requestTimeoutMs = Number(process.env.SMOKE_REQUEST_TIMEOUT_MS || 10000);

const requiredRoutes = [
  "/api/health", "/api/meta-status", "/comps", "/rankings", "/sources", "/", "/demo", "/opening", "/coach", "/compare", "/focus", "/review", "/review/history", "/insights", "/preferences", "/share", "/builder", "/manifest.webmanifest", "/sw.js", "/opengraph-image", "/robots.txt", "/sitemap.xml",
];
if (process.env.SMOKE_CHECK_TFT === "1") requiredRoutes.push("/api/tft");

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function request(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try { return await fetch(`${baseUrl}${path}`, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "tft-cn-companion-release-smoke/1.6.9" } }); }
  finally { clearTimeout(timer); }
}

async function waitForServer() {
  const deadline = Date.now() + startupTimeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try { const response = await request("/api/health"); if (response.ok) return; lastError = new Error(`health returned ${response.status}`); }
    catch (error) { lastError = error; }
    await sleep(500);
  }
  throw new Error(`Server did not become healthy within ${startupTimeoutMs}ms: ${lastError instanceof Error ? lastError.message : "unknown error"}`);
}

await waitForServer();
let failed = false;
for (const path of requiredRoutes) {
  try {
    const response = await request(path);
    const ok = response.status >= 200 && response.status < 400;
    if (!ok) { console.error(`Smoke failed: ${path} returned HTTP ${response.status}`); failed = true; continue; }
    if (path === "/api/health") {
      const payload = await response.json();
      if (payload?.status !== "ok" || payload?.app !== "tft-cn-companion" || payload?.version !== "1.6.9" || payload?.patch !== "18.2b" || payload?.compCount !== expectedCompCount) { console.error(`Smoke failed: ${path} returned an invalid V1.6.9 health payload.`); failed = true; continue; }
    }
    if (path === "/api/meta-status") {
      const payload = await response.json();
      const expected = JSON.parse(fs.readFileSync("data/rankings.generated.json", "utf8"));
      if (payload.totals.rankingEntries !== expected.records.length || expected.sources.some(source => !payload.sources.some(actual => actual.id === source.id && actual.status === "curated" && actual.rankingCount === source.recordCount && actual.rankingPatch === source.patch))) {
        console.error("Smoke failed: ranking source status/counts disagree with the snapshot."); failed = true; continue;
      }
    }
    if (path === "/rankings") {
      const html = await response.text();
      if (!["TFT Academy", "MetaTFT", "6,667,725", "4.14", "Coven Caitlyn"].every(text => html.includes(text))) {
        console.error("Smoke failed: ranking page did not render the full source snapshot."); failed = true; continue;
      }
    }
    console.log(`Smoke OK: ${path} -> ${response.status}`);
  } catch (error) { console.error(`Smoke failed: ${path}: ${error instanceof Error ? error.message : String(error)}`); failed = true; }
}
if (failed) process.exit(1);
console.log(`Release smoke passed against ${baseUrl}.`);
