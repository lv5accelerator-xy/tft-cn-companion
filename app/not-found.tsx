import Link from "next/link";
import styles from "./recovery.module.css";

export default function NotFound() {
  return (
    <section className={styles.shell}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>404 · NOT FOUND</span>
        <h1>这个页面不存在</h1>
        <p>可能是旧链接、缓存中的旧路径，或者页面名称已经调整。你的本地阵容和复盘数据不会受到影响。</p>
        <div className={styles.actions}>
          <Link href="/">返回首页</Link>
          <Link href="/focus">继续对局模式</Link>
        </div>
      </div>
    </section>
  );
}
