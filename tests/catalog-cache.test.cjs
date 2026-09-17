const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers.cjs');
test('concurrent catalog callers share one request and have independent response bodies', async () => {
  let calls = 0;
  const api = loader({}, { fetch: async () => { calls++; return Response.json({ champions: ['test'] }); } })('lib/catalog-client.ts');
  const results = await Promise.all([api.fetchTftCatalog(), api.fetchTftCatalog(), api.fetchTftCatalog()]);
  assert.equal(calls, 1);
  for (const response of results) assert.deepEqual(await response.json(), { champions: ['test'] });
});
test('failed catalog requests are evicted so retry can recover', async () => {
  let calls = 0;
  const api = loader({}, { fetch: async () => ++calls === 1 ? new Response('', { status: 502 }) : Response.json({ champions: [] }) })('lib/catalog-client.ts');
  await assert.rejects(api.fetchTftCatalog());
  assert.equal((await api.fetchTftCatalog()).status, 200);
  assert.equal(calls, 2);
});
