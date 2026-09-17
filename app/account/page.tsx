"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import {
  AUTO_SYNC_KEY,
  WORKSPACE_EVENT,
  getWorkspaceUpdatedAt,
} from "@/lib/workspace";
import { useLocale } from "../components/LocaleProvider";
import styles from "./account.module.css";

import { loadCloudWorkspace, syncWorkspace, SYNC_BACKUPS_KEY, type CloudRecord } from "@/lib/cloud-sync";
import { CLOUD_SYNC_EVENT } from "../components/CloudSyncAgent";

type SyncState = "idle" | "syncing" | "success" | "error";

function formatTime(value: string | number | null, locale: "zh" | "en") {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AccountPage() {
  const { locale, tr } = useLocale();
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [cloudRecord, setCloudRecord] = useState<CloudRecord | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [localUpdatedAt, setLocalUpdatedAt] = useState(0);

  const refreshLocalTime = useCallback(() => setLocalUpdatedAt(getWorkspaceUpdatedAt()), []);

  const loadCloud = useCallback(async () => {
    if (!supabase || !user) {
      setCloudRecord(null);
      return null;
    }
    const record = await loadCloudWorkspace(supabase, user.id);
    setCloudRecord(record);
    return record;
  }, [supabase, user]);

  const runSync = useCallback(async (mode: "smart" | "push" | "pull") => {
    if (!supabase || !user) return;
    if (mode !== "smart" && !window.confirm(tr("将按所选方向替换工作区，替换前会保留恢复备份。继续？", "Replace the workspace in this direction? A recovery backup will be saved first."))) return;
    setSyncState("syncing");
    try {
      const record = await syncWorkspace(supabase, user.id, mode);
      setCloudRecord(record);
      refreshLocalTime();
      setSyncState("success");
      setSyncMessage(tr("同步完成。", "Workspace synced."));
    } catch (error) {
      setSyncState("error");
      setSyncMessage(error instanceof Error ? error.message : tr("同步失败。", "Sync failed."));
    }
  }, [supabase, user, tr, refreshLocalTime]);

  function exportBackups() {
    const blob = new Blob([window.localStorage.getItem(SYNC_BACKUPS_KEY) || "[]"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tft-workspace-recovery.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    refreshLocalTime();
    try {
      setAutoSync(window.localStorage.getItem(AUTO_SYNC_KEY) === "1");
    } catch {
      setAutoSync(false);
    }
  }, [refreshLocalTime]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setCloudRecord(null);
      return;
    }
    void loadCloud().catch((error) => {
      setSyncState("error");
      setSyncMessage(error instanceof Error ? error.message : tr("读取云端状态失败。", "Failed to read cloud state."));
    });
  }, [loadCloud, tr, user]);

  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ state: SyncState; message: string }>).detail;
      setSyncState(detail.state);
      if (detail.state === "error") setSyncMessage(detail.message);
      if (detail.state === "success") {
        setSyncMessage(tr("已同步到云端。", "Synced to cloud."));
        void loadCloud().catch(() => undefined);
      }
    };
    window.addEventListener(WORKSPACE_EVENT, refreshLocalTime);
    window.addEventListener(CLOUD_SYNC_EVENT, onStatus);
    return () => {
      window.removeEventListener(WORKSPACE_EVENT, refreshLocalTime);
      window.removeEventListener(CLOUD_SYNC_EVENT, onStatus);
    };
  }, [loadCloud, refreshLocalTime, tr]);

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setAuthMessage(tr("正在发送登录链接…", "Sending sign-in link…"));
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setAuthMessage(error ? error.message : tr("登录链接已发送，请检查邮箱并点击链接。", "Sign-in link sent. Check your email and open the link."));
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCloudRecord(null);
    setSyncMessage("");
  }

  function toggleAutoSync() {
    const next = !autoSync;
    setAutoSync(next);
    try {
      window.localStorage.setItem(AUTO_SYNC_KEY, next ? "1" : "0");
    } catch {
      // Keep the current-session toggle.
    }
    if (next) window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT));
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>TFT CN Companion · V1.0</span>
          <h1>{tr("账号与云同步", "Account & Cloud Sync")}</h1>
          <p>{tr("让 Builder、一图流导入阵容和语言偏好在不同设备之间同步。", "Sync Builder, image-imported comps and language preference across devices.")}</p>
        </div>
        <span className={`${styles.status} ${configured ? styles.ready : styles.notReady}`}>{configured ? tr("Supabase 已配置", "Supabase configured") : tr("等待 Supabase 配置", "Supabase setup required")}</span>
      </header>

      {!configured ? (
        <section className={styles.notice}>
          <strong>{tr("云同步代码已经就绪，但部署环境还缺两个公开配置值。", "Cloud sync code is ready, but the deployment still needs two public configuration values.")}</strong>
          <p>NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
          <span>{tr("配置后重新部署一次即可启用登录和跨设备同步；OpenAI 图片识别不受影响。", "Add them and redeploy once to enable sign-in and cross-device sync; image analysis is unaffected.")}</span>
        </section>
      ) : !user ? (
        <section className={styles.authCard}>
          <div>
            <h2>{tr("邮箱登录", "Email sign-in")}</h2>
            <p>{tr("无需密码。我们会发送一次性登录链接。", "No password needed. A one-time sign-in link will be emailed to you.")}</p>
          </div>
          <form onSubmit={submitEmail}>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            <button type="submit">{tr("发送登录链接", "Send sign-in link")}</button>
          </form>
          {authMessage && <div className={styles.message}>{authMessage}</div>}
        </section>
      ) : (
        <>
          <section className={styles.accountBar}>
            <div>
              <span>{tr("已登录", "Signed in")}</span>
              <strong>{user.email}</strong>
            </div>
            <button onClick={signOut}>{tr("退出登录", "Sign out")}</button>
          </section>

          <section className={styles.syncGrid}>
            <article className={styles.syncCard}>
              <span>{tr("本机工作区", "Local workspace")}</span>
              <strong>{formatTime(localUpdatedAt, locale)}</strong>
              <p>{tr("当前浏览器里的 Builder、导入阵容和界面偏好。", "Builder, imported comps and UI preferences in this browser.")}</p>
            </article>
            <article className={styles.syncCard}>
              <span>{tr("云端工作区", "Cloud workspace")}</span>
              <strong>{formatTime(cloudRecord?.updated_at ?? null, locale)}</strong>
              <p>{cloudRecord ? tr("已找到你的云端备份。", "Cloud backup found.") : tr("还没有云端备份。", "No cloud backup yet.")}</p>
            </article>
          </section>

          <section className={styles.controls}>
            <button className={styles.primary} onClick={() => void runSync("smart")} disabled={syncState === "syncing"}>{tr("智能同步", "Smart sync")}</button>
            <button onClick={() => void runSync("push")} disabled={syncState === "syncing"}>{tr("本机 → 云端", "Local → Cloud")}</button>
            <button onClick={() => void runSync("pull")} disabled={syncState === "syncing" || !cloudRecord}>{tr("云端 → 本机", "Cloud → Local")}</button>
            <label className={styles.toggle}>
              <input type="checkbox" checked={autoSync} onChange={toggleAutoSync} />
              <span>{tr("登录期间自动同步本机修改", "Auto-sync local changes while signed in")}</span>
            </label>
          </section>

          <button onClick={exportBackups}>{tr("导出恢复备份", "Export recovery backups")}</button>

          {syncMessage && <div className={`${styles.message} ${syncState === "error" ? styles.error : ""}`}>{syncMessage}</div>}
        </>
      )}

      <section className={styles.security}>
        <h2>{tr("V1.0 同步范围", "V1.0 sync scope")}</h2>
        <div className={styles.scopeGrid}>
          <div><strong>{tr("阵容编辑器", "Team Builder")}</strong><span>{tr("英雄、站位、装备、主C/主坦角色和分享码数据", "Champions, positioning, items, carry/tank roles and share data")}</span></div>
          <div><strong>{tr("一图流阵容库", "Image-imported comps")}</strong><span>{tr("AI 识别后确认保存的 TFT 阵容", "TFT comps saved after AI review")}</span></div>
          <div><strong>{tr("语言偏好", "Language")}</strong><span>{tr("中文 / English 切换状态", "Chinese / English preference")}</span></div>
          <div><strong>{tr("隐私", "Privacy")}</strong><span>{tr("RLS 只允许当前登录账号读取和修改自己的工作区", "Row-level security restricts each workspace to its signed-in owner")}</span></div>
        </div>
      </section>
    </div>
  );
}
