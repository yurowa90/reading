import { describe, expect, it } from "vitest";
import { isTeacher, isStudent, DEFAULT_ROLE } from "@/lib/permissions/roles";

describe("역할 판정 유틸리티", () => {
  it("teacher/admin 은 교사 권한으로 본다", () => {
    expect(isTeacher("teacher")).toBe(true);
    expect(isTeacher("admin")).toBe(true);
  });

  it("student 는 교사가 아니다", () => {
    expect(isTeacher("student")).toBe(false);
    expect(isTeacher(null)).toBe(false);
    expect(isTeacher(undefined)).toBe(false);
  });

  it("student 판정", () => {
    expect(isStudent("student")).toBe(true);
    expect(isStudent("teacher")).toBe(false);
  });

  it("신규 가입 기본 역할은 student 다", () => {
    expect(DEFAULT_ROLE).toBe("student");
  });
});
