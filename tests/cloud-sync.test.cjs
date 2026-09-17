const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader, browser } = require('./helpers.cjs');
function fixture() {
  const env = browser();
  const load = loader({}, env);
  const workspace = load('lib/workspace.ts');
  const sync = load('lib/cloud-sync.ts');
  let remote = null, sequence = 0, beforeWrite = null, writes = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'a' } }, error: null }) },
    from() {
      let action = 'select', value, revision;
      const query = {
        select() { return query; },
        eq(k, v) { if (k === 'updated_at') revision = v; return query; },
        update(v) { action = 'update'; value = v; return query; },
        insert(v) { action = 'insert'; value = v; return query; },
        async maybeSingle() {
          if (action === 'select') return { data: remote, error: null };
          if (beforeWrite) { beforeWrite(); beforeWrite = null; }
          if (action === 'insert' && remote) return { data: null, error: { code: '23505' } };
          if (action === 'update' && remote?.updated_at !== revision) return { data: null, error: null };
          writes++;
          remote = { payload: value.payload, updated_at: `rev-${++sequence}` };
          return { data: remote, error: null };
        },
      };
      return query;
    },
  };
  const snapshot = name => ({ version: 1, savedAt: 100, builder: { name }, imports: [], reviews: [], favorites: [], recents: [], focusStates: {}, tray: [], opening: null, trainingFocus: null, locale: 'zh' });
  return { env, workspace, sync, client, snapshot, set remote(v) { remote = v; }, get remote() { return remote; }, set beforeWrite(fn) { beforeWrite = fn; }, get writes() { return writes; } };
}
test('a stale device cannot overwrite an unknown cloud revision', async () => {
  const f = fixture();
  f.workspace.writeWorkspaceSnapshot(f.snapshot('old'));
  f.remote = { payload: f.snapshot('new'), updated_at: 'remote-2' };
  await assert.rejects(f.sync.syncWorkspace(f.client, 'a', 'auto'), /conflict/i);
  assert.equal(f.remote.payload.builder.name, 'new');
  assert.equal(f.workspace.readWorkspaceSnapshot().builder.name, 'old');
  assert.equal(JSON.parse(f.env.store.get(f.sync.SYNC_BACKUPS_KEY))[0].remote.payload.builder.name, 'new');
});
test('successful uploads preserve edit timestamps; unchanged smart sync makes no write', async () => {
  const f = fixture();
  f.workspace.writeWorkspaceSnapshot(f.snapshot('first'));
  await f.sync.syncWorkspace(f.client, 'a', 'auto');
  assert.equal(f.remote.payload.savedAt, 100);
  await f.sync.syncWorkspace(f.client, 'a', 'smart');
  assert.equal(f.writes, 1);
  f.workspace.writeWorkspaceSnapshot({ ...f.snapshot('second'), savedAt: 101 });
  await f.sync.syncWorkspace(f.client, 'a', 'auto');
  assert.equal(f.remote.payload.builder.name, 'second');
  assert.equal(f.remote.payload.savedAt, 101);
});
test('conditional updates reject concurrent remote writes even for manual push', async () => {
  const f = fixture();
  f.workspace.writeWorkspaceSnapshot(f.snapshot('local'));
  f.remote = { payload: f.snapshot('remote'), updated_at: 'rev-original' };
  f.beforeWrite = () => { f.remote = { payload: f.snapshot('concurrent'), updated_at: 'rev-race' }; };
  await assert.rejects(f.sync.syncWorkspace(f.client, 'a', 'push'), /conflict/i);
  assert.equal(f.remote.payload.builder.name, 'concurrent');
});
test('concurrent first insert cannot replace an existing row', async () => {
  const f = fixture();
  f.workspace.writeWorkspaceSnapshot(f.snapshot('local'));
  f.beforeWrite = () => { f.remote = { payload: f.snapshot('other'), updated_at: 'race' }; };
  await assert.rejects(f.sync.syncWorkspace(f.client, 'a', 'auto'), /conflict/i);
  assert.equal(f.remote.payload.builder.name, 'other');
});
test('smart sync pulls only when local content still matches its baseline', async () => {
  const f = fixture();
  f.workspace.writeWorkspaceSnapshot(f.snapshot('first'));
  await f.sync.syncWorkspace(f.client, 'a', 'auto');
  f.remote = { payload: f.snapshot('remote-edit'), updated_at: 'new-revision' };
  await f.sync.syncWorkspace(f.client, 'a', 'smart');
  assert.equal(f.workspace.readWorkspaceSnapshot().builder.name, 'remote-edit');
  assert.ok(f.env.events.at(-1).detail.restored);
});
test('switching accounts cannot automatically upload another account workspace', async () => {
  const f = fixture();
  f.workspace.writeWorkspaceSnapshot(f.snapshot('account-a'));
  await f.sync.syncWorkspace(f.client, 'a', 'auto');
  f.remote = null;
  f.client.auth.getUser = async () => ({ data: { user: { id: 'b' } } });
  await assert.rejects(f.sync.syncWorkspace(f.client, 'b', 'auto'), /conflict/i);
  assert.equal(f.remote, null);
});
test('invalid remote backups never overwrite local storage', async () => {
  const f = fixture();
  f.workspace.writeWorkspaceSnapshot(f.snapshot('keep'));
  f.remote = { payload: {}, updated_at: 'bad' };
  await assert.rejects(f.sync.syncWorkspace(f.client, 'a', 'pull'), /Invalid cloud backup/);
  assert.equal(f.workspace.readWorkspaceSnapshot().builder.name, 'keep');
});
test('custom and older imported comps survive workspace round trips', async () => {
  const f = fixture();
  const value = f.snapshot('custom');
  value.imports = [{ nameZh: '自定义德子九五', patch: '18.2' }, { name: 'Draven Fast 9', patch: '18.1' }];
  f.workspace.writeWorkspaceSnapshot(value);
  await f.sync.syncWorkspace(f.client, 'a', 'auto');
  f.workspace.writeWorkspaceSnapshot(f.snapshot('other'));
  await f.sync.syncWorkspace(f.client, 'a', 'pull');
  assert.equal(JSON.stringify(f.workspace.readWorkspaceSnapshot().imports), JSON.stringify(value.imports));
});
