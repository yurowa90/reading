import { z } from "zod";
import { MAX_TAG_LENGTH, MAX_TAGS } from "@/lib/utils/tags";

export const sentenceCardSchema = z.object({
  bookId: z.string().uuid("도서를 선택하세요."),
  quote: z
    .string()
    .trim()
    .min(1, "수집한 문장을 입력하세요.")
    .max(1000, "문장은 1000자 이하여야 합니다."),
  pageReference: z.string().trim().max(50).optional().or(z.literal("")),
  reason: z
    .string()
    .trim()
    .min(1, "이 문장을 고른 이유를 입력하세요.")
    .max(1000, "이유는 1000자 이하여야 합니다."),
  interpretation: z
    .string()
    .trim()
    .min(1, "자신의 해석을 입력하세요.")
    .max(2000, "해석은 2000자 이하여야 합니다."),
  question: z.string().trim().max(500).optional().or(z.literal("")),
  // 폼에서는 문자열로 받아 서버 액션에서 normalizeTags로 배열화한다.
  tags: z
    .array(z.string().trim().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS)
    .default([]),
});

export type SentenceCardInput = z.infer<typeof sentenceCardSchema>;
