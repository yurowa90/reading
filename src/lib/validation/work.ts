import { z } from "zod";

const sectionText = z.string().trim().max(4000).optional().or(z.literal(""));

export const reviewSectionsSchema = z.object({
  one_line: sectionText,
  key_problem: sectionText,
  impressive_sentence: sectionText,
  author_judgment: sectionText,
  disagreement: sectionText,
  connection: sectionText,
  final_evaluation: sectionText,
});

/** 임시 저장(draft)용: 대부분 항목이 비어 있어도 허용한다. */
export const reviewDraftSchema = z.object({
  bookId: z.string().uuid("도서를 선택하세요."),
  mode: z.enum(["structured", "free"]),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  body: z.string().trim().max(20000).optional().or(z.literal("")),
  sections: reviewSectionsSchema.optional(),
});

export type ReviewDraftInput = z.infer<typeof reviewDraftSchema>;
export type ReviewSectionsInput = z.infer<typeof reviewSectionsSchema>;

/** 구조화 모드 제출 시 필수 섹션(핵심 5개). */
export const REQUIRED_STRUCTURED_SECTIONS = [
  "one_line",
  "key_problem",
  "impressive_sentence",
  "author_judgment",
  "final_evaluation",
] as const;

export const SECTION_LABELS: Record<keyof ReviewSectionsInput, string> = {
  one_line: "이 책을 한 문장으로 말한다면",
  key_problem: "가장 중요하게 읽은 문제",
  impressive_sentence: "인상 깊은 문장과 그 이유",
  author_judgment: "저자의 주장에 대한 나의 판단",
  disagreement: "동의하기 어려운 부분",
  connection: "다른 책·사회·삶과의 연결",
  final_evaluation: "최종 평가",
};

/**
 * 제출 가능 여부를 검증한다(임시 저장보다 엄격).
 * 반환: 필드별 오류 맵(비어 있으면 제출 가능).
 */
export function validateReviewForSubmit(input: ReviewDraftInput): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  if (input.mode === "free") {
    if (!input.title || input.title.trim().length === 0) {
      errors.title = ["제출하려면 제목이 필요합니다."];
    }
    if (!input.body || input.body.trim().length < 10) {
      errors.body = ["제출하려면 본문을 10자 이상 작성하세요."];
    }
    return errors;
  }

  // structured
  const sections = input.sections ?? ({} as ReviewSectionsInput);
  for (const key of REQUIRED_STRUCTURED_SECTIONS) {
    const value = sections[key];
    if (!value || value.trim().length === 0) {
      errors[`sections.${key}`] = [`‘${SECTION_LABELS[key]}’ 항목을 작성하세요.`];
    }
  }
  return errors;
}

/** 북포스터 메타(도서/제목). 이미지는 별도 업로드. */
export const posterMetaSchema = z.object({
  bookId: z.string().uuid("도서를 선택하세요."),
  title: z.string().trim().max(200).optional().or(z.literal("")),
});

export type PosterMetaInput = z.infer<typeof posterMetaSchema>;
