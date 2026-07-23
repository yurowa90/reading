import { test, expect } from "@playwright/test";

/**
 * Phase 1 핵심 흐름 E2E 스켈레톤.
 *
 * 실제 실행에는 로컬 Supabase 인스턴스와 테스트 계정이 필요하다.
 * 환경이 준비되지 않으면 이 스펙은 건너뛴다(docs/TEST_PLAN.md 참고).
 *
 * 학생 흐름: 회원가입 → 로그인 → 학급 참여 → 도서 확인 → 문장 작성 → 수정 → 삭제
 * 교사 흐름: 로그인 → 학급 생성 → 도서 등록 → 학생 문장 목록 확인
 */
const READY = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

test.describe("Phase 1 흐름", () => {
  test.skip(!READY, "Supabase 환경 변수가 없어 E2E 를 건너뜁니다 (docs/TEST_PLAN.md).");

  test("랜딩 페이지가 로그인/회원가입으로 안내한다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "책갈피" })).toBeVisible();
    await expect(page.getByRole("link", { name: "시작하기" })).toBeVisible();
  });

  // TODO(env): 로컬 Supabase 준비 후 아래 시나리오를 구현한다.
  //  Phase 1:
  //   - 회원가입 폼 제출 → 이메일 인증 우회(로컬 설정) → 로그인
  //   - 참여 코드 입력 → 학급 대시보드 진입
  //   - 문장 카드 작성/수정/삭제 왕복
  //   - 교사 계정으로 학급 생성 → 참여 코드 확인 → 도서 등록
  //  Phase 2:
  //   - 서평(구조화/자유) 임시저장 → 제출
  //   - 북포스터 업로드 → 제출
  //   - 교사 검토 큐에서 게시 승인 → 갤러리 노출 확인
  //   - 미승인 작품이 다른 학생에게 보이지 않음(가시성) 확인
});
