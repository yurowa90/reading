import { z } from "zod";

/** ISBN-10 또는 ISBN-13 (하이픈/공백 허용, 형식만 확인). */
const isbnRegex = /^(?:\d[\d -]{8,15}[\dXx])?$/;

export const createBookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력하세요.")
    .max(200, "제목은 200자 이하여야 합니다."),
  author: z.string().trim().max(100).optional().or(z.literal("")),
  publisher: z.string().trim().max(100).optional().or(z.literal("")),
  isbn: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || isbnRegex.test(v), "ISBN 형식이 올바르지 않습니다.")
    .optional()
    .or(z.literal("")),
  coverUrl: z
    .string()
    .trim()
    .url("올바른 URL 형식이 아닙니다.")
    .max(500)
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
