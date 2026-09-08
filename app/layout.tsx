import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import navStyles from "./nav.module.css";

export const metadata: Metadata = {
  title: "TFT CN Companion",
  description: "美服云顶之弈中文副屏助手",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <nav className={navStyles.nav} aria-label="主导航">
          <Link className={navStyles.brand} href="/">TFT CN Companion</Link>
          <Link href="/">资料助手</Link>
          <Link href="/comps">当前阵容库</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
