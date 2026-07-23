import type { Metadata } from "next";
import { PageHeader, Card, Badge } from "@/components/ui";
import { ProfileForm } from "@/components/auth/profile-form";
import { requireProfile } from "@/lib/auth/session";
import { isTeacher } from "@/lib/permissions/roles";

export const metadata: Metadata = { title: "프로필" };

export default async function ProfilePage() {
  const { profile, email } = await requireProfile();

  return (
    <div>
      <PageHeader title="내 프로필" description="공개 이름을 관리합니다." />
      <div className="space-y-4">
        <Card>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <dt className="text-stone-500">이메일</dt>
            <dd className="col-span-2 text-stone-800">{email ?? "-"}</dd>
            <dt className="text-stone-500">역할</dt>
            <dd className="col-span-2">
              {isTeacher(profile.role) ? <Badge>교사</Badge> : <Badge>학생</Badge>}
              <p className="mt-1 text-xs text-stone-400">
                역할은 본인이 변경할 수 없습니다. 교사 권한은 관리자가 부여합니다.
              </p>
            </dd>
          </dl>
        </Card>
        <Card>
          <ProfileForm defaultName={profile.display_name} />
        </Card>
      </div>
    </div>
  );
}
