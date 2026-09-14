"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import styles from "./review-maintenance-bar.module.css";

export default function ReviewMaintenanceBar() {
  const pathname = usePathname();
  const { tr } = useLocale();
  const links = [
    { href: "/review", zh: "记录本局", en: "New review" },
    { href: "/review/history", zh: "管理历史", en: "Manage history" },
    { href: "/insights", zh: "个人趋势", en: "Insights" },
    { href: "/share", zh: "分享复盘", en: "Share" },
  ];
  return <nav className={styles.bar} aria-label={tr("复盘工具", "Review tools")}>{links.map((link) => <Link key={link.href} href={link.href} className={pathname === link.href ? styles.active : ""}>{tr(link.zh, link.en)}</Link>)}</nav>;
}
