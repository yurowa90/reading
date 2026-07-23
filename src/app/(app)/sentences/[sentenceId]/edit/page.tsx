import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, Alert, LinkButton } from "@/components/ui";
import { SentenceForm } from "@/components/sentences/sentence-form";
import { DeleteSentenceButton } from "@/components/sentences/delete-sentence-button";
import { requireProfile } from "@/lib/auth/session";
import { getSentence } from "@/features/sentences/queries";
import { getClassBooks } from "@/features/books/queries";

export const metadata: Metadata = { title: "문장 카드 수정" };

export default async function EditSentencePage({
  params,
}: {
  params: Promise<{ sentenceId: string }>;
}) {
  const { sentenceId } = await params;
  const { userId } = await requireProfile();

  const sentence = await getSentence(sentenceId);
  if (!sentence) notFound();

  // 교사도 SELECT 는 되지만 수정은 본인만 가능. 화면에서도 명확히 안내한다.
  if (sentence.user_id !== userId) {
    return (
      <div>
        <PageHeader title="문장 카드" />
        <Alert tone="error">본인이 작성한 문장 카드만 수정할 수 있습니다.</Alert>
        <div className="mt-4">
          <LinkButton href={`/classes/${sentence.class_id}/sentences`} variant="secondary">
            목록으로
          </LinkButton>
        </div>
      </div>
    );
  }

  const books = await getClassBooks(sentence.class_id);

  return (
    <div>
      <PageHeader title="문장 카드 수정" />
      <Card>
        <SentenceForm
          mode="edit"
          classId={sentence.class_id}
          sentenceId={sentence.id}
          books={books.map((b) => ({ id: b.id, title: b.title }))}
          defaultValues={{
            bookId: sentence.book_id,
            quote: sentence.quote,
            pageReference: sentence.page_reference ?? "",
            reason: sentence.reason,
            interpretation: sentence.interpretation,
            question: sentence.question ?? "",
            tagsText: sentence.tags.join(", "),
          }}
        />
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <LinkButton href={`/classes/${sentence.class_id}/sentences`} variant="secondary">
          목록으로
        </LinkButton>
        <DeleteSentenceButton sentenceId={sentence.id} classId={sentence.class_id} />
      </div>
    </div>
  );
}
