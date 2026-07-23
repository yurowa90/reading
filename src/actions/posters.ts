"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { posterMetaSchema } from "@/lib/validation/work";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import type { Work } from "@/types/database";

/** 북포스터 draft 생성. 이미지는 이후 클라이언트가 업로드하고 attach 로 경로를 연결한다. */
export async function createPosterDraftAction(
  classId: string,
  _prev: ActionResult<{ workId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ workId: string }>> {
  const parsed = posterMetaSchema.safeParse({
    bookId: formData.get("bookId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const title = parsed.data.title?.trim();
  const { data, error } = await supabase
    .from("works")
    .insert({
      user_id: user.id,
      class_id: classId,
      book_id: parsed.data.bookId,
      kind: "poster",
      mode: null,
      title: title && title.length > 0 ? title : null,
      status: "draft",
    })
    .select("id")
    .single<Pick<Work, "id">>();

  if (error || !data) return actionError("포스터 초안을 만들지 못했습니다. 학급 소속과 도서를 확인하세요.");
  return actionOk({ workId: data.id });
}

/** 클라이언트 업로드 완료 후 저장 경로를 works 에 연결한다. */
export async function attachPosterAction(
  workId: string,
  posterPath: string,
  thumbPath: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .update({ poster_path: posterPath, poster_thumb_path: thumbPath })
    .eq("id", workId)
    .select("class_id")
    .maybeSingle<Pick<Work, "class_id">>();
  if (error || !data) return actionError("이미지를 연결하지 못했습니다.");
  revalidatePath(`/classes/${data.class_id}/works`);
  return actionOk(undefined);
}
