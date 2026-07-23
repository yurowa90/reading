import { createClient } from "@/lib/supabase/server";
import type { VotingRound } from "@/types/database";

/** 평균 별점을 공개하기 위한 최소 평가 수(신뢰도 확보). */
export const MIN_RATINGS_FOR_AVG = 3;

/** 지금 열려 있는 평가 기간(없으면 null). */
export async function getActiveVotingRound(classId: string): Promise<VotingRound | null> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("voting_rounds")
    .select("*")
    .eq("class_id", classId)
    .lte("opens_at", nowIso)
    .gt("closes_at", nowIso)
    .order("closes_at", { ascending: false })
    .limit(1)
    .maybeSingle<VotingRound>();
  return data ?? null;
}

export async function getClassVotingRounds(classId: string): Promise<VotingRound[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("voting_rounds")
    .select("*")
    .eq("class_id", classId)
    .order("opens_at", { ascending: false });
  return data ?? [];
}

export interface Engagement {
  votingOpen: boolean;
  revealed: boolean; // 집계 공개 여부(평가 기간 중이면 false)
  likeCount: number;
  myLiked: boolean;
  ratingCount: number;
  ratingAvg: number | null; // 공개 불가/미달이면 null
  myRating: number | null;
}

/**
 * 작품의 좋아요/별점 집계 + 내 상태.
 * 평가 기간 중에는 타인 집계가 RLS 로 가려지므로 revealed=false 로 표시하고
 * UI 에서 총계를 숨긴다.
 */
export async function getEngagement(workId: string, classId: string): Promise<Engagement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const round = await getActiveVotingRound(classId);
  const votingOpen = round !== null;
  const revealed = !votingOpen;

  const [{ count: likeCount }, myLikeRes, ratingRes] = await Promise.all([
    supabase.from("likes").select("*", { count: "exact", head: true }).eq("work_id", workId),
    user
      ? supabase.from("likes").select("user_id").eq("work_id", workId).eq("user_id", user.id)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
    supabase.from("ratings").select("score, user_id").eq("work_id", workId),
  ]);

  const ratingRows = (ratingRes.data as { score: number; user_id: string }[] | null) ?? [];
  const myRating = user ? (ratingRows.find((r) => r.user_id === user.id)?.score ?? null) : null;
  const scores = ratingRows.map((r) => r.score);
  const ratingCount = revealed ? scores.length : 0;
  const ratingAvg =
    revealed && scores.length >= MIN_RATINGS_FOR_AVG
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  return {
    votingOpen,
    revealed,
    likeCount: revealed ? (likeCount ?? 0) : 0,
    myLiked: (myLikeRes.data?.length ?? 0) > 0,
    ratingCount,
    ratingAvg,
    myRating,
  };
}
