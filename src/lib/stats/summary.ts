import type { WorkKind, WorkStatus } from "@/types/database";

/** 상태별 작품 수 집계(순수 함수, 테스트 대상). */
export function countByStatus(
  works: { status: WorkStatus }[],
): Record<WorkStatus, number> {
  const base: Record<WorkStatus, number> = {
    draft: 0,
    submitted: 0,
    approved: 0,
    published: 0,
    rejected: 0,
    hidden: 0,
  };
  for (const w of works) base[w.status] += 1;
  return base;
}

export function countByKind(works: { kind: WorkKind }[]): Record<WorkKind, number> {
  const base: Record<WorkKind, number> = { review: 0, poster: 0 };
  for (const w of works) base[w.kind] += 1;
  return base;
}

export interface ParticipationInput {
  userId: string;
  displayName: string;
}

export interface ParticipationRow extends ParticipationInput {
  sentenceCount: number;
  publishedCount: number;
  submittedCount: number;
  commentCount: number;
}

/**
 * 학생별 참여 요약을 만든다. 각 카운트 맵은 userId→건수.
 * (교사 대시보드에서 학생 목록과 각 활동 집계를 결합할 때 사용.)
 */
export function buildParticipation(
  students: ParticipationInput[],
  sentenceByUser: Map<string, number>,
  publishedByUser: Map<string, number>,
  submittedByUser: Map<string, number>,
  commentByUser: Map<string, number>,
): ParticipationRow[] {
  return students.map((s) => ({
    ...s,
    sentenceCount: sentenceByUser.get(s.userId) ?? 0,
    publishedCount: publishedByUser.get(s.userId) ?? 0,
    submittedCount: submittedByUser.get(s.userId) ?? 0,
    commentCount: commentByUser.get(s.userId) ?? 0,
  }));
}

/** userId 별 건수 맵을 만든다. */
export function tallyByUser(rows: { user_id: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.user_id, (map.get(r.user_id) ?? 0) + 1);
  return map;
}
