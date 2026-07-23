import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "책갈피 · 독서교육",
    template: "%s · 책갈피",
  },
  description:
    "학생의 독서 과정과 사고의 변화를 기록하는 학급 독서교육 웹앱. 문장 수집부터 서평, 상호 피드백까지.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
