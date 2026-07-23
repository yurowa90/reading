import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { PosterUploadForm } from "@/components/works/poster-upload-form";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassBooks } from "@/features/books/queries";

export const metadata: Metadata = { title: "북포스터 올리기" };

export default async function NewPosterPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  const books = await getClassBooks(classId);

  return (
    <div>
      <PageHeader title="북포스터 올리기" description={klass.name} />
      {books.length === 0 ? (
        <EmptyState title="아직 등록된 도서가 없습니다" description="교사에게 도서 등록을 요청하세요." />
      ) : (
        <Card>
          <PosterUploadForm classId={classId} books={books.map((b) => ({ id: b.id, title: b.title }))} />
        </Card>
      )}
    </div>
  );
}
