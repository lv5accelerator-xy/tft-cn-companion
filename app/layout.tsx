import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TFT CN Companion",
  description: "美服云顶之弈中文副屏助手",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
