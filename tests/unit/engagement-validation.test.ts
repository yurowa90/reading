import { describe, expect, it } from "vitest";
import {
  commentSchema,
  ratingSchema,
  votingRoundSchema,
  reportSchema,
} from "@/lib/validation/engagement";

const WORK = "11111111-1111-1111-1111-111111111111";
const CMT = "22222222-2222-2222-2222-222222222222";

describe("commentSchema", () => {
  it("정상 댓글 통과", () => {
    expect(commentSchema.safeParse({ workId: WORK, body: "좋은 글이에요" }).success).toBe(true);
  });
  it("빈 댓글 거부", () => {
    expect(commentSchema.safeParse({ workId: WORK, body: "  " }).success).toBe(false);
  });
  it("1000자 초과 거부", () => {
    expect(commentSchema.safeParse({ workId: WORK, body: "가".repeat(1001) }).success).toBe(false);
  });
});

describe("ratingSchema", () => {
  it("1~5 허용, 문자열도 coerce", () => {
    expect(ratingSchema.safeParse({ workId: WORK, score: "4" }).success).toBe(true);
  });
  it("범위 밖 거부", () => {
    expect(ratingSchema.safeParse({ workId: WORK, score: 0 }).success).toBe(false);
    expect(ratingSchema.safeParse({ workId: WORK, score: 6 }).success).toBe(false);
  });
});

describe("reportSchema", () => {
  it("사유 없이도 통과", () => {
    expect(reportSchema.safeParse({ commentId: CMT }).success).toBe(true);
  });
});

describe("votingRoundSchema", () => {
  it("종료가 시작보다 뒤면 통과", () => {
    const r = votingRoundSchema.safeParse({
      opensAt: "2026-07-01T09:00",
      closesAt: "2026-07-08T18:00",
      minReviews: 2,
    });
    expect(r.success).toBe(true);
  });
  it("종료가 시작보다 앞이면 거부", () => {
    const r = votingRoundSchema.safeParse({
      opensAt: "2026-07-08T09:00",
      closesAt: "2026-07-01T09:00",
    });
    expect(r.success).toBe(false);
  });
});
