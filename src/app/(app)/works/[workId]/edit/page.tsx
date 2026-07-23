import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, Alert, LinkButton } from "@/components/ui";
import { ReviewForm } from "@/components/works/review-form";
import { requireProfile } from "@/lib/auth/session";
import { getWork } from "@/features/works/queries";
import { getClassBooks } from "@/features/books/queries";
import { getMySentences } from "@/features/sentences/queries";
import { isEditableByOwner } from "@/lib/works/status";

export const metadata: Metadata = { title: "서평 수정" };

export default async function EditWorkPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId } = await params;
  const { userId } = await requireProfile();

  const work = await getWork(workId);
  if (!work) notFound();

  if (work.user_id !== userId) {
    return (
      <div>
        <PageHeader title="작품 수정" />
        <Alert tone="error">본인이 작성한 작품만 수정할 수 있습니다.</Alert>
      </div>
    );
  }

  if (!isEditableByOwner(work.status)) {
    return (
      <div>
        <PageHeader title="작품 수정" />
        <Alert tone="error">제출됐거나 게시된 작품은 수정할 수 없습니다.</Alert>
        <div className="mt-4">
          <LinkButton href={`/works/${work.id}`} variant="secondary">
            작품 보기
          </LinkButton>
        </div>
      </div>
    );
  }

  if (work.kind === "poster") {
    return (
      <div>
        <PageHeader title="북포스터 수정" />
        <Alert tone="error">
          포스터 이미지는 수정할 수 없습니다. 삭제 후 새 포스터를 올려 주세요.
        </Alert>
        <div className="mt-4 flex gap-2">
          <LinkButton href={`/works/${work.id}`} variant="secondary">
            작품 보기
          </LinkButton>
          <LinkButton href={`/classes/${work.class_id}/works/posters/new`}>새 포스터</LinkButton>
        </div>
      </div>
    );
  }

  const [books, sentences] = await Promise.all([
    getClassBooks(work.class_id),
    getMySentences(work.class_id),
  ]);

  return (
    <div>
      <PageHeader title="서평 수정" />
      <Card>
        <ReviewForm
          classId={work.class_id}
          workId={work.id}
          books={books.map((b) => ({ id: b.id, title: b.title }))}
          quotes={sentences.map((s) => ({ id: s.id, quote: s.quote, page: s.page_reference }))}
          defaultValues={{
            bookId: work.book_id,
            mode: work.mode ?? "structured",
            title: work.title ?? "",
            body: work.body ?? "",
            sections: work.sections ?? undefined,
          }}
        />
      </Card>
    </div>
  );
}
