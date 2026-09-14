import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme.css";
import "./polish.css";
import CloudSyncAgent from "./components/CloudSyncAgent";
import DesktopShell from "./components/DesktopShell";
import { LocaleProvider } from "./components/LocaleProvider";

export const metadata: Metadata = {
  title: "TFT CN Companion",
  description: "美服云顶之弈中文副屏助手 / NA Teamfight Tactics companion",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/tft-companion.svg",
    apple: "/tft-companion.svg",
  },
  appleWebApp: {
    capable: true,
    title: "TFT Companion",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0f14",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <LocaleProvider>
          <CloudSyncAgent />
          <DesktopShell>{children}</DesktopShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
