const DDRAGON = "https://ddragon.leagueoflegends.com";

const componentNames = [
  "B.F. Sword", "Recurve Bow", "Needlessly Large Rod", "Tear of the Goddess",
  "Chain Vest", "Negatron Cloak", "Giant's Belt", "Sparring Gloves",
];

const expectedCompletedItems = [
  "Deathblade", "Giant Slayer", "Hextech Gunblade", "Spear of Shojin", "Edge of Night",
  "Bloodthirster", "Sterak's Gage", "Infinity Edge", "Red Buff", "Guinsoo's Rageblade",
  "Statikk Shiv", "Titan's Resolve", "Kraken's Fury", "Nashor's Tooth", "Last Whisper",
  "Rabadon's Deathcap", "Archangel's Staff", "Crownguard", "Ionic Spark", "Morellonomicon",
  "Jeweled Gauntlet", "Blue Buff", "Protector's Vow", "Adaptive Helm", "Spirit Visage",
  "Hand of Justice", "Bramble Vest", "Gargoyle Stoneplate", "Sunfire Cape", "Steadfast Heart",
  "Dragon's Claw", "Evenshroud", "Quicksilver", "Warmog's Armor", "Striker's Flail", "Thief's Gloves",
];

function normalize(value) {
  return value.trim().toLocaleLowerCase("en-US");
}

function isSet18Champion(id) {
  return /\/Sets\/TFTSet18\/Shop\//i.test(id) || /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
}

function isSet18Trait(id) {
  return /^DA(?:_|$)/i.test(id) || /^TFT18[_-]/i.test(id) || /^TFTSet18[_-]/i.test(id);
}

function isSet18Augment(id) {
  return /^DA_18_/i.test(id);
}

function runtimeParsedIds(payload, predicate) {
  return Object.entries(payload.data || {})
    .filter(([dataId, entry]) => Boolean(entry.name && predicate(dataId)))
    .map(([dataId]) => dataId);
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

const championIds = Object.keys(enChampions.data || {}).filter(isSet18Champion);
const traitIds = Object.keys(enTraits.data || {}).filter(isSet18Trait);
const augmentIds = Object.keys(enAugments.data || {}).filter(isSet18Augment);

const runtimeChampionIds = runtimeParsedIds(enChampions, isSet18Champion);
const runtimeTraitIds = runtimeParsedIds(enTraits, isSet18Trait);
const runtimeAugmentIds = runtimeParsedIds(enAugments, isSet18Augment);
const inlineChampionIds = Object.values(enChampions.data || {})
  .map((entry) => entry.id)
  .filter((id) => typeof id === "string" && isSet18Champion(id));

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
const wantedItemNames = new Set([...componentNames, ...expectedCompletedItems].map(normalize));
const missingZhItemIds = Object.entries(enItems.data || {})
  .filter(([, item]) => wantedItemNames.has(normalize(item.name || "")))
  .map(([id]) => id)
  .filter((id) => !zhItemIds.has(id));

console.log(`Data Dragon: ${version}`);
console.log(`Set 18 champions: ${championIds.length}`);
console.log(`Runtime-parsed champions: ${runtimeChampionIds.length}`);
console.log(`Inline champion IDs matching Set 18: ${inlineChampionIds.length}`);
console.log(`Set 18 traits: ${traitIds.length}`);
console.log(`Runtime-parsed traits: ${runtimeTraitIds.length}`);
console.log(`Set 18 augments: ${augmentIds.length}`);
console.log(`Runtime-parsed augments: ${runtimeAugmentIds.length}`);
console.log(`Standard components found: ${componentNames.length - missingComponents.length}/${componentNames.length}`);
console.log(`Completed items found: ${expectedCompletedItems.length - missingCompletedItems.length}/${expectedCompletedItems.length}`);
console.log(`Augment zh_CN matches: ${augmentIds.length - missingAugmentTranslations.length}/${augmentIds.length}`);

if (championIds.length < 20) throw new Error(`Too few Set 18 champions: ${championIds.length}`);
if (runtimeChampionIds.length !== championIds.length) throw new Error(`Runtime champion parser mismatch: ${runtimeChampionIds.length}/${championIds.length}`);
if (traitIds.length < 5) throw new Error(`Too few Set 18 traits: ${traitIds.length}`);
if (runtimeTraitIds.length !== traitIds.length) throw new Error(`Runtime trait parser mismatch: ${runtimeTraitIds.length}/${traitIds.length}`);
if (augmentIds.length < 30) throw new Error(`Too few Set 18 augments: ${augmentIds.length}`);
if (runtimeAugmentIds.length !== augmentIds.length) throw new Error(`Runtime augment parser mismatch: ${runtimeAugmentIds.length}/${augmentIds.length}`);
if (missingChampionTranslations.length) throw new Error(`Missing zh_CN champions: ${missingChampionTranslations.join(", ")}`);
if (missingTraitTranslations.length) throw new Error(`Missing zh_CN traits: ${missingTraitTranslations.join(", ")}`);
if (missingAugmentTranslations.length) throw new Error(`Missing zh_CN augments: ${missingAugmentTranslations.join(", ")}`);
if (missingComponents.length) throw new Error(`Missing components: ${missingComponents.join(", ")}`);
if (missingCompletedItems.length) throw new Error(`Missing completed items: ${missingCompletedItems.join(", ")}`);
if (missingZhItemIds.length) throw new Error(`Missing zh_CN item IDs: ${missingZhItemIds.join(", ")}`);

console.log("Riot TFT data verification passed.");
