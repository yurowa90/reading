import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 교육 서비스 톤: 차분한 녹색 계열 + 중립 배경
        brand: {
          DEFAULT: "#3a5a40",
          soft: "#dfe7df",
          ink: "#23211c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
