import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/types/database";

/** 학급 도서 목록 (RLS: 학급 구성원/담당 교사만). */
export async function getClassBooks(classId: string): Promise<Book[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function getBook(bookId: string): Promise<Book | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("books").select("*").eq("id", bookId).maybeSingle<Book>();
  return data ?? null;
}
