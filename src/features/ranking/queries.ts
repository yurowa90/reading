import { createClient } from "@/lib/supabase/server";
import { computeCandidates, type CandidateScore, type WorkStat } from "@/lib/ranking/candidates";
import type { Book, Work } from "@/types/database";

export interface CandidateRow {
  work: Work & { book: Pick<Book, "id" | "title"> | null };
  authorName: string;
  score: CandidateScore;
  rubricTotal: number | null;
  rubricCriteria: Record<string, number> | null;
  featured: boolean;
}

/**
 * 교사용 우수작 후보 보드. 게시작의 별점/좋아요를 집계해 후보 점수를 계산한다.
 * (담당 교사만 이 데이터를 볼 수 있도록 호출부에서 교사 여부를 확인한다.)
 */
export async function getCandidateBoard(classId: string): Promise<CandidateRow[]> {
  const supabase = await createClient();

  const { data: worksData } = await supabase
    .from("works")
    .select("*, book:books(id, title), author:profiles(display_name)")
    .eq("class_id", classId)
    .eq("status", "published");

  const works =
    (worksData as (Work & {
      book: Pick<Book, "id" | "title"> | null;
      author: { display_name: string } | null;
    })[] | null) ?? [];

  if (works.length === 0) return [];
  const workIds = works.map((w) => w.id);

  const [ratingsRes, likesRes, rubricRes] = await Promise.all([
    supabase.from("ratings").select("work_id, score").in("work_id", workIds),
    supabase.from("likes").select("work_id").in("work_id", workIds),
    supabase
      .from("teacher_rubric_scores")
      .select("work_id, total, criteria")
      .in("work_id", workIds),
  ]);

  const ratingRows = (ratingsRes.data as { work_id: string; score: number }[] | null) ?? [];
  const likeRows = (likesRes.data as { work_id: string }[] | null) ?? [];
  const rubricRows =
    (rubricRes.data as { work_id: string; total: number; criteria: Record<string, number> }[] | null) ??
    [];

  const ratingAgg = new Map<string, { sum: number; count: number }>();
  for (const r of ratingRows) {
    const cur = ratingAgg.get(r.work_id) ?? { sum: 0, count: 0 };
    cur.sum += r.score;
    cur.count += 1;
    ratingAgg.set(r.work_id, cur);
  }
  const likeAgg = new Map<string, number>();
  for (const l of likeRows) likeAgg.set(l.work_id, (likeAgg.get(l.work_id) ?? 0) + 1);
  const rubricTotalMap = new Map<string, number>();
  const rubricCriteriaMap = new Map<string, Record<string, number>>();
  for (const r of rubricRows) {
    rubricTotalMap.set(r.work_id, r.total);
    rubricCriteriaMap.set(r.work_id, r.criteria ?? {});
  }

  const stats: WorkStat[] = works.map((w) => {
    const agg = ratingAgg.get(w.id);
    return {
      workId: w.id,
      ratingCount: agg?.count ?? 0,
      ratingAvg: agg && agg.count > 0 ? agg.sum / agg.count : 0,
      likeCount: likeAgg.get(w.id) ?? 0,
    };
  });

  const scores = new Map(computeCandidates(stats).map((s) => [s.workId, s]));

  const rows: CandidateRow[] = works.map((w) => {
    const { author, ...rest } = w;
    return {
      work: rest,
      authorName: author?.display_name ?? "익명",
      score: scores.get(w.id)!,
      rubricTotal: rubricTotalMap.get(w.id) ?? null,
      rubricCriteria: rubricCriteriaMap.get(w.id) ?? null,
      featured: w.featured_at !== null,
    };
  });

  // 후보 우선, 그다음 점수 내림차순으로 정렬해 보여준다.
  rows.sort((a, b) => {
    if (a.score.isCandidate !== b.score.isCandidate) return a.score.isCandidate ? -1 : 1;
    return b.score.peerScore - a.score.peerScore;
  });
  return rows;
}

/** 갤러리 등에서 사용할 최종 우수작(featured) 여부만 빠르게 조회. */
export async function getFeaturedWorkIds(classId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("works")
    .select("id")
    .eq("class_id", classId)
    .eq("status", "published")
    .not("featured_at", "is", null);
  return new Set(((data as { id: string }[] | null) ?? []).map((r) => r.id));
}
