import type { Metadata } from "next";
import "./globals.css";
import DesktopShell from "./components/DesktopShell";

export const metadata: Metadata = {
  title: "TFT CN Companion",
  description: "美服云顶之弈中文副屏助手",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <DesktopShell>{children}</DesktopShell>
      </body>
    </html>
  );
}
