import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * 현재 세션의 인증 사용자 + 프로필을 반환한다. 없으면 null.
 * getUser()로 토큰을 실제 검증한다(getSession 은 위조 가능).
 */
export async function getSessionProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { userId: user.id, email: user.email ?? null, profile };
}

/** 보호 페이지에서 사용: 미로그인 시 /login 으로 리다이렉트. */
export async function requireProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
}> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/onboarding");
  return { userId: session.userId, email: session.email, profile: session.profile };
}
