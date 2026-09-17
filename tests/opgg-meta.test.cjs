const { test } = require('node:test');
const assert = require('node:assert/strict');
const snapshot = require('../data/opgg-meta.generated.json');
const { loader } = require('./helpers.cjs');
test('OP.GG snapshot preserves provenance and selected source tiers', () => {
  assert.equal(snapshot.records.length, 15);
  assert.match(snapshot.sourceUrl, /^https:\/\/op.gg\/tft\//);
  assert.ok(Number.isFinite(Date.parse(snapshot.generatedAt)));
  assert.equal(snapshot.sourceUpdatedLabel, '1 week ago');
  assert.equal(new Set(snapshot.records.map(r => r.id)).size, snapshot.records.length);
  for (const record of snapshot.records) {
    assert.equal(record.sourceId, 'opgg');
    assert.equal(record.patch, '18.2');
    assert.equal(record.gameMode, 'TFT');
    assert.equal(record.updatedAt, ''); // Capture date is not the upstream update date.
    assert.ok(['OP', 'S', 'A'].includes(record.ranking.sourceTier));
    assert.equal(record.ranking.statisticsBasis, 'label');
    assert.ok(record.ranking.games > 0 && record.ranking.totalGames >= record.ranking.games);
    for (const key of ['winRate', 'top4Rate', 'pickRate']) assert.ok(record.ranking[key] >= 0 && record.ranking[key] <= 1);
    assert.ok(Math.abs(record.ranking.pickRate - record.ranking.games / record.ranking.totalGames) < 0.00001);
    assert.ok(record.ranking.averagePlacement >= 1 && record.ranking.averagePlacement <= 8);
    assert.match(record.ranking.teamCode, /TFTSet18$/);
    const roster = [...record.coreUnits, ...record.flexUnits];
    assert.equal(new Set(roster).size, roster.length);
    assert.ok(roster.length <= 10);
    assert.equal(record.stages.length, 3);
    const cells = new Set();
    for (const cell of record.board) {
      assert.ok(roster.includes(cell.unit));
      assert.ok(Number.isInteger(cell.row) && cell.row >= 0 && cell.row < 4);
      assert.ok(Number.isInteger(cell.col) && cell.col >= 0 && cell.col < 7);
      assert.ok(!cells.has(`${cell.row}:${cell.col}`));
      cells.add(`${cell.row}:${cell.col}`);
    }
    if (!record.board.length) assert.match(record.positioningNote, /来源未提供/);
  }
});
test('coordinate conversion keeps Draven in the back and Maokai in front', () => {
  const comp = snapshot.records.find(r => r.name === 'Elderwood Draven');
  assert.deepEqual(comp.board.find(p => p.unit === 'Draven'), { unit: 'Draven', row: 3, col: 6 });
  assert.deepEqual(comp.board.find(p => p.unit === 'Maokai'), { unit: 'Maokai', row: 0, col: 3 });
});
test('ranked comps appear in the shared catalog alongside all original guides', () => {
  const load = loader({ './live-meta.generated.json': { default: require('../data/live-meta.generated.json') }, './opgg-meta.generated.json': { default: snapshot } });
  const { metaComps, compsForSource } = load('data/meta.ts');
  assert.equal(metaComps.length, 29);
  assert.equal(compsForSource('opgg').length, 15);
  assert.equal(compsForSource('tuding').length, 14);
  assert.equal(metaComps[0].ranking.sourceTier, 'OP');
});
