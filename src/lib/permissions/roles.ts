import type { UserRole } from "@/types/database";

/**
 * 애플리케이션 계층의 역할 판정 유틸리티.
 *
 * 주의: 이 함수들은 UI 표시/분기 편의를 위한 것이며 보안 경계가 아니다.
 * 실제 접근 통제는 데이터베이스 RLS 정책이 담당한다(docs/SECURITY.md 참고).
 */
export function isTeacher(role: UserRole | null | undefined): boolean {
  return role === "teacher" || role === "admin";
}

export function isStudent(role: UserRole | null | undefined): boolean {
  return role === "student";
}

/** 신규 가입자의 기본 역할. 회원가입 화면에서 절대 override 하지 않는다. */
export const DEFAULT_ROLE: UserRole = "student";
