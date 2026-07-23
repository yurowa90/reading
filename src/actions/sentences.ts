"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sentenceCardSchema } from "@/lib/validation/sentence";
import { normalizeTags } from "@/lib/utils/tags";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";

function parseForm(formData: FormData) {
  const tagsRaw = formData.get("tags");
  const tags = normalizeTags(typeof tagsRaw === "string" ? tagsRaw : "");
  return sentenceCardSchema.safeParse({
    bookId: formData.get("bookId"),
    quote: formData.get("quote"),
    pageReference: formData.get("pageReference"),
    reason: formData.get("reason"),
    interpretation: formData.get("interpretation"),
    question: formData.get("question"),
    tags,
  });
}

function emptyToNull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

export async function createSentenceAction(
  classId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  // 학급 구성원이 아니거나 도서가 학급 소속이 아니면 RLS 가 거부한다.
  const { error } = await supabase.from("sentence_cards").insert({
    user_id: user.id,
    class_id: classId,
    book_id: parsed.data.bookId,
    quote: parsed.data.quote,
    page_reference: emptyToNull(parsed.data.pageReference),
    reason: parsed.data.reason,
    interpretation: parsed.data.interpretation,
    question: emptyToNull(parsed.data.question),
    tags: parsed.data.tags,
  });

  if (error) {
    return actionError("문장 카드를 저장하지 못했습니다. 학급 소속과 도서를 확인하세요.");
  }

  revalidatePath(`/classes/${classId}/sentences`);
  return actionOk(undefined);
}

export async function updateSentenceAction(
  sentenceId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  // 본인 카드가 아니면 RLS update 정책이 0행을 갱신한다.
  const { data, error } = await supabase
    .from("sentence_cards")
    .update({
      book_id: parsed.data.bookId,
      quote: parsed.data.quote,
      page_reference: emptyToNull(parsed.data.pageReference),
      reason: parsed.data.reason,
      interpretation: parsed.data.interpretation,
      question: emptyToNull(parsed.data.question),
      tags: parsed.data.tags,
    })
    .eq("id", sentenceId)
    .select("class_id")
    .maybeSingle<{ class_id: string }>();

  if (error || !data) {
    return actionError("문장 카드를 수정할 권한이 없거나 저장에 실패했습니다.");
  }

  revalidatePath(`/classes/${data.class_id}/sentences`);
  return actionOk(undefined);
}

/** 삭제 후 학급 문장 목록으로 리다이렉트. 본인 카드가 아니면 RLS 가 거부. */
export async function deleteSentenceAction(formData: FormData): Promise<void> {
  const sentenceId = formData.get("sentenceId");
  const classId = formData.get("classId");
  if (typeof sentenceId !== "string" || typeof classId !== "string") return;

  const supabase = await createClient();
  await supabase.from("sentence_cards").delete().eq("id", sentenceId);

  revalidatePath(`/classes/${classId}/sentences`);
  redirect(`/classes/${classId}/sentences`);
}
