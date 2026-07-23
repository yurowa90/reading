import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 1 E2E 설정.
 * 실제 실행에는 로컬 Supabase 인스턴스와 환경 변수가 필요하다(docs/TEST_PLAN.md 참고).
 * 환경이 준비되지 않으면 test:e2e는 실행하지 않는다.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
