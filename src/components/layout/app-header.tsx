import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { Badge } from "@/components/ui";
import { isTeacher } from "@/lib/permissions/roles";
import type { Profile } from "@/types/database";

export function AppHeader({ profile }: { profile: Profile }) {
  const teacher = isTeacher(profile.role);
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-base font-bold text-brand">
          책갈피
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="text-stone-600 hover:text-stone-900">
            대시보드
          </Link>
          <Link href="/profile" className="text-stone-600 hover:text-stone-900">
            프로필
          </Link>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="text-stone-500">{profile.display_name}</span>
            {teacher ? <Badge>교사</Badge> : null}
          </span>
          <form action={signOutAction}>
            <button type="submit" className="text-stone-500 underline hover:text-stone-800">
              로그아웃
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
