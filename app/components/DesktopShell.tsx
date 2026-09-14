"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
import QuickSearch from "./QuickSearch";
import ShortcutHelp from "./ShortcutHelp";
import FocusPlanTrail from "./FocusPlanTrail";
import AppExperience from "./AppExperience";
import DensityControl from "./DensityControl";
import ReviewPulse from "./ReviewPulse";
import styles from "./desktop-shell.module.css";

type NavItem = { href: string; zh: string; en: string; glyph: string };

const coreNav: NavItem[] = [
  { href: "/", zh: "首页", en: "Home", glyph: "⌂" },
  { href: "/opening", zh: "开局助手", en: "Opening", glyph: "◇" },
  { href: "/coach", zh: "智能指导", en: "Smart Guidance", glyph: "✦" },
  { href: "/compare", zh: "候选对比", en: "Compare", glyph: "⇄" },
  { href: "/focus", zh: "对局模式", en: "Game Focus", glyph: "◉" },
  { href: "/review", zh: "赛后复盘", en: "Review", glyph: "◎" },
  { href: "/insights", zh: "个人洞察", en: "Insights", glyph: "↗" },
];

const metaNav: NavItem[] = [
  { href: "/comps", zh: "阵容", en: "Comps", glyph: "◆" },
  { href: "/champions", zh: "英雄", en: "Champions", glyph: "♟" },
  { href: "/items", zh: "装备", en: "Items", glyph: "◈" },
  { href: "/traits", zh: "羁绊", en: "Traits", glyph: "✦" },
  { href: "/augments", zh: "强化", en: "Augments", glyph: "✧" },
];

const toolNav: NavItem[] = [
  { href: "/builder", zh: "阵容编辑器", en: "Builder", glyph: "+" },
  { href: "/stats", zh: "属性实验室", en: "Stat Lab", glyph: "Σ" },
  { href: "/import", zh: "一图流导入", en: "Image Import", glyph: "▧" },
  { href: "/share", zh: "分享中心", en: "Share", glyph: "↗" },
  { href: "/account", zh: "云同步", en: "Cloud Sync", glyph: "☁" },
];

const SIDEBAR_KEY = "tft-cn-companion-sidebar-collapsed-v1";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const { locale } = useLocale();
  return items.map((item) => (
    <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? styles.active : ""} title={locale === "zh" ? item.zh : item.en}>
      <span className={styles.glyph}>{item.glyph}</span>
      <span className={styles.navLabel}>{locale === "zh" ? item.zh : item.en}</span>
    </Link>
  ));
}

export default function DesktopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { locale, toggleLocale, tr } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const route = pathname.split("/").filter(Boolean)[0] || "home";

  useEffect(() => {
    const autoCompact = window.innerWidth <= 1440 && window.innerHeight <= 900;
    try {
      const saved = window.localStorage.getItem(SIDEBAR_KEY);
      if (saved === "1" || saved === "0") setCollapsed(saved === "1");
      else setCollapsed(autoCompact);
    } catch {
      setCollapsed(autoCompact);
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      try { window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  return (
    <div className={`${styles.app} ${collapsed ? styles.collapsed : ""}`} data-ui-shell data-ui-route={route}>
      <aside className={styles.sidebar} data-ui-sidebar>
        <div className={styles.brandRow}>
          <Link href="/" className={styles.gameHeader} aria-label="TFT CN Companion home">
            <div className={styles.gameIcon}>TFT</div>
            <div className={styles.brandText}><strong>TFT CN Companion</strong><span>SET 18 · NA</span></div>
          </Link>
          <button className={styles.collapseButton} onClick={toggleSidebar} title={collapsed ? tr("展开侧栏", "Expand sidebar") : tr("收起侧栏", "Collapse sidebar")} aria-label={collapsed ? tr("展开侧栏", "Expand sidebar") : tr("收起侧栏", "Collapse sidebar")}>{collapsed ? "›" : "‹"}</button>
        </div>

        <div className={styles.sectionLabel}>{tr("核心流程", "CORE")}</div>
        <nav className={styles.nav} aria-label="TFT core workflow"><NavLinks items={coreNav} pathname={pathname} /></nav>
        <div className={styles.sectionLabel}>{tr("版本资料", "META")}</div>
        <nav className={styles.nav} aria-label="TFT reference"><NavLinks items={metaNav} pathname={pathname} /></nav>
        <div className={styles.sectionLabel}>{tr("工具", "TOOLS")}</div>
        <nav className={styles.nav} aria-label="TFT tools"><NavLinks items={toolNav} pathname={pathname} /></nav>

        <Link href="/sources" className={styles.sidebarFoot} title={tr("数据来源状态", "Source status")}>
          <span className={styles.dot} />
          <div><strong>{tr("数据源在线", "Sources online")}</strong><span>Riot · Meta feeds</span></div>
        </Link>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar} data-ui-topbar>
          <QuickSearch />
          <FocusPlanTrail pathname={pathname} />
          <div className={styles.topActions}>
            <AppExperience pathname={pathname} />
            <DensityControl />
            <ShortcutHelp pathname={pathname} />
            <button className={styles.language} onClick={toggleLocale} title={tr("切换到英文", "Switch to Chinese")}>{locale === "zh" ? "中 / EN" : "EN / 中"}</button>
            <span className={styles.region} data-ui-tip={tr("北美服务器", "North America server")}>NA</span>
            <span className={styles.patch} data-ui-tip={tr("当前资料版本 Patch 18.1", "Current data patch 18.1")}>18.1</span>
            <span className={styles.version} data-ui-tip={tr("智能指导与个人洞察版本", "Smart Guidance & Personal Intelligence")}>V1.6</span>
          </div>
        </header>
        <main className={styles.content} data-ui-content>
          {route === "review" ? <ReviewPulse /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
