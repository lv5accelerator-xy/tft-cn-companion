"use client";

import { useEffect, useRef, useState } from "react";
import { DESKTOP_LAST_ROUTE_KEY, isRestorableRoute } from "@/lib/desktop-companion";
import { useLocale } from "./LocaleProvider";
import styles from "./app-experience.module.css";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function AppExperience({ pathname }: { pathname: string }) {
  const { tr } = useLocale();
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const refreshForUpdate = useRef(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const current = `${window.location.pathname}${window.location.search}`;
    if (!isRestorableRoute(current)) return;
    try {
      window.localStorage.setItem(DESKTOP_LAST_ROUTE_KEY, current);
    } catch {
      // Route restore is optional when storage is unavailable.
    }
  }, [pathname]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let disposed = false;

    const inspectWaiting = () => {
      if (!disposed && registration?.waiting) setUpdateReady(true);
    };

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((value) => {
      if (disposed) return;
      registration = value;
      inspectWaiting();
      registration.addEventListener("updatefound", () => {
        const worker = registration?.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
        });
      });
    }).catch(() => {
      // The web app remains fully usable when service workers are unavailable.
    });

    const onControllerChange = () => {
      if (!refreshForUpdate.current) return;
      refreshForUpdate.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    if (online) return;
    const onOfflineLink = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      window.location.assign(url.href);
    };
    document.addEventListener("click", onOfflineLink, true);
    return () => document.removeEventListener("click", onOfflineLink, true);
  }, [online]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function applyUpdate() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration("/").then((registration) => {
      if (!registration?.waiting) {
        window.location.reload();
        return;
      }
      refreshForUpdate.current = true;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    });
  }

  return (
    <div className={styles.experience}>
      {updateReady ? <button className={styles.update} onClick={applyUpdate}>{tr("更新可用", "Update ready")}</button> : null}
      {installPrompt && !standalone ? <button className={styles.install} onClick={installApp}>{tr("安装桌面版", "Install app")}</button> : null}
      <span className={`${styles.status} ${online ? styles.online : styles.offline}`} title={online ? tr("在线，后台会刷新最新数据", "Online; data refreshes in the background") : tr("离线，正在使用已缓存数据", "Offline; using cached data")}>
        {online ? "●" : "○"} {online ? tr("在线", "Online") : tr("离线 · 缓存", "Offline · Cached")}
      </span>
    </div>
  );
}
