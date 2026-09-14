"use client";

import { useEffect } from "react";
import styles from "./recovery.module.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("TFT Companion global error", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className={styles.globalBody}>
        <main className={styles.shell} role="alert">
          <div className={styles.card}>
            <span className={styles.eyebrow}>SAFE RECOVERY</span>
            <h1>TFT Companion 需要重新恢复</h1>
            <p>应用外壳发生异常。你的本地工作区不会在这里主动删除；先尝试恢复应用，仍有问题时再返回首页。</p>
            <div className={styles.actions}>
              <button type="button" onClick={() => reset()}>恢复应用</button>
              <a href="/">返回首页</a>
            </div>
            {error.digest ? <code className={styles.digest}>Error ID: {error.digest}</code> : null}
          </div>
        </main>
      </body>
    </html>
  );
}
