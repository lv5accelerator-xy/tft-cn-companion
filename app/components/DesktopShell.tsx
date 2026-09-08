"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";
import styles from "./desktop-shell.module.css";

const metaNav = [
  { href: "/", label: "概览", glyph: "⌂" },
  { href: "/comps", label: "阵容", glyph: "◆" },
  { href: "/champions", label: "英雄", glyph: "♟" },
  { href: "/items", label: "装备", glyph: "◈" },
  { href: "/traits", label: "羁绊", glyph: "✦" },
  { href: "/augments", label: "强化", glyph: "✧" },
];

const toolNav = [
  { href: "/builder", label: "阵容编辑器", glyph: "+" },
  { href: "/import", label: "一图流导入", glyph: "▧" },
  { href: "/sources", label: "来源同步", glyph: "↻" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ items, pathname }: { items: typeof metaNav; pathname: string }) {
  return items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className={isActive(pathname, item.href) ? styles.active : ""}
    >
      <span className={styles.glyph}>{item.glyph}</span>
      <span>{item.label}</span>
    </Link>
  ));
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
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.gameHeader} aria-label="TFT CN Companion home">
          <div className={styles.gameIcon}>TFT</div>
          <div>
            <strong>Teamfight Tactics</strong>
            <span>Set 18 · NA</span>
          </div>
        </Link>

        <div className={styles.sectionLabel}>META TRENDS</div>
        <nav className={styles.nav} aria-label="TFT 导航">
          <NavLinks items={metaNav} pathname={pathname} />
        </nav>

        <div className={styles.sectionLabel}>TOOLS</div>
        <nav className={styles.nav} aria-label="TFT 工具">
          <NavLinks items={toolNav} pathname={pathname} />
        </nav>

        <Link href="/sources" className={styles.sidebarFoot}>
          <span className={styles.dot} />
          <div>
            <strong>Live sources</strong>
            <span>Riot + Meta feeds</span>
          </div>
        </Link>
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
