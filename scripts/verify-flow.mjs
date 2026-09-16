import fs from "node:fs";

const requiredCompIds = [
  "tuding-182-dragon-fast9",
  "tuding-182-draven-fast9",
  "tuding-182-nidalee-aphelios",
  "tuding-182-thorn-soraka",
  "tuding-182-rift-blue",
  "tuding-182-invoker-ahri",
  "tuding-182-baby-akali",
  "tuding-182-primal-double-carry",
  "tuding-182-primal-lotus",
  "tuding-182-brawler-yi",
  "tuding-182-eclipse-reroll",
  "tuding-182-overlord-caitlyn",
  "tuding-182-fae-veigar",
  "tuding-182-vanguard-aphelios",
];

const checks = [
  ["lib/opening-rules.ts", ["scoreSourceOpeningRule", "REVIEWED_OPENING_RULE_IDS", ...requiredCompIds]],
  ["lib/opening-assistant.ts", ["guideScore", "guideReasons", "guideCautions", "scoreSourceOpeningRule"]],
  ["lib/smart-guidance.ts", ["match.guideReasons", "match.guideCautions", "guideScore"]],
  ["app/components/EndGameReviewButton.tsx", ["/review?capture=1", "结束对局", "End game"]],
  ["app/components/ReviewCaptureBridge.tsx", ["capture", "REVIEW_DRAFT_KEY", "deriveStageBoardPlans", "window.location.replace(\"/review\")"]],
  ["app/components/DesktopShell.tsx", ["ReviewCaptureBridge", "EndGameReviewButton", "V1.6.7"]],
  ["scripts/verify-meta.mjs", ["Stage 2/3/4 contract", "opening rule coverage", "Duplicate board hex"]],
  ["public/sw.js", ["v1.6.7-set18", "/review/history", "/insights"]],
  ["app/api/health/route.ts", ["version: \"1.6.7\""]],
];

let failed = false;
for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`V1.6.7 flow verification failed: missing ${file}`);
    failed = true;
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`V1.6.7 flow verification failed: ${file} is missing ${needle}`);
      failed = true;
    }
  }
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.version !== "1.6.7") {
  console.error(`V1.6.7 flow verification failed: package version is ${pkg.version}`);
  failed = true;
}
if (!pkg.scripts?.["verify:flow"] || !pkg.scripts?.["release:check"]?.includes("verify:flow")) {
  console.error("V1.6.7 flow verification failed: verify:flow must be part of release:check.");
  failed = true;
}

if (failed) process.exit(1);
console.log("V1.6.7 flow contract verified: 14 reviewed opening rules, explicit Focus → Review capture, data-fidelity guards, offline shell and release version wiring are present.");
