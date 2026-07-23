import type { Metadata } from "next";
import { PageHeader, Card, Alert } from "@/components/ui";
import { CreateClassForm } from "@/components/classes/create-class-form";
import { requireProfile } from "@/lib/auth/session";
import { isTeacher } from "@/lib/permissions/roles";

export const metadata: Metadata = { title: "학급 만들기" };

export default async function NewClassPage() {
  const { profile } = await requireProfile();
  // 화면 숨김이 아니라 실제 권한으로 안내. 생성 시도 자체는 RLS 가 최종 차단한다.
  if (!isTeacher(profile.role)) {
    return (
      <div>
        <PageHeader title="학급 만들기" />
        <Alert tone="error">
          학급 생성은 교사 계정만 가능합니다. 교사 권한이 필요하면 관리자에게 문의하세요.
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="학급 만들기" description="학급을 만들면 참여 코드가 발급됩니다." />
      <Card>
        <CreateClassForm />
      </Card>
    </div>
  );
}
