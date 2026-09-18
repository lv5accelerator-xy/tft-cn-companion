import fs from "node:fs";

const requiredCompIds = [
  "tuding-182-invoker-ahri",
  "tuding-182-dragon-fast9",
  "tuding-182-draven-fast9",
  "tuding-182b-juggernaut-zyra",
  "tuding-182b-ashe-fast9",
  "tuding-182-primal-double-carry",
  "tuding-182b-executioner-zyra",
  "tuding-182b-swiftshot-aphelios",
  "tuding-182b-juggernaut-sivir",
  "tuding-182-primal-lotus",
  "tuding-182-nidalee-aphelios",
  "tuding-182b-sivir-nidalee-flex",
  "tuding-182-fae-veigar",
  "tuding-182b-faerie-rengar-tristana",
  "tuding-182b-eclipse-yunara",
  "tuding-182-overlord-caitlyn",
  "tuding-182-brawler-yi"
];

const checks = [
  ["lib/opening-rules.ts", ["scoreSourceOpeningRule", "REVIEWED_OPENING_RULE_IDS", "tuding-182-rift-blue"]],
  ["lib/opening-rule-id.ts", ["canonicalOpeningRuleId", "tuding-182-rift-blue-reroll", "tuding-182-rift-blue"]],
  ["lib/opening-assistant.ts", ["guideScore", "guideReasons", "guideCautions", "scoreSourceOpeningRule", "canonicalOpeningRuleId"]],
  ["lib/smart-guidance.ts", ["match.guideReasons", "match.guideCautions", "guideScore"]],
  ["app/components/EndGameReviewButton.tsx", ["/review?capture=1", "结束对局", "End game"]],
  ["app/components/ReviewCaptureBridge.tsx", ["capture", "REVIEW_DRAFT_KEY", "deriveStageBoardPlans", "window.location.replace(\"/review\")"]],
  ["lib/training-focus.ts", ["TRAINING_SAMPLE_SIZE", "TRAINING_TARGET_MAX_HITS", "buildTrainingSuggestion", "buildTrainingProgress", "trainingAction"]],
  ["lib/workspace.ts", ["TRAINING_FOCUS_KEY", "trainingFocus?: unknown", "trainingFocusValue"]],
  ["app/components/TrainingFocusPanel.tsx", ["PRACTICE LOOP", "buildTrainingSuggestion", "createTrainingFocusGoal", "TRAINING_FOCUS_KEY"]],
  ["app/components/TrainingFocusStrip.tsx", ["THIS GAME FOCUS", "buildTrainingProgress", "/insights#training-focus"]],
  ["app/components/DesktopShell.tsx", ["ReviewCaptureBridge", "EndGameReviewButton", "TrainingFocusStrip", "V1.6.9"]],
  ["app/comps/page.tsx", ["Fast 8/9", "9级 / 上限", "/insights?source="]],
  ["app/comps/page.tsx", ["aria-expanded={expanded}", "window.confirm", "替换候选 C", "展开攻略"]],
  ["app/focus/page.tsx", ["阵容不存在或已下架", "href=\"/review/history\""]],
  ["app/components/EndGameReviewButton.tsx", ["结束对局并复盘", "window.confirm", "REVIEW_DRAFT_KEY", "params.get(\"id\")"]],
  ["app/review/page.tsx", ["快照来源："]],
  ["app/insights/page.tsx", ["这套阵容暂无个人复盘", "hasOlder", "!map.has(compFilter)", "TrainingFocusPanel"]],
  ["app/insights/page.tsx", ["V1.6.9", "source", "id", "WindowSize"]],
  ["scripts/verify-meta.mjs", ["Stage 2/3/4 contract", "opening rule coverage", "Duplicate board hex", "canonicalOpeningRuleId"]],
  ["public/sw.js", ["v1.6.9-practice-loop", "/review/history", "/insights"]],
  ["app/api/health/route.ts", ["version: \"1.6.9\""]],
];

let failed = false;
for (const [file, forbidden] of [["app/focus/page.tsx", 'href="/review"'], ["app/comps/page.tsx", "onDoubleClick"]]) {
  if (fs.readFileSync(file, "utf8").includes(forbidden)) {
    console.error(`Flow regression: ${file} contains ${forbidden}`);
    failed = true;
  }
}
for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`V1.6.9 flow verification failed: missing ${file}`);
    failed = true;
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`V1.6.9 flow verification failed: ${file} is missing ${needle}`);
      failed = true;
    }
  }
}

const snapshot = JSON.parse(fs.readFileSync("data/live-meta.generated.json", "utf8"));
const snapshotIds = new Set((snapshot.records ?? []).map((record) => record.id));
for (const id of requiredCompIds) {
  if (!snapshotIds.has(id)) {
    console.error(`V1.6.9 flow verification failed: reviewed baseline is missing ${id}`);
    failed = true;
  }
}
if (snapshotIds.size !== requiredCompIds.length) {
  console.error(`V1.6.9 flow verification failed: expected ${requiredCompIds.length} reviewed comp IDs, got ${snapshotIds.size}`);
  failed = true;
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.version !== "1.6.9") {
  console.error(`V1.6.9 flow verification failed: package version is ${pkg.version}`);
  failed = true;
}
if (!pkg.scripts?.["verify:flow"] || !pkg.scripts?.["release:check"]?.includes("verify:flow")) {
  console.error("V1.6.9 flow verification failed: verify:flow must be part of release:check.");
  failed = true;
}

if (failed) process.exit(1);
console.log("V1.6.9 flow contract verified: exact 17-comp 18.2b baseline, opening guidance, explicit Focus → Review capture, per-comp Insights, cloud-synced five-game practice goals, offline shell and release version wiring are present.");
