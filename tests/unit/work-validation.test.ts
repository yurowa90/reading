import { describe, expect, it } from "vitest";
import {
  reviewDraftSchema,
  validateReviewForSubmit,
  posterMetaSchema,
} from "@/lib/validation/work";

const BOOK = "11111111-1111-1111-1111-111111111111";

describe("reviewDraftSchema", () => {
  it("빈 내용의 draft 도 허용한다(임시 저장)", () => {
    const r = reviewDraftSchema.safeParse({ bookId: BOOK, mode: "free" });
    expect(r.success).toBe(true);
  });

  it("잘못된 bookId 를 거부한다", () => {
    expect(reviewDraftSchema.safeParse({ bookId: "x", mode: "free" }).success).toBe(false);
  });
});

describe("validateReviewForSubmit — 자유 모드", () => {
  it("제목·본문이 없으면 제출 불가", () => {
    const errors = validateReviewForSubmit({ bookId: BOOK, mode: "free", title: "", body: "" });
    expect(errors.title).toBeDefined();
    expect(errors.body).toBeDefined();
  });

  it("제목·본문이 충분하면 통과", () => {
    const errors = validateReviewForSubmit({
      bookId: BOOK,
      mode: "free",
      title: "나의 서평",
      body: "충분히 긴 본문입니다.",
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe("validateReviewForSubmit — 구조화 모드", () => {
  const full = {
    one_line: "한 문장",
    key_problem: "문제",
    impressive_sentence: "문장",
    author_judgment: "판단",
    disagreement: "",
    connection: "",
    final_evaluation: "평가",
  };

  it("필수 5개 섹션이 채워지면 통과(선택 항목 비어도 됨)", () => {
    const errors = validateReviewForSubmit({
      bookId: BOOK,
      mode: "structured",
      title: "",
      body: "",
      sections: full,
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("필수 섹션이 비면 해당 키로 오류를 낸다", () => {
    const errors = validateReviewForSubmit({
      bookId: BOOK,
      mode: "structured",
      title: "",
      body: "",
      sections: { ...full, one_line: "" },
    });
    expect(errors["sections.one_line"]).toBeDefined();
  });

  it("sections 자체가 없으면 필수 항목 오류", () => {
    const errors = validateReviewForSubmit({ bookId: BOOK, mode: "structured", title: "", body: "" });
    expect(errors["sections.key_problem"]).toBeDefined();
  });
});

describe("posterMetaSchema", () => {
  it("도서만으로 통과, 잘못된 도서는 거부", () => {
    expect(posterMetaSchema.safeParse({ bookId: BOOK }).success).toBe(true);
    expect(posterMetaSchema.safeParse({ bookId: "x" }).success).toBe(false);
  });
});
