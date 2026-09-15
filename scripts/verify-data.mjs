import { readFile } from "node:fs/promises";
import path from "node:path";

const DDRAGON = "https://ddragon.leagueoflegends.com";
const CDRAGON = "https://raw.communitydragon.org/latest";

const componentNames = [
  "B.F. Sword", "Recurve Bow", "Needlessly Large Rod", "Tear of the Goddess",
  "Chain Vest", "Negatron Cloak", "Giant's Belt", "Sparring Gloves", "Spatula", "Frying Pan",
];

const expectedCompletedItems = [
  "Deathblade", "Giant Slayer", "Hextech Gunblade", "Spear of Shojin", "Edge of Night",
  "Bloodthirster", "Sterak's Gage", "Infinity Edge", "Red Buff", "Guinsoo's Rageblade",
  "Void Staff", "Titan's Resolve", "Kraken's Fury", "Nashor's Tooth", "Last Whisper",
  "Rabadon's Deathcap", "Archangel's Staff", "Crownguard", "Ionic Spark", "Morellonomicon",
  "Jeweled Gauntlet", "Blue Buff", "Protector's Vow", "Adaptive Helm", "Spirit Visage",
  "Hand of Justice", "Bramble Vest", "Gargoyle Stoneplate", "Sunfire Cape", "Steadfast Heart",
  "Dragon's Claw", "Evenshroud", "Quicksilver", "Warmog's Armor", "Striker's Flail", "Thief's Gloves",
];

const expectedEmblems = [
  "Fae Emblem", "Inferno Emblem", "Blossom Emblem", "Lunar Emblem",
  "Elderwood Emblem", "Sprykin Emblem", "Blackthorn Emblem", "Primal Emblem",
  "Hunter Emblem", "Rapidfire Emblem", "Spellweaver Emblem", "Invoker Emblem",
  "Vanguard Emblem", "Ravager Emblem", "Brawler Emblem", "Executioner Emblem",
];

const expectedTacticianItems = [
  "Tactician's Crown", "Tactician's Cape", "Tactician's Shield",
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ");
}

function isSet18Champion(id) {
  return /\/Sets\/TFTSet18\/Shop\//i.test(id)
    || /^TFT18[_-]/i.test(id)
    || /^TFTSet18[_-]/i.test(id)
    || /^DA_(?:18_|.*18$)/i.test(id);
}

function isSet18Trait(id) {
  return /^DA(?:_|$)/i.test(id) || /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
}

function isSet18Augment(id) {
  return /^DA_18_/i.test(id);
}

function isArtifactItem(id) {
  return /(?:ornn|artifact)/i.test(id) && !/(radiant|support|augment)/i.test(id);
}

function tftShopPortraitUrl(image) {
  const full = image?.full;
  if (!full) return null;

  const lower = full.toLocaleLowerCase("en-US");
  const splashIndex = lower.indexOf("_splash");
  const stem = (splashIndex > 0 ? full.slice(0, splashIndex) : full.replace(/\.[^.]+$/, ""))
    .toLocaleLowerCase("en-US");

  if (!stem.startsWith("tft18_")) return null;
  return `${CDRAGON}/game/assets/characters/${stem}/${stem}_square.png`;
}

function championPortraitUrl(version, image) {
  if (!image?.full) return null;
  return tftShopPortraitUrl(image) || `${DDRAGON}/cdn/${version}/img/tft-champion/${image.full}`;
}

function aliasesForChampion(nameZh) {
  const aliases = [];
  if (/苍蓝.*雕.*魔像/.test(nameZh)) aliases.push("蓝霸符", "苍蓝雕像");
  if (/远古.*石甲虫/.test(nameZh)) aliases.push("石甲虫");
  if (/迅捷蟹/.test(nameZh)) aliases.push("迅捷蟹", "河蟹");
  if (/绯红.*印记.*树怪/.test(nameZh)) aliases.push("红霸符");
  if (nameZh === "绯红树怪") aliases.push("小绯红怪");
  if (/锋喙鸟/.test(nameZh)) aliases.push("锋喙鸟");
  return aliases;
}

