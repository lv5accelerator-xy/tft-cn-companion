"use client";

import { useEffect, useState } from "react";
import styles from "./toast-host.module.css";

export type ToastTone = "info" | "success" | "warning" | "error";
type ToastPayload = { message: string; tone?: ToastTone };
type ToastItem = Required<ToastPayload> & { id: number };

export const TOAST_EVENT = "tft:toast";

export function notifyToast(message: string, tone: ToastTone = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: { message, tone } }));
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let sequence = 0;
    const push = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      if (!detail?.message) return;
      const id = Date.now() + sequence++;
      const item: ToastItem = { id, message: detail.message, tone: detail.tone ?? "info" };
      setToasts((current) => [...current.slice(-2), item]);
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600);
    };
    const syncOnline = () => setOnline(navigator.onLine);
    syncOnline();
    window.addEventListener(TOAST_EVENT, push);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener(TOAST_EVENT, push);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  return (
    <>
      {!online ? <div className={styles.offline} role="status">离线模式 · Offline — 已缓存的 Focus / Review / Builder 仍可继续使用</div> : null}
      <div className={styles.stack} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}><span>{toast.message}</span><button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Close notification">×</button></div>)}
      </div>
    </>
  );
}
