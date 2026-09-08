const DDRAGON = "https://ddragon.leagueoflegends.com";

const componentNames = [
  "B.F. Sword",
  "Recurve Bow",
  "Needlessly Large Rod",
  "Tear of the Goddess",
  "Chain Vest",
  "Negatron Cloak",
  "Giant's Belt",
  "Sparring Gloves",
];

const expectedCompletedItems = [
  "Deathblade",
  "Giant Slayer",
  "Hextech Gunblade",
  "Spear of Shojin",
  "Edge of Night",
  "Bloodthirster",
  "Sterak's Gage",
  "Infinity Edge",
  "Red Buff",
  "Guinsoo's Rageblade",
  "Statikk Shiv",
  "Titan's Resolve",
  "Runaan's Hurricane",
  "Nashor's Tooth",
  "Last Whisper",
  "Rabadon's Deathcap",
  "Archangel's Staff",
  "Crownguard",
  "Ionic Spark",
  "Morellonomicon",
  "Jeweled Gauntlet",
  "Blue Buff",
  "Protector's Vow",
  "Adaptive Helm",
  "Redemption",
  "Hand of Justice",
  "Bramble Vest",
  "Gargoyle Stoneplate",
  "Sunfire Cape",
  "Steadfast Heart",
  "Dragon's Claw",
  "Evenshroud",
  "Quicksilver",
  "Warmog's Armor",
  "Guardbreaker",
  "Thief's Gloves",
];

const knownSet18ChampionNames = new Set([
  "Ahri",
  "Cassiopeia",
  "Cinderling",
  "Master Yi",
  "Morgana",
  "Draven",
  "Soraka",
  "Amumu",
  "Elder Dragon",
  "Lux",
]);

const knownSet18TraitNames = new Set(["Elderwood", "Riftbeast"]);

function normalize(value) {
  return value.trim().toLocaleLowerCase("en-US");
}

function isSet18(id) {
  return /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
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
const [enChampions, zhChampions, enTraits, zhTraits, enItems, zhItems] = await Promise.all([
  getJson(`${base}/en_US/tft-champion.json`),
  getJson(`${base}/zh_CN/tft-champion.json`),
  getJson(`${base}/en_US/tft-trait.json`),
  getJson(`${base}/zh_CN/tft-trait.json`),
  getJson(`${base}/en_US/tft-item.json`),
  getJson(`${base}/zh_CN/tft-item.json`),
]);

const championEntries = Object.entries(enChampions.data || {});
const traitEntries = Object.entries(enTraits.data || {});
const championIds = championEntries.map(([id]) => id).filter(isSet18);
const traitIds = traitEntries.map(([id]) => id).filter(isSet18);
const zhChampionIds = new Set(Object.keys(zhChampions.data || {}));
const zhTraitIds = new Set(Object.keys(zhTraits.data || {}));
const enItemNames = new Set(Object.values(enItems.data || {}).map((item) => normalize(item.name || "")));
const zhItemIds = new Set(Object.keys(zhItems.data || {}));

const knownChampionMatches = championEntries
  .filter(([, champion]) => knownSet18ChampionNames.has(champion.name || ""))
  .map(([id, champion]) => `${champion.name}=${id}`);
const knownTraitMatches = traitEntries
  .filter(([, trait]) => knownSet18TraitNames.has(trait.name || ""))
  .map(([id, trait]) => `${trait.name}=${id}`);
const prefixCounts = championEntries.reduce((map, [id]) => {
  const prefix = id.split("_")[0] || id;
  map.set(prefix, (map.get(prefix) || 0) + 1);
  return map;
}, new Map());

const missingChampionTranslations = championIds.filter((id) => !zhChampionIds.has(id));
const missingTraitTranslations = traitIds.filter((id) => !zhTraitIds.has(id));
const missingComponents = componentNames.filter((name) => !enItemNames.has(normalize(name)));
const missingCompletedItems = expectedCompletedItems.filter((name) => !enItemNames.has(normalize(name)));
const missingZhItemIds = Object.entries(enItems.data || {})
  .filter(([, item]) => [...componentNames, ...expectedCompletedItems].some((name) => normalize(name) === normalize(item.name || "")))
  .map(([id]) => id)
  .filter((id) => !zhItemIds.has(id));

console.log(`Data Dragon: ${version}`);
console.log(`Champion prefix counts: ${JSON.stringify(Object.fromEntries(prefixCounts))}`);
console.log(`Known Set 18 champion IDs: ${knownChampionMatches.join(" | ") || "none"}`);
console.log(`Known Set 18 trait IDs: ${knownTraitMatches.join(" | ") || "none"}`);
console.log(`Set 18 champions by current filter: ${championIds.length}`);
console.log(`Set 18 traits by current filter: ${traitIds.length}`);
console.log(`Standard components found: ${componentNames.length - missingComponents.length}/${componentNames.length}`);
console.log(`Completed items found: ${expectedCompletedItems.length - missingCompletedItems.length}/${expectedCompletedItems.length}`);
console.log(`Missing completed item names: ${missingCompletedItems.join(" | ") || "none"}`);

if (championIds.length < 20) throw new Error(`Too few Set 18 champions: ${championIds.length}`);
if (traitIds.length < 5) throw new Error(`Too few Set 18 traits: ${traitIds.length}`);
if (missingChampionTranslations.length) throw new Error(`Missing zh_CN champions: ${missingChampionTranslations.join(", ")}`);
if (missingTraitTranslations.length) throw new Error(`Missing zh_CN traits: ${missingTraitTranslations.join(", ")}`);
if (missingComponents.length) throw new Error(`Missing components: ${missingComponents.join(", ")}`);
if (missingCompletedItems.length) throw new Error(`Missing completed items: ${missingCompletedItems.join(", ")}`);
if (missingZhItemIds.length) throw new Error(`Missing zh_CN item IDs: ${missingZhItemIds.join(", ")}`);

console.log("Riot TFT data verification passed.");
