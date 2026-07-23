import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, Alert } from "@/components/ui";
import { CreateBookForm } from "@/components/books/create-book-form";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";

export const metadata: Metadata = { title: "도서 등록" };

export default async function NewBookPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { userId } = await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  if (klass.teacher_id !== userId) {
    return (
      <div>
        <PageHeader title="도서 등록" />
        <Alert tone="error">도서 등록은 담당 교사만 가능합니다.</Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="도서 등록" description={klass.name} />
      <Card>
        <CreateBookForm classId={classId} />
      </Card>
    </div>
  );
}
