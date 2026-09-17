const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers.cjs');
const image = 'data:image/png;base64,AA==';
const input = loader()('lib/image-analysis-input.ts');
const request = body => new Request('http://localhost/api/analyze-comp-image', { method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer test-token' } });
for (const body of [null, [], { images: [image], sourceName: 42 }, { images: [image], patch: [] }, { images: [null] }, { images: [image, image, image, image] }, { images: ['https://example.com/a.png'] }]) {
  test(`invalid input returns a controlled 400: ${JSON.stringify(body)}`, async () => {
    await assert.rejects(input.readAnalysisInput(request(body)), error => error.status === 400);
  });
}
test('oversized bodies are rejected before JSON parsing', async () => {
  await assert.rejects(input.readAnalysisInput(new Request('http://localhost', { method: 'POST', body: 'x'.repeat(3850001) })), error => error.status === 413);
});
test('default patch uses the shared current patch', async () => {
  assert.equal((await input.readAnalysisInput(request({ images: [image] }))).patch, '18.2');
});
function apiFixture({ quota = [1, 0], upstream = 200, output = { gameMode: 'UNKNOWN', sourceName: 'test', patch: '18.2', articleTitle: '', summary: '', warnings: [], comps: [] }, authUser = { id: 'a' }, configured = true } = {}) {
  let calls = 0, authCalls = 0, quotaCalls = 0;
  const load = loader({ '@supabase/supabase-js': { createClient: () => ({ auth: { getUser: async () => { authCalls++; return { data: { user: authUser }, error: null }; } } }) } }, {
    process: { env: { OPENAI_API_KEY: 'test-key', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key', ...(configured ? { UPSTASH_REDIS_REST_URL: 'https://quota.example', UPSTASH_REDIS_REST_TOKEN: 'quota-key' } : {}) } },
    fetch: async (url, init) => {
      if (url === 'https://quota.example') { quotaCalls++; return Response.json({ result: quota }); }
      assert.equal(url, 'https://api.openai.com/v1/responses');
      assert.ok(init.signal);
      assert.equal(JSON.parse(init.body).max_output_tokens, 12000);
      calls++;
      return upstream === 200 ? Response.json({ output_text: JSON.stringify(output) }) : Response.json({ error: { message: 'private provider details' } }, { status: upstream });
    },
  });
  return { route: load('app/api/analyze-comp-image/route.ts'), get calls() { return calls; }, get authCalls() { return authCalls; }, get quotaCalls() { return quotaCalls; } };
}
test('unauthenticated calls never reach the paid API or quota service', async () => {
  const f = apiFixture();
  const r = await f.route.POST(new Request('http://localhost', { method: 'POST', body: '{}' }));
  assert.equal(r.status, 401);
  assert.equal(f.calls + f.quotaCalls, 0);
});
test('invalid JSON types return 400 at the actual route, before consuming quota', async () => {
  const f = apiFixture();
  assert.equal((await f.route.POST(request(null))).status, 400);
  assert.equal(f.quotaCalls, 0);
});
test('missing durable quota configuration fails closed', async () => {
  const f = apiFixture({ configured: false });
  assert.equal((await f.route.POST(request({ images: [image] }))).status, 503);
  assert.equal(f.calls, 0);
});
test('anonymous Supabase users cannot consume the paid API', async () => {
  const f = apiFixture({ authUser: { id: 'a', is_anonymous: true } });
  assert.equal((await f.route.POST(request({ images: [image] }))).status, 401);
  assert.equal(f.calls, 0);
});
test('exhausted quota returns 429 with Retry-After and no AI call', async () => {
  const f = apiFixture({ quota: [0, 60] });
  const r = await f.route.POST(request({ images: [image] }));
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('Retry-After'), '60');
  assert.equal(f.calls, 0);
});
test('authenticated valid request produces validated output', async () => {
  const f = apiFixture();
  assert.equal((await f.route.POST(request({ images: [image] }))).status, 200);
  assert.equal(f.authCalls, 1);
  assert.equal(f.quotaCalls, 1);
  assert.equal(f.calls, 1);
});
test('non-retryable upstream errors do not double spend or leak details', async () => {
  const f = apiFixture({ upstream: 400 });
  const r = await f.route.POST(request({ images: [image] }));
  assert.equal(r.status, 502);
  assert.equal(f.calls, 1);
  assert.doesNotMatch(await r.text(), /private provider details/);
});
test('transient upstream failures try at most one fallback', async () => {
  const f = apiFixture({ upstream: 503 });
  assert.equal((await f.route.POST(request({ images: [image] }))).status, 502);
  assert.equal(f.calls, 2);
});
test('malformed model output is rejected without another paid attempt', async () => {
  const f = apiFixture({ output: { comps: 'invalid' } });
  assert.equal((await f.route.POST(request({ images: [image] }))).status, 502);
  assert.equal(f.calls, 1);
});
