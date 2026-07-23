import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/auth/session";
import { signOutAction } from "@/actions/auth";

export const metadata: Metadata = { title: "프로필 준비" };

/**
 * 정상 흐름에서는 회원가입 시 트리거가 프로필을 생성하므로 이 화면을 거의 보지 않는다.
 * 프로필이 없는 예외 상황을 위한 안내 페이지.
 */
export default async function OnboardingPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="text-xl font-bold text-stone-800">프로필을 준비하지 못했습니다</h1>
      <p className="mt-3 text-sm text-stone-600">
        계정 프로필 생성이 완료되지 않았습니다. 잠시 후{" "}
        <Link href="/dashboard" className="underline">
          다시 시도
        </Link>
        하거나, 문제가 계속되면 담당 교사·관리자에게 문의하세요.
      </p>
      <form action={signOutAction} className="mt-6">
        <button type="submit" className="text-sm text-stone-500 underline">
          로그아웃
        </button>
      </form>
    </main>
  );
}
