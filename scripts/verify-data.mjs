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

const championEntries = Object.entries(enChampions.data || {}).filter(
  ([id, entry]) => isSet18Champion(id) && entry.name && !/^Lux \(/i.test(entry.name),
);
const traitEntries = Object.entries(enTraits.data || {}).filter(([id, entry]) => isSet18Trait(id) && entry.name);
const rawAugmentEntries = Object.entries(enAugments.data || {}).filter(([id, entry]) => isSet18Augment(id) && entry.name);
const augmentEntries = dedupeVisibleNames(rawAugmentEntries, zhAugments.data || {});

const championIds = championEntries.map(([id]) => id);
const traitIds = traitEntries.map(([id]) => id);
const augmentIds = augmentEntries.map(([id]) => id);
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
console.log(`Display champions: ${championIds.length}`);
console.log(`Display traits: ${traitIds.length}`);
console.log(`Display augments: ${augmentIds.length} (raw ${rawAugmentEntries.length})`);
console.log(`Standard components found: ${componentNames.length - missingComponents.length}/${componentNames.length}`);
console.log(`Completed items found: ${expectedCompletedItems.length - missingCompletedItems.length}/${expectedCompletedItems.length}`);

if (championIds.length < 50) throw new Error(`Too few display champions: ${championIds.length}`);
if (championEntries.some(([, entry]) => /^Lux \(/i.test(entry.name || ""))) throw new Error("Lux form variants leaked into display catalog");
if (traitIds.length < 5) throw new Error(`Too few display traits: ${traitIds.length}`);
if (augmentIds.length < 30) throw new Error(`Too few display augments: ${augmentIds.length}`);
if (augmentIds.length >= rawAugmentEntries.length) throw new Error("Expected duplicate augment cleanup did not occur");
if (missingChampionTranslations.length) throw new Error(`Missing zh_CN champions: ${missingChampionTranslations.join(", ")}`);
if (missingTraitTranslations.length) throw new Error(`Missing zh_CN traits: ${missingTraitTranslations.join(", ")}`);
if (missingAugmentTranslations.length) throw new Error(`Missing zh_CN augments: ${missingAugmentTranslations.join(", ")}`);
if (missingComponents.length) throw new Error(`Missing components: ${missingComponents.join(", ")}`);
if (missingCompletedItems.length) throw new Error(`Missing completed items: ${missingCompletedItems.join(", ")}`);
if (missingZhItemIds.length) throw new Error(`Missing zh_CN item IDs: ${missingZhItemIds.join(", ")}`);

console.log("Riot TFT cleaned catalog verification passed.");
