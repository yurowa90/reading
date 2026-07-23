import { createClient } from "@/lib/supabase/server";
import type { Book, Work } from "@/types/database";

export interface WorkWithBook extends Work {
  book: Pick<Book, "id" | "title" | "author"> | null;
  authorName: string;
}

const SELECT = "*, book:books(id, title, author), author:profiles(display_name)";

/** 관계 조회 결과(생성 타입 없음)를 WorkWithBook 로 정규화한다. */
function toWorkWithBook(row: unknown): WorkWithBook {
  const r = row as Work & {
    book: Pick<Book, "id" | "title" | "author"> | null;
    author: { display_name: string } | null;
  };
  const { author, ...rest } = r;
  return { ...rest, authorName: author?.display_name ?? "익명" };
}

/** 현재 학급에서 내가 만든 작품(모든 상태). */
export async function getMyWorks(classId: string): Promise<WorkWithBook[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("works")
    .select(SELECT)
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(toWorkWithBook);
}

/** 단일 작품(RLS: 본인/담당 교사/게시된 것을 보는 구성원). */
export async function getWork(workId: string): Promise<WorkWithBook | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("works").select(SELECT).eq("id", workId).maybeSingle();
  return data ? toWorkWithBook(data) : null;
}

/** 교사 검토 큐: 제출됨(submitted) 작품. */
export async function getSubmittedWorks(classId: string): Promise<WorkWithBook[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("works")
    .select(SELECT)
    .eq("class_id", classId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });
  return (data ?? []).map(toWorkWithBook);
}

export interface GalleryFilters {
  kind?: "review" | "poster";
  bookId?: string;
  q?: string;
  random?: boolean;
}

/** 학급 갤러리: 게시된(published) 작품만. 학급 내부 공개. */
export async function getGalleryWorks(
  classId: string,
  filters: GalleryFilters = {},
): Promise<WorkWithBook[]> {
  const supabase = await createClient();
  let query = supabase
    .from("works")
    .select(SELECT)
    .eq("class_id", classId)
    .eq("status", "published");

  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.bookId) query = query.eq("book_id", filters.bookId);
  query = query.order("published_at", { ascending: false });

  const { data } = await query;
  let works = (data ?? []).map(toWorkWithBook);

  if (filters.q && filters.q.trim().length > 0) {
    const q = filters.q.trim().toLowerCase();
    works = works.filter((w) => {
      const haystack = [w.title, w.body, w.book?.title, w.book?.author]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (filters.random) {
    // 공정성: 작품을 무작위로 노출. 서버 렌더 시 셔플.
    for (let i = works.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [works[i], works[j]] = [works[j]!, works[i]!];
    }
  }

  return works;
}
