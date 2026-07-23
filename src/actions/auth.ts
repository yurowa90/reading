"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signUpSchema } from "@/lib/validation/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import { publicEnv } from "@/config/env";

export async function signUpAction(
  _prev: ActionResult<{ needsEmailConfirm: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ needsEmailConfirm: boolean }>> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // 역할은 서버 트리거가 항상 'student' 로 설정한다. 여기서 role 은 넘기지 않는다.
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${publicEnv.appUrl}/dashboard`,
    },
  });

  if (error) {
    return actionError(mapAuthError(error.message));
  }

  // 이메일 인증이 켜져 있으면 session 이 없다.
  const needsEmailConfirm = !data.session;
  return actionOk({ needsEmailConfirm });
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return actionError("입력값을 확인하세요.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return actionError(mapAuthError(error.message));
  }

  const redirectTo = formData.get("redirectTo");
  revalidatePath("/", "layout");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Supabase 인증 오류 메시지를 사용자 친화 한국어로 변환. */
function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("email not confirmed")) return "이메일 인증이 완료되지 않았습니다. 메일함을 확인하세요.";
  if (m.includes("user already registered")) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (m.includes("rate limit")) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.";
}
