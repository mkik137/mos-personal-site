import type { Metadata, Viewport } from "next";
import "../src/shared/styles/globals.css";

export const metadata: Metadata = {
  title: "MOS 개인 사이트",
  description: "WASD로 걸어다니며 NPC·건물에 다가가면 콘텐츠가 열리는 탐험형 포트폴리오.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
