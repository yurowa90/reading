import { describe, expect, it } from "vitest";
import {
  bayesianRating,
  normalizedLikeScore,
  normalizeRating5,
  peerCandidateScore,
  computeCandidates,
  BAYES_PRIOR_M,
  type WorkStat,
} from "@/lib/ranking/candidates";

describe("bayesianRating", () => {
  it("평가 수가 적으면 전체 평균 C 쪽으로 당겨진다", () => {
    // R=5, v=1, C=3, m=5 → (1/6)*5 + (5/6)*3 = 3.33...
    const b = bayesianRating(5, 1, 3, 5);
    expect(b).toBeGreaterThan(3);
    expect(b).toBeLessThan(4);
  });

  it("평가 수가 많으면 작품 평균 R 에 가까워진다", () => {
    const b = bayesianRating(5, 100, 3, 5);
    expect(b).toBeGreaterThan(4.8);
  });

  it("v+m=0 이면 C 를 반환(m=0, v=0)", () => {
    expect(bayesianRating(4, 0, 2.5, 0)).toBe(2.5);
  });

  it("기본 m 은 5", () => {
    expect(BAYES_PRIOR_M).toBe(5);
  });
});

describe("normalizedLikeScore", () => {
  it("maxLikes 가 0 이면 0", () => {
    expect(normalizedLikeScore(0, 0)).toBe(0);
  });
  it("최대치면 1", () => {
    expect(normalizedLikeScore(10, 10)).toBeCloseTo(1);
  });
  it("0~1 사이", () => {
    const v = normalizedLikeScore(3, 10);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});

describe("normalizeRating5", () => {
  it("1→0, 5→1, 3→0.5", () => {
    expect(normalizeRating5(1)).toBe(0);
    expect(normalizeRating5(5)).toBe(1);
    expect(normalizeRating5(3)).toBe(0.5);
  });
  it("범위를 벗어나면 clamp", () => {
    expect(normalizeRating5(0)).toBe(0);
    expect(normalizeRating5(6)).toBe(1);
  });
});

describe("peerCandidateScore", () => {
  it("0.7*별점 + 0.3*좋아요 가중", () => {
    expect(peerCandidateScore(1, 0)).toBeCloseTo(0.7);
    expect(peerCandidateScore(0, 1)).toBeCloseTo(0.3);
    expect(peerCandidateScore(1, 1)).toBeCloseTo(1);
  });
});

describe("computeCandidates", () => {
  const stats: WorkStat[] = [
    { workId: "a", ratingCount: 6, ratingAvg: 4.8, likeCount: 10 }, // 강력 후보
    { workId: "b", ratingCount: 5, ratingAvg: 4.0, likeCount: 6 },
    { workId: "c", ratingCount: 4, ratingAvg: 3.2, likeCount: 3 },
    { workId: "d", ratingCount: 3, ratingAvg: 2.5, likeCount: 1 },
    { workId: "e", ratingCount: 1, ratingAvg: 5.0, likeCount: 0 }, // 최소 평가 수 미달
    { workId: "f", ratingCount: 0, ratingAvg: 0, likeCount: 0 }, // 평가 없음
  ];

  const result = computeCandidates(stats);
  const byId = new Map(result.map((r) => [r.workId, r]));

  it("최소 평가 수(3) 미달은 eligible=false", () => {
    expect(byId.get("e")!.eligible).toBe(false);
    expect(byId.get("f")!.eligible).toBe(false);
    expect(byId.get("d")!.eligible).toBe(true);
  });

  it("미달 작품은 후보가 될 수 없다", () => {
    expect(byId.get("e")!.isCandidate).toBe(false);
    expect(byId.get("f")!.isCandidate).toBe(false);
  });

  it("eligible 4개의 상위 20%(ceil=1)만 후보", () => {
    const candidates = result.filter((r) => r.isCandidate);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.workId).toBe("a");
    expect(candidates[0]!.rank).toBe(1);
  });

  it("점수는 0~1 범위", () => {
    for (const r of result) {
      expect(r.peerScore).toBeGreaterThanOrEqual(0);
      expect(r.peerScore).toBeLessThanOrEqual(1);
    }
  });

  it("후보가 없으면(전원 미달) 빈 후보", () => {
    const none = computeCandidates([
      { workId: "x", ratingCount: 1, ratingAvg: 5, likeCount: 1 },
    ]);
    expect(none.every((r) => !r.isCandidate)).toBe(true);
  });
});
