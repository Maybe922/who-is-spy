import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "谁是卧底",
  description: "多人联机谁是卧底聚会游戏"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
