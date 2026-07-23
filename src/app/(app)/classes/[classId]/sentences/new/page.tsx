import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, EmptyState, LinkButton } from "@/components/ui";
import { SentenceForm } from "@/components/sentences/sentence-form";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassBooks } from "@/features/books/queries";

export const metadata: Metadata = { title: "문장 수집" };

export default async function NewSentencePage({
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
      <PageHeader title="문장 수집" description={klass.name} />
      {books.length === 0 ? (
        <EmptyState
          title="아직 등록된 도서가 없습니다"
          description="문장을 수집하려면 학급에 도서가 있어야 합니다. 교사에게 도서 등록을 요청하세요."
        />
      ) : (
        <Card>
          <SentenceForm
            mode="create"
            classId={classId}
            books={books.map((b) => ({ id: b.id, title: b.title }))}
          />
        </Card>
      )}
      <div className="mt-4">
        <LinkButton href={`/classes/${classId}/sentences`} variant="secondary">
          목록으로
        </LinkButton>
      </div>
    </div>
  );
}
