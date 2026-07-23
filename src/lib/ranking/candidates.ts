/**
 * 우수작 후보 점수 계산 (순수 함수, 단위 테스트 대상).
 *
 * 좋아요 수·단순 평균 별점을 그대로 합산하지 않는다. 베이지안 보정 별점과
 * 정규화 좋아요를 0~1로 정규화해 결합한다. 계산식은 docs/DATA_MODEL.md 참조.
 *
 * 결과는 "동료평가 기반 우수작 후보" 추천에만 쓰이며, 자동 확정하지 않는다.
 */

/** 베이지안 신뢰 최소 평가 수(prior weight). */
export const BAYES_PRIOR_M = 5;
/** 후보 계산 대상이 되기 위한 최소 평가 수. */
export const MIN_CANDIDATE_RATINGS = 3;
/** 상위 몇 %를 후보로 표시할지. */
export const CANDIDATE_TOP_RATIO = 0.2;

export interface WorkStat {
  workId: string;
  ratingCount: number; // v
  ratingAvg: number; // R (1~5), 평가 없으면 0
  likeCount: number;
}

export interface CandidateScore {
  workId: string;
  ratingCount: number;
  ratingAvg: number;
  likeCount: number;
  bayesianRating: number; // 1~5 스케일
  normalizedBayesian: number; // 0~1
  normalizedLike: number; // 0~1
  peerScore: number; // 0~1
  eligible: boolean; // 최소 평가 수 충족
  isCandidate: boolean; // 상위 20%
  rank: number | null; // 후보 내 순위(1부터), 비후보는 null
}

/** 베이지안 보정 별점. v+m=0 이면 전체 평균 C 를 반환. */
export function bayesianRating(R: number, v: number, C: number, m = BAYES_PRIOR_M): number {
  const denom = v + m;
  if (denom === 0) return C;
  return (v / denom) * R + (m / denom) * C;
}

/** 좋아요 정규화. maxLikes 가 0 이면 0. */
export function normalizedLikeScore(likes: number, maxLikes: number): number {
  if (maxLikes <= 0) return 0;
  return Math.log(1 + likes) / Math.log(1 + maxLikes);
}

/** 1~5 별점을 0~1 로 정규화. */
export function normalizeRating5(value: number): number {
  const clamped = Math.max(1, Math.min(5, value));
  return (clamped - 1) / 4;
}

export function peerCandidateScore(normalizedBayesian: number, normalizedLike: number): number {
  return 0.7 * normalizedBayesian + 0.3 * normalizedLike;
}

/**
 * 작품 통계 목록으로부터 후보 점수를 계산한다.
 *  - C(전체 평균)는 평가가 있는 작품들의 평균 별점 평균.
 *  - maxLikes 는 전체 작품 중 최대 좋아요 수.
 *  - 최소 평가 수를 충족한 작품만 후보 대상(eligible).
 *  - eligible 을 peerScore 내림차순 정렬해 상위 CANDIDATE_TOP_RATIO 를 후보로 표시.
 */
export function computeCandidates(stats: WorkStat[]): CandidateScore[] {
  const rated = stats.filter((s) => s.ratingCount > 0);
  const C =
    rated.length > 0 ? rated.reduce((sum, s) => sum + s.ratingAvg, 0) / rated.length : 0;
  const maxLikes = stats.reduce((max, s) => Math.max(max, s.likeCount), 0);

  const scored: CandidateScore[] = stats.map((s) => {
    const b = bayesianRating(s.ratingAvg, s.ratingCount, C);
    const normalizedBayesian = normalizeRating5(b);
    const normalizedLike = normalizedLikeScore(s.likeCount, maxLikes);
    return {
      workId: s.workId,
      ratingCount: s.ratingCount,
      ratingAvg: s.ratingAvg,
      likeCount: s.likeCount,
      bayesianRating: Math.round(b * 100) / 100,
      normalizedBayesian,
      normalizedLike,
      peerScore: Math.round(peerCandidateScore(normalizedBayesian, normalizedLike) * 1000) / 1000,
      eligible: s.ratingCount >= MIN_CANDIDATE_RATINGS,
      isCandidate: false,
      rank: null,
    };
  });

  const eligible = scored
    .filter((s) => s.eligible)
    .sort((a, b) => b.peerScore - a.peerScore || b.bayesianRating - a.bayesianRating);

  const candidateCount = eligible.length > 0 ? Math.ceil(eligible.length * CANDIDATE_TOP_RATIO) : 0;
  eligible.forEach((s, i) => {
    if (i < candidateCount) {
      s.isCandidate = true;
      s.rank = i + 1;
    }
  });

  // 원래 목록 순서 유지하되 후보는 점수순으로 앞세우고 싶으면 호출부에서 정렬.
  return scored;
}
