import { z } from "zod";

/** 참여 코드는 대문자+숫자 8자리(혼동 문자 제외). RPC 검증과 형식을 일치시킨다. */
export const JOIN_CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/;

export const createClassSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "학급명은 2자 이상이어야 합니다.")
    .max(40, "학급명은 40자 이하여야 합니다."),
  description: z
    .string()
    .trim()
    .max(300, "설명은 300자 이하여야 합니다.")
    .optional()
    .or(z.literal("")),
});

export const joinClassSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(JOIN_CODE_REGEX, "참여 코드는 영문 대문자와 숫자 8자리입니다."),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type JoinClassInput = z.infer<typeof joinClassSchema>;
