import { createClient } from "@/lib/supabase/server";
import type { Book, SentenceCard, Work } from "@/types/database";
import { countByKind, countByStatus } from "@/lib/stats/summary";

export interface PortfolioSentence extends SentenceCard {
  book: Pick<Book, "id" | "title"> | null;
}
export interface PortfolioWork extends Work {
  book: Pick<Book, "id" | "title"> | null;
}

export interface StudentPortfolio {
  displayName: string;
  sentenceCount: number;
  sentences: PortfolioSentence[];
  works: PortfolioWork[];
  statusCounts: ReturnType<typeof countByStatus>;
  kindCounts: ReturnType<typeof countByKind>;
  publishedCount: number;
  featuredCount: number;
  chatCount: number;
}

/**
 * 학생 한 명의 학급 내 독서 여정 요약.
 * RLS: 본인이면 전부, 담당 교사면 담당 학급 학생의 자료를 읽을 수 있다.
 */
export async function getStudentPortfolio(
  classId: string,
  userId: string,
): Promise<StudentPortfolio | null> {
  const supabase = await createClient();

  const [profileRes, sentencesRes, worksRes, chatRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("sentence_cards")
      .select("*, book:books(id, title)")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("works")
      .select("*, book:books(id, title)")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("user_id", userId),
  ]);

  const profile = profileRes.data as { display_name: string } | null;
  if (!profile) return null;

  const sentences = (sentencesRes.data as PortfolioSentence[] | null) ?? [];
  const works = (worksRes.data as PortfolioWork[] | null) ?? [];

  const statusCounts = countByStatus(works);
  return {
    displayName: profile.display_name,
    sentenceCount: sentences.length,
    sentences,
    works,
    statusCounts,
    kindCounts: countByKind(works),
    publishedCount: statusCounts.published,
    featuredCount: works.filter((w) => w.featured_at !== null).length,
    chatCount: chatRes.count ?? 0,
  };
}
