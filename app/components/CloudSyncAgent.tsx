"use client";

import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  AUTO_SYNC_KEY,
  WORKSPACE_EVENT,
  readWorkspaceSnapshot,
  writeWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "@/lib/workspace";

export const CLOUD_SYNC_EVENT = "tft-cloud-sync-status";

type CloudRecord = {
  payload: WorkspaceSnapshot;
  updated_at: string;
};

function emit(state: "idle" | "syncing" | "success" | "error", message = "") {
  window.dispatchEvent(new CustomEvent(CLOUD_SYNC_EVENT, { detail: { state, message, at: Date.now() } }));
}

function autoSyncEnabled() {
  try {
    return window.localStorage.getItem(AUTO_SYNC_KEY) === "1";
  } catch {
    return false;
  }
}

export default function CloudSyncAgent() {
  const userRef = useRef<User | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;

    async function reconcile(user: User) {
      if (!autoSyncEnabled()) return;
      emit("syncing", "reconcile");
      try {
        const local = readWorkspaceSnapshot();
        const { data, error } = await supabase
          .from("tft_workspaces")
          .select("payload,updated_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        const remote = data as CloudRecord | null;
        const remoteSavedAt = Number(remote?.payload?.savedAt || 0);
        const localSavedAt = Number(local.savedAt || 0);

        if (remote?.payload && remoteSavedAt > localSavedAt) {
          applyingRemoteRef.current = true;
          writeWorkspaceSnapshot(remote.payload);
          window.setTimeout(() => { applyingRemoteRef.current = false; }, 0);
          emit("success", "pulled");
          return;
        }

        const payload: WorkspaceSnapshot = { ...local, savedAt: Date.now() };
        const { error: upsertError } = await supabase
          .from("tft_workspaces")
          .upsert({ user_id: user.id, payload }, { onConflict: "user_id" });
        if (upsertError) throw upsertError;
        emit("success", "pushed");
      } catch (error) {
        emit("error", error instanceof Error ? error.message : "cloud-sync-failed");
      }
    }

    async function pushCurrent() {
      const user = userRef.current;
      if (!user || !autoSyncEnabled() || applyingRemoteRef.current) return;
      emit("syncing", "push");
      try {
        const snapshot = readWorkspaceSnapshot();
        const payload: WorkspaceSnapshot = { ...snapshot, savedAt: Date.now() };
        const { error } = await supabase
          .from("tft_workspaces")
          .upsert({ user_id: user.id, payload }, { onConflict: "user_id" });
        if (error) throw error;
        emit("success", "pushed");
      } catch (error) {
        emit("error", error instanceof Error ? error.message : "cloud-sync-failed");
      }
    }

    const onWorkspace = () => {
      if (!userRef.current || !autoSyncEnabled() || applyingRemoteRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void pushCurrent(), 1200);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTO_SYNC_KEY && event.newValue === "1" && userRef.current) {
        void reconcile(userRef.current);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      userRef.current = data.user ?? null;
      if (data.user) void reconcile(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      userRef.current = session?.user ?? null;
      if (session?.user) void reconcile(session.user);
    });

    window.addEventListener(WORKSPACE_EVENT, onWorkspace);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      authListener.subscription.unsubscribe();
      window.removeEventListener(WORKSPACE_EVENT, onWorkspace);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
