"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClassSchema, joinClassSchema } from "@/lib/validation/class";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import type { ClassRow } from "@/types/database";

export async function createClassAction(
  _prev: ActionResult<{ classId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ classId: string }>> {
  const parsed = createClassSchema.safeParse({
    name: formData.get("name"),
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

  // teacher_id 는 항상 현재 사용자. join_code 는 트리거가 생성한다.
  // 교사 권한이 없으면 RLS 의 classes_insert_teacher 정책이 거부한다.
  const description = parsed.data.description?.trim();
  const { data, error } = await supabase
    .from("classes")
    .insert({
      name: parsed.data.name,
      teacher_id: user.id,
      description: description && description.length > 0 ? description : null,
    })
    .select("id")
    .single<Pick<ClassRow, "id">>();

  if (error || !data) {
    return actionError("학급을 생성할 권한이 없거나 저장에 실패했습니다. 교사 계정인지 확인하세요.");
  }

  revalidatePath("/dashboard");
  return actionOk({ classId: data.id });
}

export type JoinOutcome =
  | { status: "joined"; classId: string; className: string }
  | { status: "already_member"; classId: string; className: string };

export async function joinClassAction(
  _prev: ActionResult<JoinOutcome> | null,
  formData: FormData,
): Promise<ActionResult<JoinOutcome>> {
  const parsed = joinClassSchema.safeParse({ joinCode: formData.get("joinCode") });
  if (!parsed.success) {
    return actionError("참여 코드를 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  // 클라이언트가 classes 를 직접 검색하지 않는다. RPC 가 코드 검증과 가입을 처리한다.
  const { data, error } = await supabase.rpc("join_class_with_code", {
    p_code: parsed.data.joinCode,
  });

  if (error) {
    return actionError("학급 가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.");
  }

  const result = data as {
    status: string;
    class_id?: string;
    class_name?: string;
  };

  switch (result.status) {
    case "joined":
      revalidatePath("/dashboard");
      return actionOk({
        status: "joined",
        classId: result.class_id ?? "",
        className: result.class_name ?? "",
      });
    case "already_member":
      return actionOk({
        status: "already_member",
        classId: result.class_id ?? "",
        className: result.class_name ?? "",
      });
    case "unauthenticated":
      return actionError("로그인이 필요합니다.");
    case "invalid":
    default:
      // 학급 존재 여부/교사 정보를 노출하지 않는다.
      return actionError("유효하지 않은 참여 코드입니다.");
  }
}
