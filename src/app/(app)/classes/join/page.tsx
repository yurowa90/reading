import type { Metadata } from "next";
import { PageHeader, Card } from "@/components/ui";
import { JoinClassForm } from "@/components/classes/join-class-form";
import { requireProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "학급 참여" };

export default async function JoinClassPage() {
  await requireProfile();
  return (
    <div>
      <PageHeader title="학급 참여" description="교사에게 받은 참여 코드를 입력하세요." />
      <Card>
        <JoinClassForm />
      </Card>
    </div>
  );
}
