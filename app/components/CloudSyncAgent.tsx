"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { AUTO_SYNC_KEY, WORKSPACE_EVENT, readWorkspaceSnapshot, type WorkspaceSnapshot } from "@/lib/workspace";

export const CLOUD_SYNC_EVENT = "tft-cloud-sync-status";

function emit(state: "syncing" | "success" | "error", message = "") {
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
  const userIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const maybeClient = getSupabaseBrowserClient();
    if (maybeClient === null) return undefined;
    const client = maybeClient;
    let disposed = false;

    async function pushCurrent() {
      const userId = userIdRef.current;
      if (!userId || !autoSyncEnabled()) return;
      emit("syncing", "push");
      try {
        const snapshot = readWorkspaceSnapshot();
        const payload: WorkspaceSnapshot = { ...snapshot, savedAt: Date.now() };
        const { error } = await client
          .from("tft_workspaces")
          .upsert({ user_id: userId, payload }, { onConflict: "user_id" });
        if (error) throw error;
        if (!disposed) emit("success", "pushed");
      } catch (error) {
        if (!disposed) emit("error", error instanceof Error ? error.message : "cloud-sync-failed");
      }
    }

    function schedulePush() {
      if (!userIdRef.current || !autoSyncEnabled()) return;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void pushCurrent(), 1200);
    }

    void client.auth.getUser().then(({ data }) => {
      if (!disposed) userIdRef.current = data.user?.id ?? null;
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });

    window.addEventListener(WORKSPACE_EVENT, schedulePush);
    return () => {
      disposed = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      authListener.subscription.unsubscribe();
      window.removeEventListener(WORKSPACE_EVENT, schedulePush);
    };
  }, []);

  return null;
}
