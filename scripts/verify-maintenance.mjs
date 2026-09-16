import fs from "node:fs";

const checks = [
  ["app/components/ToastHost.tsx", ["TOAST_EVENT", "offline", "navigator.onLine"]],
  ["app/components/TrialWelcome.tsx", ["QUICK TRIAL", "/demo", "TRIAL_DISMISSED_KEY"]],
  ["app/components/SessionResetButton.tsx", ["RESET_KEYS", "FOCUS_KEY", "FOCUS_TRAY_KEY", "OPENING_SESSION_KEY", "REVIEW_DRAFT_KEY", "window.location.replace(\"/\")"]],
  ["app/components/EndGameReviewButton.tsx", ["/review?capture=1", "结束对局"]],
  ["app/components/ReviewCaptureBridge.tsx", ["REVIEW_DRAFT_KEY", "deriveStageBoardPlans", "capture"]],
  ["app/components/DesktopShell.tsx", ["SessionResetButton", "EndGameReviewButton", "ReviewCaptureBridge", "V1.6.8"]],
  ["app/review/history/page.tsx", ["Undo", "exportCsv", "WindowSize", "markWorkspaceChanged"]],
  ["app/insights/page.tsx", ["10", "20", "50", "Issue changes"]],
  ["app/opengraph-image.tsx", ["ImageResponse", "1200", "630", "V1.6.8"]],
  ["app/maintenance.css", ["max-width:1366px", "max-height:760px", "data-ui-secondary-status", "[data-ui-topbar]{min-width:0;overflow:visible}"]],
  ["public/sw.js", ["v1.6.8-set18", "trimCache", "/review/history"]],
  ["app/components/UnitIcon.tsx", ["sizes={`${size}px`}", "loading=\"lazy\""]],
  ["app/robots.ts", ["sitemap"]],
  ["app/sitemap.ts", ["tft-cn-companion-web.vercel.app"]],
];

let failed = false;
for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) { console.error(`Maintenance verification failed: missing ${file}`); failed = true; continue; }
  const source = fs.readFileSync(file, "utf8");
  for (const needle of needles) if (!source.includes(needle)) { console.error(`Maintenance verification failed: ${file} is missing ${needle}`); failed = true; }
}

const unitIcon = fs.readFileSync("app/components/UnitIcon.tsx", "utf8");
if (unitIcon.includes("unoptimized")) { console.error("Maintenance verification failed: UnitIcon must not disable Next image optimization."); failed = true; }

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.version !== "1.6.8") { console.error(`Maintenance verification failed: expected package version 1.6.8, got ${pkg.version}`); failed = true; }
if (!pkg.scripts?.["verify:maintenance"] || !pkg.scripts?.["release:check"]?.includes("verify:maintenance")) { console.error("Maintenance verification failed: verify:maintenance must be part of release:check."); failed = true; }

if (failed) process.exit(1);
console.log("V1.6.1–V1.6.8 maintenance contract verified: QA guardrails, visible topbar overlays, one-click session reset, explicit Focus → Review capture, review management, trial, share metadata, bounded offline caches and Neon Command UI are present.");
