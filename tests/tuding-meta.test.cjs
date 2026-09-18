const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers.cjs');
const snapshot = require('../data/live-meta.generated.json');
const { tudingOriginals } = loader()('data/tuding-originals.ts');

test('every current Tuding guide has a matching original and preserves printed grades', () => {
  assert.equal(snapshot.records.length, 17);
  for (const record of snapshot.records) {
    const image = tudingOriginals[record.id];
    assert.ok(image, record.id);
    assert.equal(image.patch, record.patch);
    assert.equal(image.articleUrl, record.articleUrl);
    assert.equal(record.articleUrl, 'https://news.qq.com/rain/a/20260917A05EUU00');
    assert.equal(record.patch, '18.2b');
    assert.equal(image.imagePatch, '18.2');
    assert.equal(record.tier, record.sourceTier === 'A+' ? 'A' : record.sourceTier);
    assert.match(image.url, /^https:\/\/inews\.gtimg\.com\/om_bt\/.+\/0$/);
    assert.ok(image.width > 0 && image.height > 0);
  }
  assert.equal(snapshot.records.find(r => r.id === 'tuding-182-invoker-ahri').sourceTier, 'A+');
});

test('replaced Soraka comp is distinct from new Zyra carry while unchanged comps retain IDs', () => {
  const ids = new Set(snapshot.records.map(r => r.id));
  assert.ok(!ids.has('tuding-182-thorn-soraka'));
  assert.ok(ids.has('tuding-182b-executioner-zyra'));
  assert.ok(ids.has('tuding-182-draven-fast9'));
  assert.equal(snapshot.records.find(r => r.id === 'tuding-182b-executioner-zyra').coreUnits[0], '婕拉');
});
