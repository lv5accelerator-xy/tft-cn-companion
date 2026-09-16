import fs from "node:fs";

const checks = [
  ["app/components/DesktopShell.tsx", ["DensityControl", "ReviewPulse", "TrainingFocusStrip", "data-ui-route", "data-command-ui", "V1.6.9"]],
  ["app/components/DensityControl.tsx", ["tft-cn-companion-ui-density-v1", "uiDensity", "compact", "comfortable"]],
  ["app/components/ReviewPulse.tsx", ["REVIEW_HISTORY_KEY", "WORKSPACE_EVENT", "recentAverage"]],
  ["app/components/TrainingFocusStrip.tsx", ["TRAINING_FOCUS_KEY", "buildTrainingProgress", "/insights#training-focus"]],
  ["app/polish.css", ["max-width:1366px", "max-height:820px", "min-width:1800px", "data-ui-density", "data-ui-tip"]],
  ["app/v16.css", ["max-width:1366px", "max-height:900px", "overflow-y:auto", "data-ui-topbar"]],
  ["app/theme.css", ["--ui-purple", "--ui-gold", "--ui-green", "prefers-reduced-motion"]],
  ["app/command-ui.css", ["--cmd-cyan", "data-command-ui", "TACTICAL COMMAND", "cmdScan", "prefers-reduced-motion", "data-ui-route=\"focus\"", "data-ui-route=\"coach\"", "data-ui-route=\"insights\""]],
  ["app/layout.tsx", ["./command-ui.css", "#080b12"]],
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
console.log("UI contract verified: V1.6.9 Neon Command shell, tactical route styling, density, practice-loop strip, responsive breakpoints, overflow safety and reduced-motion support are present.");
