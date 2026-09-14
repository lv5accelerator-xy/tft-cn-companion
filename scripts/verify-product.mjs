import fs from "node:fs";

const checks = [
  ["app/share/page.tsx", ["V1.4.3", "导出 PNG", "PRODUCT_URL"]],
  ["app/demo/page.tsx", ["3-MINUTE GUIDED DEMO", "不改你的数据", "开始我的第一局"]],
  ["lib/review-intelligence.ts", ["buildReviewIntelligence", "recentDelta", "observations"]],
  ["app/insights/page.tsx", ["V1.5", "个人复盘洞察", "Review Intelligence"]],
  ["lib/preferences.ts", ["PREFERENCES_KEY", "prioritizeFamiliar", "preferSimpleExecution"]],
  ["app/preferences/page.tsx", ["V1.5.1", "个人偏好", "Smart Guidance"]],
  ["lib/smart-guidance.ts", ["buildSmartGuidance", "guidanceScore", "familiarityAdjustment"]],
  ["app/coach/page.tsx", ["V1.6", "可解释智能指导", "No live opponent"]],
  ["app/components/DesktopShell.tsx", ["/coach", "/insights", "/share", "V1.6"]],
  ["app/v16.css", ["max-width:1366px", "overflow-y:auto", "data-ui-topbar"]],
];

let failed = false;
for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`Product evolution failed: missing ${file}`);
    failed = true;
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`Product evolution failed: ${file} is missing ${needle}`);
      failed = true;
    }
  }
}

const smartGuidance = fs.existsSync("lib/smart-guidance.ts") ? fs.readFileSync("lib/smart-guidance.ts", "utf8") : "";
if (/(opponent scouting|hidden information|screen capture|real-time opponent)/i.test(smartGuidance)) {
  console.error("Product evolution failed: Smart Guidance must not implement live opponent or hidden-information logic.");
  failed = true;
}

if (failed) process.exit(1);
console.log("Product evolution contract verified: V1.4.3 → V1.5 → V1.5.1 → V1.6 features and small-screen safety are present.");
