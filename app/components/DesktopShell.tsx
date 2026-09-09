"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";
import { useLocale } from "./LocaleProvider";
import styles from "./desktop-shell.module.css";

type NavItem = { href: string; zh: string; en: string; glyph: string };

const metaNav: NavItem[] = [
  { href: "/", zh: "概览", en: "Overview", glyph: "⌂" },
  { href: "/comps", zh: "阵容", en: "Comps", glyph: "◆" },
  { href: "/champions", zh: "英雄", en: "Champions", glyph: "♟" },
  { href: "/items", zh: "装备", en: "Items", glyph: "◈" },
  { href: "/traits", zh: "羁绊", en: "Traits", glyph: "✦" },
  { href: "/augments", zh: "强化", en: "Augments", glyph: "✧" },
];

const toolNav: NavItem[] = [
  { href: "/builder", zh: "阵容编辑器", en: "Team Builder", glyph: "+" },
  { href: "/stats", zh: "属性计算器", en: "Stat Calculator", glyph: "Σ" },
  { href: "/import", zh: "一图流导入", en: "Image Import", glyph: "▧" },
  { href: "/account", zh: "云同步", en: "Cloud Sync", glyph: "☁" },
  { href: "/sources", zh: "来源同步", en: "Sources", glyph: "↻" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const { locale } = useLocale();
  return items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className={isActive(pathname, item.href) ? styles.active : ""}
    >
      <span className={styles.glyph}>{item.glyph}</span>
      <span>{locale === "zh" ? item.zh : item.en}</span>
    </Link>
  ));
}

export default function DesktopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, toggleLocale, tr } = useLocale();
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

        <div className={styles.sectionLabel}>{tr("版本资料", "META TRENDS")}</div>
        <nav className={styles.nav} aria-label="TFT navigation">
          <NavLinks items={metaNav} pathname={pathname} />
        </nav>

        <div className={styles.sectionLabel}>{tr("工具", "TOOLS")}</div>
        <nav className={styles.nav} aria-label="TFT tools">
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
              placeholder={tr("搜索英雄、装备、羁绊、强化或阵容", "Search champions, items, traits, augments or comps")}
              aria-label={tr("全局搜索", "Global search")}
            />
            <kbd>Enter</kbd>
          </form>

          <div className={styles.topActions}>
            <button className={styles.language} onClick={toggleLocale} title={tr("切换到英文", "Switch to Chinese")}>{locale === "zh" ? "中 / EN" : "EN / 中"}</button>
            <span className={styles.pill}>NA</span>
            <span className={styles.patch}>Patch 18.1</span>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
