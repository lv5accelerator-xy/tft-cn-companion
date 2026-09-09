"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useLocale } from "./LocaleProvider";
import QuickSearch from "./QuickSearch";
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
  { href: "/focus", zh: "对局模式", en: "Game Focus", glyph: "◉" },
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
  const { locale, toggleLocale, tr } = useLocale();

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
          <QuickSearch />
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
