import { createClient } from "@/lib/supabase/server";
import type { Book, SentenceCard } from "@/types/database";

export interface SentenceWithBook extends SentenceCard {
  book: Pick<Book, "id" | "title" | "author"> | null;
}

/** 현재 학급에서 내가 수집한 문장 카드 (선택적으로 도서 필터). */
export async function getMySentences(
  classId: string,
  bookId?: string,
): Promise<SentenceWithBook[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("sentence_cards")
    .select("*, book:books(id, title, author)")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (bookId) query = query.eq("book_id", bookId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as SentenceWithBook[];
}

/** 단일 문장 카드 (RLS: 본인 또는 담당 교사). */
export async function getSentence(sentenceId: string): Promise<SentenceWithBook | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sentence_cards")
    .select("*, book:books(id, title, author)")
    .eq("id", sentenceId)
    .maybeSingle();
  return (data as SentenceWithBook) ?? null;
}

/** 최근 내 문장 카드 (대시보드용, 학급 무관 전체). */
export async function getRecentMySentences(limit = 5): Promise<SentenceWithBook[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("sentence_cards")
    .select("*, book:books(id, title, author)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as SentenceWithBook[]) ?? [];
}

/** 교사용: 담당 학급의 학생 문장 카드 (작성자 별칭 포함). */
export interface TeacherSentenceView extends SentenceWithBook {
  authorName: string;
}

export async function getClassSentencesForTeacher(
  classId: string,
): Promise<TeacherSentenceView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sentence_cards")
    .select("*, book:books(id, title, author), author:profiles(display_name)")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const author = row.author as { display_name: string } | null;
    const { author: _omit, ...rest } = row as typeof row & { author: unknown };
    return {
      ...(rest as SentenceWithBook),
      authorName: author?.display_name ?? "(이름 없음)",
    };
  });
}
