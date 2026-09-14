import fs from "node:fs";

const checks = [
  ["app/components/DesktopShell.tsx", ["DensityControl", "ReviewPulse", "data-ui-route", "V1.4.2"]],
  ["app/components/DensityControl.tsx", ["tft-cn-companion-ui-density-v1", "uiDensity", "compact", "comfortable"]],
  ["app/components/ReviewPulse.tsx", ["REVIEW_HISTORY_KEY", "WORKSPACE_EVENT", "recentAverage"]],
  ["app/polish.css", ["max-width:1366px", "max-height:820px", "min-width:1800px", "data-ui-density", "data-ui-tip"]],
  ["app/theme.css", ["--ui-purple", "--ui-gold", "--ui-green", "prefers-reduced-motion"]],
];

let failed = false;
for (const [file, needles] of checks) {
  const source = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`UI contract failed: ${file} is missing ${needle}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("UI polish contract verified: density, responsive breakpoints, review trend and design tokens are present.");
