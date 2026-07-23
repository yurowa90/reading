"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ratingSchema } from "@/lib/validation/engagement";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";

/** 좋아요 토글. 자기 작품/평가기간 종료 시 RLS 가 삽입을 거부한다. */
export async function toggleLikeAction(
  _prev: ActionResult<{ liked: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ liked: boolean }>> {
  const workId = formData.get("workId");
  if (typeof workId !== "string") return actionError("잘못된 요청입니다.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const { data: existing } = await supabase
    .from("likes")
    .select("user_id")
    .eq("work_id", workId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("work_id", workId)
      .eq("user_id", user.id);
    if (error) return actionError("좋아요 취소에 실패했습니다.");
    revalidatePath(`/works/${workId}`);
    return actionOk({ liked: false });
  }

  const { error } = await supabase.from("likes").insert({ work_id: workId, user_id: user.id });
  if (error) {
    return actionError("좋아요를 누를 수 없습니다. 평가 기간이 아니거나 본인 작품일 수 있습니다.");
  }
  revalidatePath(`/works/${workId}`);
  return actionOk({ liked: true });
}

/** 별점 등록/수정(1~5). */
export async function setRatingAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = ratingSchema.safeParse({
    workId: formData.get("workId"),
    score: formData.get("score"),
  });
  if (!parsed.success) return actionError("별점을 확인하세요.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const { error } = await supabase
    .from("ratings")
    .upsert(
      { work_id: parsed.data.workId, user_id: user.id, score: parsed.data.score },
      { onConflict: "work_id,user_id" },
    );
  if (error) {
    return actionError("별점을 줄 수 없습니다. 평가 기간이 아니거나 본인 작품일 수 있습니다.");
  }
  revalidatePath(`/works/${parsed.data.workId}`);
  return actionOk(undefined);
}
