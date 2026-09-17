import type { SupabaseClient } from "@supabase/supabase-js";
import { isWorkspaceSnapshot, readWorkspaceSnapshot, writeWorkspaceSnapshot, type WorkspaceSnapshot } from "./workspace";

export type CloudRecord = { payload: WorkspaceSnapshot; updated_at: string };
type Baseline = { userId: string; revision: string; content: string };
const BASELINE_KEY = "tft-cn-companion-sync-baseline-v1";
export const SYNC_BACKUPS_KEY = "tft-cn-companion-sync-backups-v1";
export class SyncConflict extends Error {
  constructor() { super("云端与本机存在不同版本，已保留双方数据。请在账号页选择同步方向。 / Sync conflict: both copies were preserved. Choose a direction on the account page."); }
}

function content(snapshot: WorkspaceSnapshot) {
  // savedAt is the content edit time, never the upload time.
  return JSON.stringify({ ...snapshot, savedAt: 0 });
}

function baseline(): Baseline | null {
  try { return JSON.parse(window.localStorage.getItem(BASELINE_KEY) || "null") as Baseline | null; }
  catch { return null; }
}

function remember(userId: string, record: CloudRecord) {
  window.localStorage.setItem(BASELINE_KEY, JSON.stringify({ userId, revision: record.updated_at, content: content(record.payload) }));
}

function backup(userId: string, local: WorkspaceSnapshot, remote: CloudRecord | null) {
  const previous = JSON.parse(window.localStorage.getItem(SYNC_BACKUPS_KEY) || "[]") as unknown;
  const entries = Array.isArray(previous) ? previous : [];
  // Fail closed if the backup cannot be written; never overwrite without a recovery copy.
  window.localStorage.setItem(SYNC_BACKUPS_KEY, JSON.stringify([
    ...entries.slice(-4), { userId, at: Date.now(), local, remote },
  ]));
}

export async function loadCloudWorkspace(client: SupabaseClient, userId: string): Promise<CloudRecord | null> {
  const { data, error } = await client.from("tft_workspaces").select("payload,updated_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data && (!isWorkspaceSnapshot(data.payload) || typeof data.updated_at !== "string")) throw new Error("云端备份格式不正确，已保留本机数据。 / Invalid cloud backup; local data preserved.");
  return data as CloudRecord | null;
}

let queue: Promise<unknown> = Promise.resolve();

/** One queue for manual and automatic operations; SQL timestamp predicate prevents cross-device lost updates. */
export function syncWorkspace(client: SupabaseClient, userId: string, mode: "auto" | "smart" | "push" | "pull") {
  const operation = queue.then(async () => {
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || auth.user?.id !== userId) throw new Error("登录状态已改变，请重试。 / Sign-in changed; please retry.");
    const local = readWorkspaceSnapshot();
    const remote = await loadCloudWorkspace(client, userId);
    const base = baseline();
    if (remote && content(local) === content(remote.payload)) {
      remember(userId, remote);
      return remote;
    }
    const remoteUnchanged = base?.userId === userId && base.revision === remote?.updated_at;
    const localUnchanged = base?.userId === userId && base.content === content(local);
    const pull = mode === "pull" || (mode === "smart" && localUnchanged && !remoteUnchanged);
    if (pull) {
      if (!remote) throw new Error("云端没有备份。 / No cloud backup exists.");
      if (content(readWorkspaceSnapshot()) !== content(local)) throw new SyncConflict();
      backup(userId, local, remote);
      writeWorkspaceSnapshot(remote.payload);
      remember(userId, remote);
      return remote;
    }
    if (mode !== "push" && ((remote && !remoteUnchanged) || (base && base.userId !== userId) || (!remote && base))) {
      backup(userId, local, remote);
      throw new SyncConflict();
    }
    if (mode === "push") backup(userId, local, remote);
    // An existing row is only replaced if it is still the exact revision we just read.
    const query = remote
      ? client.from("tft_workspaces").update({ payload: local }).eq("user_id", userId).eq("updated_at", remote.updated_at)
      : client.from("tft_workspaces").insert({ user_id: userId, payload: local });
    const { data, error } = await query.select("payload,updated_at").maybeSingle();
    if (error?.code === "23505" || (!error && !data)) {
      backup(userId, local, await loadCloudWorkspace(client, userId));
      throw new SyncConflict();
    }
    if (error) throw error;
    const record = data as CloudRecord;
    remember(userId, record);
    return record;
  });
  queue = operation.catch(() => undefined);
  return operation;
}
