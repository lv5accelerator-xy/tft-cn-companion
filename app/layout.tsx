import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme.css";
import "./polish.css";
import "./v16.css";
import "./maintenance.css";
import "./command-ui.css";
import CloudSyncAgent from "./components/CloudSyncAgent";
import DesktopShell from "./components/DesktopShell";
import ToastHost from "./components/ToastHost";
import { LocaleProvider } from "./components/LocaleProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://tft-cn-companion-web.vercel.app"),
  title: { default: "TFT CN Companion", template: "%s | TFT CN Companion" },
  description: "美服云顶之弈中文副屏助手：开局资源匹配、候选对比、Stage 战术棋盘、赛后复盘与个人趋势。",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/tft-companion.svg", apple: "/tft-companion.svg" },
  openGraph: {
    title: "TFT CN Companion — 陪你打一整局的美服 TFT 中文副屏助手",
    description: "Opening → Compare → Focus → Review → Insights。为使用 NA 英文客户端的中文玩家设计。",
    url: "https://tft-cn-companion-web.vercel.app/",
    siteName: "TFT CN Companion",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TFT CN Companion" }],
  },
  twitter: { card: "summary_large_image", title: "TFT CN Companion", description: "NA TFT 中文副屏助手：从开局决策到赛后个人复盘。", images: ["/opengraph-image"] },
  appleWebApp: { capable: true, title: "TFT Companion", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#080b12" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><LocaleProvider><CloudSyncAgent /><DesktopShell>{children}</DesktopShell><ToastHost /></LocaleProvider></body></html>;
}
