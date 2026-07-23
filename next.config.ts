import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 도서 표지 이미지 URL은 임의의 외부 호스트일 수 있으므로 Phase 1에서는
  // next/image 최적화 대신 일반 <img>로 처리한다(원격 호스트 허용 목록 관리 회피).
};

export default nextConfig;
