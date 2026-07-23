import { z } from "zod";

export const commentSchema = z.object({
  workId: z.string().uuid(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(1, "댓글 내용을 입력하세요.")
    .max(1000, "댓글은 1000자 이하여야 합니다."),
});

export const commentEditSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().trim().min(1, "댓글 내용을 입력하세요.").max(1000),
});

export const ratingSchema = z.object({
  workId: z.string().uuid(),
  score: z.coerce.number().int().min(1).max(5),
});

export const reportSchema = z.object({
  commentId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const votingRoundSchema = z
  .object({
    label: z.string().trim().max(60).optional().or(z.literal("")),
    opensAt: z.string().min(1, "시작 일시를 입력하세요."),
    closesAt: z.string().min(1, "종료 일시를 입력하세요."),
    minReviews: z.coerce.number().int().min(0).max(100).default(0),
  })
  .refine((d) => new Date(d.closesAt).getTime() > new Date(d.opensAt).getTime(), {
    message: "종료 일시는 시작 일시보다 뒤여야 합니다.",
    path: ["closesAt"],
  });

/** 댓글 입력 기본 틀(placeholder). 학생이 지우고 자유롭게 쓸 수 있다. */
export const COMMENT_TEMPLATE = "좋았던 점:\n궁금한 점:\n더 생각해 볼 점:";

export type CommentInput = z.infer<typeof commentSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type VotingRoundInput = z.infer<typeof votingRoundSchema>;
