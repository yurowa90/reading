"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  reviewDraftSchema,
  validateReviewForSubmit,
  type ReviewDraftInput,
} from "@/lib/validation/work";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import type { Work } from "@/types/database";

function emptyToNull(v: string | undefined | null): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

function parseReviewForm(formData: FormData) {
  const mode = formData.get("mode");
  const sections = {
    one_line: String(formData.get("sections.one_line") ?? ""),
    key_problem: String(formData.get("sections.key_problem") ?? ""),
    impressive_sentence: String(formData.get("sections.impressive_sentence") ?? ""),
    author_judgment: String(formData.get("sections.author_judgment") ?? ""),
    disagreement: String(formData.get("sections.disagreement") ?? ""),
    connection: String(formData.get("sections.connection") ?? ""),
    final_evaluation: String(formData.get("sections.final_evaluation") ?? ""),
  };
  return reviewDraftSchema.safeParse({
    bookId: formData.get("bookId"),
    mode,
    title: formData.get("title"),
    body: formData.get("body"),
    sections: mode === "structured" ? sections : undefined,
  });
}

/** 서평 임시 저장(생성 또는 수정). workId 가 없으면 새 draft 를 만든다. */
export async function saveReviewAction(
  classId: string,
  workId: string | null,
  _prev: ActionResult<{ workId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ workId: string }>> {
  const parsed = parseReviewForm(formData);
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const payload = {
    book_id: input.bookId,
    mode: input.mode,
    title: emptyToNull(input.title),
    body: input.mode === "free" ? emptyToNull(input.body) : null,
    sections: input.mode === "structured" ? (input.sections ?? {}) : null,
  };

  if (workId) {
    const { data, error } = await supabase
      .from("works")
      .update(payload)
      .eq("id", workId)
      .select("id")
      .maybeSingle<Pick<Work, "id">>();
    if (error || !data) return actionError("서평을 저장할 권한이 없거나 저장에 실패했습니다.");
    revalidatePath(`/classes/${classId}/works`);
    return actionOk({ workId: data.id });
  }

  const { data, error } = await supabase
    .from("works")
    .insert({
      user_id: user.id,
      class_id: classId,
      kind: "review",
      status: "draft",
      ...payload,
    })
    .select("id")
    .single<Pick<Work, "id">>();
  if (error || !data) return actionError("서평을 저장하지 못했습니다. 학급 소속과 도서를 확인하세요.");
  revalidatePath(`/classes/${classId}/works`);
  return actionOk({ workId: data.id });
}

/** 작품 제출(서평/포스터 공용). 완성도 검증 후 상태를 submitted 로 변경. */
export async function submitWorkAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const workId = formData.get("workId");
  if (typeof workId !== "string") return actionError("잘못된 요청입니다.");

  const supabase = await createClient();
  const { data: work } = await supabase
    .from("works")
    .select("*")
    .eq("id", workId)
    .maybeSingle<Work>();
  if (!work) return actionError("작품을 찾을 수 없습니다.");

  if (work.kind === "review") {
    const errors = validateReviewForSubmit({
      bookId: work.book_id,
      mode: work.mode ?? "free",
      title: work.title ?? "",
      body: work.body ?? "",
      sections: (work.sections ?? undefined) as ReviewDraftInput["sections"],
    });
    if (Object.keys(errors).length > 0) {
      return actionError("제출하려면 필수 항목을 모두 작성하세요.", errors);
    }
  } else {
    if (!work.poster_path) {
      return actionError("제출하려면 포스터 이미지를 먼저 업로드하세요.");
    }
  }

  const { error } = await supabase
    .from("works")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", workId);
  if (error) return actionError("제출에 실패했습니다.");

  revalidatePath(`/classes/${work.class_id}/works`);
  return actionOk(undefined);
}

/** 작품 삭제(작성자, draft/rejected). */
export async function deleteWorkAction(formData: FormData): Promise<ActionResult> {
  const workId = formData.get("workId");
  const classId = formData.get("classId");
  if (typeof workId !== "string" || typeof classId !== "string") {
    return actionError("잘못된 요청입니다.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("works").delete().eq("id", workId);
  if (error) return actionError("삭제에 실패했습니다.");
  revalidatePath(`/classes/${classId}/works`);
  return actionOk(undefined);
}

// ── 교사 검토 액션 ──────────────────────────────────────────────────────────

async function teacherTransition(
  workId: string,
  patch: Partial<Work>,
): Promise<ActionResult<{ classId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("works")
    .update({ ...patch, reviewed_by: user.id })
    .eq("id", workId)
    .select("class_id")
    .maybeSingle<Pick<Work, "class_id">>();
  if (error || !data) return actionError("권한이 없거나 처리에 실패했습니다.");
  revalidatePath(`/classes/${data.class_id}/pending`);
  revalidatePath(`/classes/${data.class_id}/gallery`);
  return actionOk({ classId: data.class_id });
}

export async function approveWorkAction(
  _prev: ActionResult<{ classId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ classId: string }>> {
  const workId = formData.get("workId");
  if (typeof workId !== "string") return actionError("잘못된 요청입니다.");
  return teacherTransition(workId, {
    status: "published",
    published_at: new Date().toISOString(),
    review_note: null,
  });
}

export async function rejectWorkAction(
  _prev: ActionResult<{ classId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ classId: string }>> {
  const workId = formData.get("workId");
  const note = formData.get("note");
  if (typeof workId !== "string") return actionError("잘못된 요청입니다.");
  return teacherTransition(workId, {
    status: "rejected",
    review_note: typeof note === "string" ? note.slice(0, 1000) : null,
  });
}

export async function hideWorkAction(
  _prev: ActionResult<{ classId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ classId: string }>> {
  const workId = formData.get("workId");
  if (typeof workId !== "string") return actionError("잘못된 요청입니다.");
  return teacherTransition(workId, { status: "hidden" });
}
