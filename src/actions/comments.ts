"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { commentSchema, commentEditSchema, reportSchema } from "@/lib/validation/engagement";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";

export async function addCommentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = commentSchema.safeParse({
    workId: formData.get("workId"),
    parentId: formData.get("parentId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return actionError("댓글을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const parentId = parsed.data.parentId && parsed.data.parentId.length > 0 ? parsed.data.parentId : null;
  const { error } = await supabase.from("comments").insert({
    work_id: parsed.data.workId,
    user_id: user.id,
    parent_id: parentId,
    body: parsed.data.body,
  });
  if (error) {
    // 연속 등록 제한 트리거 메시지 구분
    if (error.message.includes("comment_rate_limit")) {
      return actionError("연속으로 등록할 수 없습니다. 잠시 후 다시 시도하세요.");
    }
    return actionError("댓글을 등록하지 못했습니다.");
  }
  revalidatePath(`/works/${parsed.data.workId}`);
  return actionOk(undefined);
}

export async function editCommentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = commentEditSchema.safeParse({
    commentId: formData.get("commentId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return actionError("댓글을 확인하세요.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ body: parsed.data.body })
    .eq("id", parsed.data.commentId)
    .select("work_id")
    .maybeSingle<{ work_id: string }>();
  if (error || !data) return actionError("수정 권한이 없거나 저장에 실패했습니다.");
  revalidatePath(`/works/${data.work_id}`);
  return actionOk(undefined);
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const commentId = formData.get("commentId");
  const workId = formData.get("workId");
  if (typeof commentId !== "string" || typeof workId !== "string") return;
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath(`/works/${workId}`);
}

export async function reportCommentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = reportSchema.safeParse({
    commentId: formData.get("commentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return actionError("신고 내용을 확인하세요.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const reason = parsed.data.reason && parsed.data.reason.length > 0 ? parsed.data.reason : null;
  const { error } = await supabase
    .from("reports")
    .insert({ comment_id: parsed.data.commentId, reporter_id: user.id, reason });
  if (error) {
    if (error.code === "23505") return actionError("이미 신고한 댓글입니다.");
    return actionError("신고를 접수하지 못했습니다.");
  }
  return actionOk(undefined);
}

/** 교사: 댓글 숨김/해제. */
export async function setCommentHiddenAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const commentId = formData.get("commentId");
  const workId = formData.get("workId");
  const hide = formData.get("hide") === "true";
  if (typeof commentId !== "string" || typeof workId !== "string") {
    return actionError("잘못된 요청입니다.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const { error } = await supabase
    .from("comments")
    .update({
      hidden_at: hide ? new Date().toISOString() : null,
      hidden_by: hide ? user.id : null,
    })
    .eq("id", commentId);
  if (error) return actionError("권한이 없거나 처리에 실패했습니다.");
  revalidatePath(`/works/${workId}`);
  return actionOk(undefined);
}

/** 교사: 신고 처리(resolved). */
export async function resolveReportAction(
  _prev: ActionResult<{ classId: string }> | null,
  formData: FormData,
): Promise<ActionResult> {
  const reportId = formData.get("reportId");
  const classId = formData.get("classId");
  if (typeof reportId !== "string") return actionError("잘못된 요청입니다.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "resolved" })
    .eq("id", reportId);
  if (error) return actionError("처리에 실패했습니다.");
  if (typeof classId === "string") revalidatePath(`/classes/${classId}/reports`);
  return actionOk(undefined);
}
