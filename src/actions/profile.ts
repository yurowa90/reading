"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse({
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  // role 은 열 수준 GRANT 로 갱신이 차단되어 있어 display_name 만 반영된다.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", user.id);

  if (error) return actionError("프로필을 저장하지 못했습니다.");

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return actionOk(undefined);
}
