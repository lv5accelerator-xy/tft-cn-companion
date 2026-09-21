const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers.cjs');
const { patchPageQuery, snapshotAge } = loader({}, { URLSearchParams })('lib/page-query.ts');

test('ranking filters survive URL round trips and retain literal search text', () => {
  const query = patchPageQuery('?source=metatft&tier=S', { q: '阿狸 & all' });
  const params = new URLSearchParams(query);
  assert.equal(params.get('source'), 'metatft');
  assert.equal(params.get('tier'), 'S');
  assert.equal(params.get('q'), '阿狸 & all');
  assert.equal(new URLSearchParams(patchPageQuery(query, { q: 'all' })).get('q'), 'all');
});

test('switching guide filters removes the deep-link constraint without losing other filters', () => {
  const params = new URLSearchParams(patchPageQuery('?source=tuding&comp=old&q=阿狸', { comp: null, style: 'FAST8' }));
  assert.equal(params.has('comp'), false);
  assert.equal(params.get('source'), 'tuding');
  assert.equal(params.get('style'), 'FAST8');
  assert.equal(params.get('q'), '阿狸');
  assert.equal(patchPageQuery(params.toString(), { source: 'all', style: null, q: '', comp: null }), '');
});

test('snapshot age warns exactly at 48 hours and does not invent ages for invalid or future captures', () => {
  const captured = '2026-09-18T18:12:24Z';
  const now = Date.parse(captured);
  assert.equal(snapshotAge(captured, now + 48 * 3_600_000 - 1).needsReview, false);
  assert.equal(snapshotAge(captured, now + 48 * 3_600_000).needsReview, true);
  assert.equal(snapshotAge(captured, now + 72 * 3_600_000).days, 3);
  assert.equal(snapshotAge('not-a-date', now), null);
  assert.equal(snapshotAge(captured, now - 1), null);
});

test('search replaces browser history while source changes create a back-navigation entry', () => {
  const calls = [];
  const window = { location: { pathname: '/rankings', search: '?source=metatft' }, history: {
    pushState: (...args) => calls.push(['push', ...args]),
    replaceState: (...args) => calls.push(['replace', ...args]),
  } };
  const { updatePageQuery } = loader({}, { URLSearchParams, window })('lib/page-query.ts');
  updatePageQuery({ q: '阿狸' }, true);
  updatePageQuery({ source: 'tft-academy' });
  updatePageQuery({ source: 'metatft' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'replace');
  assert.equal(new URL(calls[0][3], 'https://example.com').searchParams.get('q'), '阿狸');
  assert.equal(calls[1][0], 'push');
  assert.equal(calls[1][3], '/rankings?source=tft-academy');
});
