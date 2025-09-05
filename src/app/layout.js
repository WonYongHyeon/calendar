import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata = {
  title: "해블린 일정표",
  description: "해블린 월간 일정표",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ 여기에 폰트 링크를 추가합니다. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poor+Story&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
