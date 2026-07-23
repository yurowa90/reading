"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rubricSchema, rubricTotal } from "@/lib/validation/rubric";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import type { Work } from "@/types/database";

/** 교사 루브릭 저장(작품당 교사 1건, upsert). */
export async function saveRubricAction(
  classId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = rubricSchema.safeParse({
    workId: formData.get("workId"),
    understanding: formData.get("understanding"),
    evidence: formData.get("evidence"),
    expression: formData.get("expression"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return actionError("점수를 확인하세요.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const { understanding, evidence, expression } = parsed.data;
  const comment = parsed.data.comment?.trim();
  const { error } = await supabase.from("teacher_rubric_scores").upsert(
    {
      work_id: parsed.data.workId,
      teacher_id: user.id,
      criteria: { understanding, evidence, expression },
      total: rubricTotal({ understanding, evidence, expression }),
      comment: comment && comment.length > 0 ? comment : null,
    },
    { onConflict: "work_id,teacher_id" },
  );
  if (error) return actionError("루브릭을 저장할 권한이 없거나 저장에 실패했습니다.");

  revalidatePath(`/classes/${classId}/candidates`);
  return actionOk(undefined);
}

/** 최종 우수작 선정/해제(담당 교사). */
export async function toggleFeaturedAction(
  classId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const workId = formData.get("workId");
  const feature = formData.get("feature") === "true";
  if (typeof workId !== "string") return actionError("잘못된 요청입니다.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("works")
    .update({
      featured_at: feature ? new Date().toISOString() : null,
      featured_by: feature ? user.id : null,
    })
    .eq("id", workId)
    .eq("status", "published")
    .select("id")
    .maybeSingle<Pick<Work, "id">>();
  if (error || !data) return actionError("권한이 없거나 처리에 실패했습니다.");

  revalidatePath(`/classes/${classId}/candidates`);
  revalidatePath(`/classes/${classId}/gallery`);
  return actionOk(undefined);
}
