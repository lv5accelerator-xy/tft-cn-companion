const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const startupTimeoutMs = Number(process.env.SMOKE_STARTUP_TIMEOUT_MS || 30000);
const requestTimeoutMs = Number(process.env.SMOKE_REQUEST_TIMEOUT_MS || 10000);

const requiredRoutes = [
  "/api/health",
  "/",
  "/opening",
  "/compare",
  "/focus",
  "/review",
  "/builder",
  "/manifest.webmanifest",
  "/sw.js",
];

if (process.env.SMOKE_CHECK_TFT === "1") requiredRoutes.push("/api/tft");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "tft-cn-companion-release-smoke/1.0" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer() {
  const deadline = Date.now() + startupTimeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await request("/api/health");
      if (response.ok) return;
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
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
    if (!ok) {
      console.error(`Smoke failed: ${path} returned HTTP ${response.status}`);
      failed = true;
      continue;
    }

    if (path === "/api/health") {
      const payload = await response.json();
      if (payload?.status !== "ok" || payload?.app !== "tft-cn-companion") {
        console.error(`Smoke failed: ${path} returned an invalid health payload.`);
        failed = true;
        continue;
      }
    }

    console.log(`Smoke OK: ${path} -> ${response.status}`);
  } catch (error) {
    console.error(`Smoke failed: ${path}: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`Release smoke passed against ${baseUrl}.`);