function dedupeVisibleNames(entries, zhData) {
  const seen = new Set();
  return entries.filter(([id, entry]) => {
    const zh = zhData[id];
    const key = `${normalize(entry.name || "")}|${normalize(zh?.name || entry.name || "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

const realm = await getJson(`${DDRAGON}/realms/na.json`);
const version = realm.v || realm.n?.item;
if (!version) throw new Error("NA realm did not provide a Data Dragon version");

const base = `${DDRAGON}/cdn/${version}/data`;
const [enChampions, zhChampions, enTraits, zhTraits, enItems, zhItems, enAugments, zhAugments] = await Promise.all([
  getJson(`${base}/en_US/tft-champion.json`),
  getJson(`${base}/zh_CN/tft-champion.json`),
  getJson(`${base}/en_US/tft-trait.json`),
  getJson(`${base}/zh_CN/tft-trait.json`),
  getJson(`${base}/en_US/tft-item.json`),
  getJson(`${base}/zh_CN/tft-item.json`),
  getJson(`${base}/en_US/tft-augments.json`),
  getJson(`${base}/zh_CN/tft-augments.json`),
]);

const rawChampionEntries = Object.entries(enChampions.data || {}).filter(
  ([id, entry]) => isSet18Champion(id) && entry.name && !/^Lux \(/i.test(entry.name),
);
const championEntries = dedupeVisibleNames(rawChampionEntries, zhChampions.data || {});
const traitEntries = Object.entries(enTraits.data || {}).filter(([id, entry]) => isSet18Trait(id) && entry.name);
const rawAugmentEntries = Object.entries(enAugments.data || {}).filter(([id, entry]) => isSet18Augment(id) && entry.name);
const augmentEntries = dedupeVisibleNames(rawAugmentEntries, zhAugments.data || {});
const artifactEntries = Object.entries(enItems.data || {}).filter(([id, entry]) => isArtifactItem(id) && entry.name);

const championIds = championEntries.map(([id]) => id);
const traitIds = traitEntries.map(([id]) => id);
const augmentIds = augmentEntries.map(([id]) => id);
const championPortraitUrls = championEntries.map(([, entry]) => championPortraitUrl(version, entry.image));
const missingChampionPortraits = championPortraitUrls.filter((url) => !url).length;
const zhChampionIds = new Set(Object.keys(zhChampions.data || {}));
const zhTraitIds = new Set(Object.keys(zhTraits.data || {}));
const zhAugmentIds = new Set(Object.keys(zhAugments.data || {}));
const enItemNames = new Set(Object.values(enItems.data || {}).map((item) => normalize(item.name || "")));
const zhItemIds = new Set(Object.keys(zhItems.data || {}));

const missingChampionTranslations = championIds.filter((id) => !zhChampionIds.has(id));
const missingTraitTranslations = traitIds.filter((id) => !zhTraitIds.has(id));
const missingAugmentTranslations = augmentIds.filter((id) => !zhAugmentIds.has(id));
const missingComponents = componentNames.filter((name) => !enItemNames.has(normalize(name)));
const missingCompletedItems = expectedCompletedItems.filter((name) => !enItemNames.has(normalize(name)));
const missingEmblems = expectedEmblems.filter((name) => !enItemNames.has(normalize(name)));
const missingTacticianItems = expectedTacticianItems.filter((name) => !enItemNames.has(normalize(name)));
const wantedItemNames = new Set([
  ...componentNames,
  ...expectedCompletedItems,
  ...expectedEmblems,
  ...expectedTacticianItems,
].map(normalize));
const missingZhItemIds = Object.entries(enItems.data || {})
  .filter(([, item]) => wantedItemNames.has(normalize(item.name || "")))
  .map(([id]) => id)
  .filter((id) => !zhItemIds.has(id));

const championLookup = new Set();
for (const [id, entry] of championEntries) {
  const zh = zhChampions.data?.[id];
  const nameZh = zh?.name || entry.name || id;
  [id, entry.name, nameZh, ...aliasesForChampion(nameZh)].forEach((name) => {
    if (name) championLookup.add(normalize(name));
  });
}

const snapshotPath = path.join(process.cwd(), "data", "live-meta.generated.json");
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const unresolvedSourceUnits = [];
for (const record of snapshot.records || []) {
  const sourceUnits = new Set([
    ...(record.coreUnits || []),
    ...(record.flexUnits || []),
    ...((record.board || []).map((position) => position.unit)),
  ]);
  for (const unit of sourceUnits) {
    if (!championLookup.has(normalize(unit))) unresolvedSourceUnits.push(`${record.id}:${unit}`);
  }
}

console.log(`Data Dragon: ${version}`);
console.log(`Display champions: ${championIds.length} (raw Set 18 candidates ${rawChampionEntries.length})`);
console.log(`Champion portrait URLs: ${championPortraitUrls.length - missingChampionPortraits}/${championPortraitUrls.length}`);
console.log(`Display traits: ${traitIds.length}`);
console.log(`Display augments: ${augmentIds.length} (raw ${rawAugmentEntries.length})`);
console.log(`Components found: ${componentNames.length - missingComponents.length}/${componentNames.length}`);
console.log(`Completed items found: ${expectedCompletedItems.length - missingCompletedItems.length}/${expectedCompletedItems.length}`);
console.log(`Craftable emblems found: ${expectedEmblems.length - missingEmblems.length}/${expectedEmblems.length}`);
console.log(`Tactician items found: ${expectedTacticianItems.length - missingTacticianItems.length}/${expectedTacticianItems.length}`);
console.log(`Artifact item records found: ${artifactEntries.length}`);
console.log(`Reviewed comp unit references resolved: ${unresolvedSourceUnits.length ? "NO" : "YES"}`);

if (championIds.length < 50) throw new Error(`Too few display champions: ${championIds.length}`);
if (championEntries.some(([, entry]) => /^Lux \(/i.test(entry.name || ""))) throw new Error("Lux form variants leaked into display catalog");
if (missingChampionPortraits) throw new Error(`Missing TFT champion portraits: ${missingChampionPortraits}`);
if (traitIds.length < 5) throw new Error(`Too few display traits: ${traitIds.length}`);
if (augmentIds.length < 30) throw new Error(`Too few display augments: ${augmentIds.length}`);
if (augmentIds.length >= rawAugmentEntries.length) throw new Error("Expected duplicate augment cleanup did not occur");
if (missingChampionTranslations.length) throw new Error(`Missing zh_CN champions: ${missingChampionTranslations.join(", ")}`);
if (missingTraitTranslations.length) throw new Error(`Missing zh_CN traits: ${missingTraitTranslations.join(", ")}`);
if (missingAugmentTranslations.length) throw new Error(`Missing zh_CN augments: ${missingAugmentTranslations.join(", ")}`);
if (missingComponents.length) throw new Error(`Missing components: ${missingComponents.join(", ")}`);
if (missingCompletedItems.length) throw new Error(`Missing completed items: ${missingCompletedItems.join(", ")}`);
if (missingEmblems.length) throw new Error(`Missing Set 18 craftable emblems: ${missingEmblems.join(", ")}`);
if (missingTacticianItems.length) throw new Error(`Missing tactician items: ${missingTacticianItems.join(", ")}`);
if (artifactEntries.length < 15) throw new Error(`Too few artifact item records: ${artifactEntries.length}`);
if (missingZhItemIds.length) throw new Error(`Missing zh_CN item IDs: ${missingZhItemIds.join(", ")}`);
if (unresolvedSourceUnits.length) throw new Error(`Reviewed comp units missing from TFT catalog: ${unresolvedSourceUnits.join(", ")}`);

const portraitSamples = championPortraitUrls.filter(Boolean).slice(0, 3);
for (const url of portraitSamples) {
  const response = await fetch(url, { method: "HEAD" });
  if (!response.ok) throw new Error(`Missing TFT champion portrait: ${response.status} ${url}`);
}
console.log(`TFT champion portrait samples verified: ${portraitSamples.length}/${portraitSamples.length}`);
console.log("Riot TFT cleaned catalog verification passed, including reviewed comp unit resolution.");
