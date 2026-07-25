import { createClient } from "@/lib/supabase/server";
import type { Work } from "@/types/database";
import {
  buildParticipation,
  countByStatus,
  tallyByUser,
  type ParticipationRow,
} from "@/lib/stats/summary";

export interface ClassDashboard {
  studentCount: number;
  sentenceTotal: number;
  statusCounts: ReturnType<typeof countByStatus>;
  publishedTotal: number;
  featuredTotal: number;
  chatSessionTotal: number;
  participation: ParticipationRow[];
}

/**
 * 교사 대시보드: 담당 학급 활동 개요 + 학생별 참여 요약.
 * RLS: 담당 교사는 학급 자료 전체를 조회할 수 있다.
 */
export async function getClassDashboard(classId: string): Promise<ClassDashboard> {
  const supabase = await createClient();

  const [membersRes, sentencesRes, worksRes, commentsRes, chatRes] = await Promise.all([
    supabase
      .from("class_members")
      .select("user_id, member_role, profile:profiles(display_name)")
      .eq("class_id", classId)
      .eq("status", "active"),
    supabase.from("sentence_cards").select("user_id").eq("class_id", classId),
    supabase.from("works").select("user_id, status, kind, featured_at").eq("class_id", classId),
    supabase.from("comments").select("user_id, work:works(class_id)").limit(2000),
    supabase
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId),
  ]);

  const members =
    (membersRes.data as
      | { user_id: string; member_role: string; profile: { display_name: string } | null }[]
      | null) ?? [];
  const students = members
    .filter((m) => m.member_role === "student")
    .map((m) => ({ userId: m.user_id, displayName: m.profile?.display_name ?? "익명" }));

  const sentences = (sentencesRes.data as { user_id: string }[] | null) ?? [];
  const works =
    (worksRes.data as Pick<Work, "user_id" | "status" | "kind" | "featured_at">[] | null) ?? [];
  const comments =
    (commentsRes.data as { user_id: string; work: { class_id: string } | null }[] | null) ?? [];
  const classComments = comments.filter((c) => c.work?.class_id === classId);

  const statusCounts = countByStatus(works);
  const participation = buildParticipation(
    students,
    tallyByUser(sentences),
    tallyByUser(works.filter((w) => w.status === "published")),
    tallyByUser(works.filter((w) => w.status === "submitted")),
    tallyByUser(classComments),
  );

  return {
    studentCount: students.length,
    sentenceTotal: sentences.length,
    statusCounts,
    publishedTotal: statusCounts.published,
    featuredTotal: works.filter((w) => w.featured_at !== null).length,
    chatSessionTotal: chatRes.count ?? 0,
    participation,
  };
}
