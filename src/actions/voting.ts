"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { votingRoundSchema } from "@/lib/validation/engagement";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";

/** 교사: 상호평가 기간 생성. */
export async function createVotingRoundAction(
  classId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = votingRoundSchema.safeParse({
    label: formData.get("label"),
    opensAt: formData.get("opensAt"),
    closesAt: formData.get("closesAt"),
    minReviews: formData.get("minReviews"),
  });
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const label = parsed.data.label?.trim();
  const { error } = await supabase.from("voting_rounds").insert({
    class_id: classId,
    label: label && label.length > 0 ? label : null,
    opens_at: new Date(parsed.data.opensAt).toISOString(),
    closes_at: new Date(parsed.data.closesAt).toISOString(),
    min_reviews_per_student: parsed.data.minReviews,
  });
  if (error) return actionError("평가 기간을 만들 권한이 없거나 저장에 실패했습니다.");
  revalidatePath(`/classes/${classId}/voting`);
  return actionOk(undefined);
}

/** 교사: 평가 기간을 즉시 종료(지금으로 마감). */
export async function endVotingRoundAction(formData: FormData): Promise<ActionResult> {
  const roundId = formData.get("roundId");
  const classId = formData.get("classId");
  if (typeof roundId !== "string") return actionError("잘못된 요청입니다.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("voting_rounds")
    .update({ closes_at: new Date().toISOString() })
    .eq("id", roundId);
  if (error) return actionError("종료에 실패했습니다.");
  if (typeof classId === "string") revalidatePath(`/classes/${classId}/voting`);
  return actionOk(undefined);
}
