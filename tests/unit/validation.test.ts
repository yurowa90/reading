import { describe, expect, it } from "vitest";
import { signUpSchema, loginSchema } from "@/lib/validation/auth";
import { joinClassSchema, createClassSchema, JOIN_CODE_REGEX } from "@/lib/validation/class";
import { createBookSchema } from "@/lib/validation/book";
import { sentenceCardSchema } from "@/lib/validation/sentence";

describe("signUpSchema", () => {
  it("정상 입력을 통과시킨다", () => {
    const r = signUpSchema.safeParse({
      displayName: "책읽는곰",
      email: "a@b.com",
      password: "password123",
      passwordConfirm: "password123",
    });
    expect(r.success).toBe(true);
  });

  it("비밀번호 불일치를 잡아낸다", () => {
    const r = signUpSchema.safeParse({
      displayName: "곰",
      email: "a@b.com",
      password: "password123",
      passwordConfirm: "different1",
    });
    expect(r.success).toBe(false);
  });

  it("짧은 비밀번호를 거부한다", () => {
    const r = signUpSchema.safeParse({
      displayName: "곰돌",
      email: "a@b.com",
      password: "123",
      passwordConfirm: "123",
    });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("잘못된 이메일을 거부한다", () => {
    expect(loginSchema.safeParse({ email: "not-email", password: "x" }).success).toBe(false);
  });
});

describe("참여 코드 형식", () => {
  it("혼동 문자를 제외한 8자리를 허용한다", () => {
    expect(JOIN_CODE_REGEX.test("ABCDEFGH")).toBe(true);
    expect(JOIN_CODE_REGEX.test("23456789")).toBe(true);
  });

  it("혼동 문자(0,O,1,I,L)와 길이 오류를 거부한다", () => {
    expect(JOIN_CODE_REGEX.test("ABCDEFG0")).toBe(false);
    expect(JOIN_CODE_REGEX.test("ABCDEFGI")).toBe(false);
    expect(JOIN_CODE_REGEX.test("ABCDEFG")).toBe(false);
  });

  it("소문자 입력을 대문자로 정규화한다", () => {
    const r = joinClassSchema.safeParse({ joinCode: "abcdefgh" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.joinCode).toBe("ABCDEFGH");
  });
});

describe("createClassSchema", () => {
  it("짧은 학급명을 거부한다", () => {
    expect(createClassSchema.safeParse({ name: "가" }).success).toBe(false);
  });
});

describe("createBookSchema", () => {
  it("제목만으로 통과한다", () => {
    expect(createBookSchema.safeParse({ title: "데미안" }).success).toBe(true);
  });

  it("잘못된 표지 URL 을 거부한다", () => {
    const r = createBookSchema.safeParse({ title: "데미안", coverUrl: "not a url" });
    expect(r.success).toBe(false);
  });
});

describe("sentenceCardSchema", () => {
  const base = {
    bookId: "11111111-1111-1111-1111-111111111111",
    quote: "인상 깊은 문장",
    reason: "이유",
    interpretation: "해석",
    tags: ["책임", "선택"],
  };

  it("필수 항목이 있으면 통과한다", () => {
    expect(sentenceCardSchema.safeParse(base).success).toBe(true);
  });

  it("quote/reason/interpretation 이 비면 거부한다", () => {
    expect(sentenceCardSchema.safeParse({ ...base, quote: "" }).success).toBe(false);
    expect(sentenceCardSchema.safeParse({ ...base, reason: "" }).success).toBe(false);
    expect(sentenceCardSchema.safeParse({ ...base, interpretation: "" }).success).toBe(false);
  });

  it("bookId 가 uuid 가 아니면 거부한다", () => {
    expect(sentenceCardSchema.safeParse({ ...base, bookId: "abc" }).success).toBe(false);
  });
});
