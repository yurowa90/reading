import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { ReviewForm } from "@/components/works/review-form";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassBooks } from "@/features/books/queries";
import { getMySentences } from "@/features/sentences/queries";

export const metadata: Metadata = { title: "서평 쓰기" };

export default async function NewReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ bookId?: string }>;
}) {
  const { classId } = await params;
  const { bookId } = await searchParams;
  await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  const [books, sentences] = await Promise.all([
    getClassBooks(classId),
    getMySentences(classId),
  ]);

  const defaultBookId = books.some((b) => b.id === bookId) ? bookId : undefined;

  return (
    <div>
      <PageHeader title="서평 쓰기" description={klass.name} />
      <p className="mb-4 text-sm text-stone-500">
        생각이 막힌다면{" "}
        <Link href={`/classes/${classId}/chat`} className="font-medium text-brand underline">
          독서 산파법 대화
        </Link>
        로 먼저 질문을 주고받아 보세요. (AI는 서평을 대신 쓰지 않습니다.)
      </p>
      {books.length === 0 ? (
        <EmptyState title="아직 등록된 도서가 없습니다" description="교사에게 도서 등록을 요청하세요." />
      ) : (
        <Card>
          <ReviewForm
            classId={classId}
            books={books.map((b) => ({ id: b.id, title: b.title }))}
            quotes={sentences.map((s) => ({ id: s.id, quote: s.quote, page: s.page_reference }))}
            defaultValues={defaultBookId ? { bookId: defaultBookId } : undefined}
          />
        </Card>
      )}
    </div>
  );
}
