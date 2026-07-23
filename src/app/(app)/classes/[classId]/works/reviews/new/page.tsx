import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { ReviewForm } from "@/components/works/review-form";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassBooks } from "@/features/books/queries";
import { getMySentences } from "@/features/sentences/queries";

export const metadata: Metadata = { title: "서평 쓰기" };

export default async function NewReviewPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  const [books, sentences] = await Promise.all([
    getClassBooks(classId),
    getMySentences(classId),
  ]);

  return (
    <div>
      <PageHeader title="서평 쓰기" description={klass.name} />
      {books.length === 0 ? (
        <EmptyState title="아직 등록된 도서가 없습니다" description="교사에게 도서 등록을 요청하세요." />
      ) : (
        <Card>
          <ReviewForm
            classId={classId}
            books={books.map((b) => ({ id: b.id, title: b.title }))}
            quotes={sentences.map((s) => ({ id: s.id, quote: s.quote, page: s.page_reference }))}
          />
        </Card>
      )}
    </div>
  );
}
