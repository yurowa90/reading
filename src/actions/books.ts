"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createBookSchema } from "@/lib/validation/book";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";

function emptyToNull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

export async function createBookAction(
  classId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createBookSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    publisher: formData.get("publisher"),
    isbn: formData.get("isbn"),
    coverUrl: formData.get("coverUrl"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  // 담당 교사가 아니면 RLS books_insert_teacher 정책이 거부한다.
  const { error } = await supabase.from("books").insert({
    class_id: classId,
    title: parsed.data.title,
    author: emptyToNull(parsed.data.author),
    publisher: emptyToNull(parsed.data.publisher),
    isbn: emptyToNull(parsed.data.isbn),
    cover_url: emptyToNull(parsed.data.coverUrl),
    description: emptyToNull(parsed.data.description),
    created_by: user.id,
  });

  if (error) {
    return actionError("도서를 등록할 권한이 없거나 저장에 실패했습니다.");
  }

  revalidatePath(`/classes/${classId}/books`);
  return actionOk(undefined);
}
