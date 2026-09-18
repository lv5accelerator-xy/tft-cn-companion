const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers.cjs');
const snapshot = require('../data/rankings.generated.json');
const load = loader({
  './rankings.generated.json': { default: snapshot },
  './live-meta.generated.json': { default: require('../data/live-meta.generated.json') },
  './opgg-meta.generated.json': { default: require('../data/opgg-meta.generated.json') },
});
const { metaComps } = load('data/meta.ts');
const { comparisonsForComp, relatedGuides, groupCompGuides, rankedGroups } = load('data/rankings.ts');

test('ranking snapshot preserves verified source counts, scope and valid statistics', () => {
  assert.equal(snapshot.records.length, 76);
  assert.equal(new Set(snapshot.records.map(r => r.id)).size, 76);
  for (const source of snapshot.sources) {
    assert.equal(snapshot.records.filter(r => r.sourceId === source.id).length, source.recordCount);
    assert.equal(source.sourceUpdatedAt, null); // Relative labels must never become invented timestamps.
  }
  for (const entry of snapshot.records) {
    assert.equal(entry.patch, '18.2b');
    assert.ok(entry.name && entry.nameZh);
    assert.ok(['S', 'A', 'B', 'C', 'D', 'X'].includes(entry.tier));
    assert.equal(new URL(entry.url).hostname, entry.sourceId === 'metatft' ? 'www.metatft.com' : 'tftacademy.com');
    if (entry.stats) {
      assert.ok(entry.stats.averagePlacement >= 1 && entry.stats.averagePlacement <= 8);
      assert.ok(entry.stats.winRate >= 0 && entry.stats.winRate <= entry.stats.top4Rate);
      assert.ok(entry.stats.top4Rate <= 1);
    }
  }
  assert.equal(snapshot.records.filter(r => r.sourceId === 'tft-academy' && r.tier === 'S').length, 0);
  assert.equal(snapshot.records.filter(r => r.conditionalTier).length, 6);
});

test('explicit mappings are unique and each current guide still matches its reviewed lineup', () => {
  const entries = new Set();
  const refs = new Set();
  for (const group of snapshot.groups) {
    for (const id of group.entries) {
      assert.ok(snapshot.records.some(r => r.id === id), id);
      assert.ok(!entries.has(id), id); entries.add(id);
    }
    for (const ref of group.guides) {
      const key = `${ref.sourceId}:${ref.id}`;
      assert.ok(!refs.has(key), key); refs.add(key);
      const comp = metaComps.find(c => c.sourceId === ref.sourceId && c.id === ref.id);
      assert.ok(comp, key);
      assert.equal(comp.patch, ref.patch);
      assert.equal(JSON.stringify([...comp.coreUnits, ...comp.flexUnits].sort()), JSON.stringify(ref.units));
      assert.equal(comparisonsForComp(comp).length, group.entries.length);
    }
  }
  assert.equal(rankedGroups.reduce((n, g) => n + g.entries.length, 0), 76);
});

test('Ahri ratings remain independent and stale or manual builds cannot inherit ratings', () => {
  const comp = metaComps.find(c => c.id === 'tuding-182-invoker-ahri');
  assert.equal(comp.sourceTier, 'A+');
  const entries = comparisonsForComp(comp);
  assert.equal(entries.find(e => e.sourceId === 'tft-academy').tier, 'A');
  assert.equal(entries.find(e => e.sourceId === 'metatft').tier, 'S');
  assert.equal(comparisonsForComp({ ...comp, patch: '18.3' }).length, 0);
  assert.equal(comparisonsForComp({ ...comp, coreUnits: ['Draven'] }).length, 0);
  assert.equal(comparisonsForComp({ ...comp, syncOrigin: 'manual' }).length, 0);
});

test('grouping retains guides, original patches, distinct builds and situational requirements', () => {
  const comp = metaComps.find(c => c.id === 'tuding-182-draven-fast9');
  const guides = relatedGuides(comp);
  assert.equal(guides.length, 2);
  assert.equal(guides.find(c => c.sourceId === 'opgg').patch, '18.2');
  assert.equal(guides.find(c => c.sourceId === 'tuding').patch, '18.2b');
  assert.equal(groupCompGuides(guides).length, 1);
  assert.equal(groupCompGuides(guides)[0].sourceId, 'tuding');
  assert.equal(metaComps.length, 32); // No persisted workspace references removed.
  assert.ok(groupCompGuides(metaComps).some(c => c.id === 'tuding-182-dragon-fast9'));
  const veigar = metaComps.find(c => c.id === 'tuding-182-fae-veigar');
  assert.equal(comparisonsForComp(veigar)[0].conditionalTier, 'A');
  assert.equal(comparisonsForComp(veigar)[0].tier, 'X');
  assert.equal(comparisonsForComp(metaComps.find(c => c.id === 'tuding-182b-faerie-rengar-tristana')).length, 0);
});
