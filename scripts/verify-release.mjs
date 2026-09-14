import fs from "node:fs";

const requiredFiles = [
  "app/error.tsx",
  "app/global-error.tsx",
  "app/not-found.tsx",
  "app/recovery.module.css",
  "app/api/health/route.ts",
  "scripts/smoke-test.mjs",
  "docs/release-safety.md",
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Release safety failed: missing ${file}`);
    failed = true;
  }
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const script of ["verify:release", "smoke", "release:check"]) {
  if (!packageJson.scripts?.[script]) {
    console.error(`Release safety failed: package.json is missing script ${script}`);
    failed = true;
  }
}

const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
const ciNeedles = [
  "concurrency:",
  "cancel-in-progress: true",
  "npm run verify:release",
  "npm run build",
  "npm run smoke",
  "trap 'kill",
];
for (const needle of ciNeedles) {
  if (!ci.includes(needle)) {
    console.error(`Release safety failed: CI is missing ${needle}`);
    failed = true;
  }
}

if (ci.indexOf("npm run smoke") < ci.indexOf("npm run build")) {
  console.error("Release safety failed: smoke tests must run after the production build.");
  failed = true;
}

const health = fs.existsSync("app/api/health/route.ts") ? fs.readFileSync("app/api/health/route.ts", "utf8") : "";
for (const needle of ["status: \"ok\"", "Cache-Control", "metaComps.length", "VERCEL_GIT_COMMIT_SHA"]) {
  if (!health.includes(needle)) {
    console.error(`Release safety failed: health endpoint is missing ${needle}`);
    failed = true;
  }
}

const appError = fs.existsSync("app/error.tsx") ? fs.readFileSync("app/error.tsx", "utf8") : "";
const globalError = fs.existsSync("app/global-error.tsx") ? fs.readFileSync("app/global-error.tsx", "utf8") : "";
if (!appError.includes('"use client"') || !appError.includes("reset()")) {
  console.error("Release safety failed: app/error.tsx must be a client error boundary with reset().");
  failed = true;
}
if (!globalError.includes('"use client"') || !globalError.includes("<html") || !globalError.includes("<body")) {
  console.error("Release safety failed: app/global-error.tsx must be a client global boundary with html/body.");
  failed = true;
}

if (failed) process.exit(1);
console.log("Release safety contract verified: recovery pages, health endpoint, CI gate and smoke-test path are present.");
