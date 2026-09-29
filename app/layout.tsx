import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "채용 레이더",
  description: "조건에 맞는 새 채용 공고와 마감 일정을 알림과 캘린더로 받아보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
