import type { Metadata } from "next";
import "./globals.css";
import DesktopShell from "./components/DesktopShell";
import { LocaleProvider } from "./components/LocaleProvider";

export const metadata: Metadata = {
  title: "TFT CN Companion",
  description: "美服云顶之弈中文副屏助手 / NA Teamfight Tactics companion",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <LocaleProvider>
          <DesktopShell>{children}</DesktopShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
