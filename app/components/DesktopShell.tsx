"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";
import styles from "./desktop-shell.module.css";

const nav = [
  { href: "/", label: "概览", glyph: "⌂" },
  { href: "/comps", label: "阵容", glyph: "◆" },
  { href: "/champions", label: "英雄", glyph: "♟" },
  { href: "/items", label: "装备", glyph: "◈" },
  { href: "/traits", label: "羁绊", glyph: "✦" },
  { href: "/augments", label: "强化", glyph: "✧" },
  { href: "/builder", label: "阵容编辑器", glyph: "+" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DesktopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <div className={styles.app}>
      <aside className={styles.rail}>
        <Link href="/" className={styles.logo} aria-label="TFT CN Companion">T</Link>
        <div className={styles.railSpacer} />
        <span className={styles.railBadge}>NA</span>
      </aside>

      <aside className={styles.sidebar}>
        <div className={styles.gameHeader}>
          <div className={styles.gameIcon}>TFT</div>
          <div>
            <strong>Teamfight Tactics</strong>
            <span>Set 18 · NA</span>
          </div>
        </div>

        <div className={styles.sectionLabel}>META TRENDS</div>
        <nav className={styles.nav} aria-label="TFT 导航">
          {nav.slice(0, 6).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? styles.active : ""}
            >
              <span className={styles.glyph}>{item.glyph}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sectionLabel}>TOOLS</div>
        <nav className={styles.nav} aria-label="TFT 工具">
          {nav.slice(6).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? styles.active : ""}
            >
              <span className={styles.glyph}>{item.glyph}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          <span className={styles.dot} />
          <div>
            <strong>Live data ready</strong>
            <span>Riot + CommunityDragon</span>
          </div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <form onSubmit={submitSearch} className={styles.searchForm}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索英雄、装备、羁绊、强化或阵容"
              aria-label="全局搜索"
            />
            <kbd>Enter</kbd>
          </form>

          <div className={styles.topActions}>
            <span className={styles.pill}>NA</span>
            <span className={styles.patch}>Patch 18.1</span>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
