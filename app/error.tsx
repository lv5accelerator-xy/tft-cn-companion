"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./recovery.module.css";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("TFT Companion route error", error);
  }, [error]);

  return (
    <section className={styles.shell} role="alert">
      <div className={styles.card}>
        <span className={styles.eyebrow}>RECOVERY MODE</span>
        <h1>页面暂时出了点问题</h1>
        <p>你的本地候选、Focus、Builder 和复盘数据不会因为这个页面错误被清空。可以先重试；如果仍然失败，返回首页继续使用其他功能。</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => reset()}>重新加载此页面</button>
          <Link href="/">返回首页</Link>
        </div>
        {error.digest ? <code className={styles.digest}>Error ID: {error.digest}</code> : null}
      </div>
    </section>
  );
}
