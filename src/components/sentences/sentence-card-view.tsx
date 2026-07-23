import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import type { SentenceWithBook } from "@/features/sentences/queries";

/** 문장 카드 표시. editable 이면 수정 링크 노출(본인 카드). */
export function SentenceCardView({
  sentence,
  editable,
  authorName,
}: {
  sentence: SentenceWithBook;
  editable?: boolean;
  authorName?: string;
}) {
  const meta = [sentence.book?.title, sentence.book?.author, sentence.page_reference]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <blockquote className="border-l-4 border-brand-soft pl-3 text-stone-800">
        “{sentence.quote}”
      </blockquote>
      <p className="mt-2 text-xs text-stone-400">
        {meta}
        {authorName ? ` · ${authorName}` : ""}
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="font-semibold text-stone-600">선택한 이유</dt>
          <dd className="text-stone-700">{sentence.reason}</dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-600">나의 해석</dt>
          <dd className="text-stone-700">{sentence.interpretation}</dd>
        </div>
        {sentence.question ? (
          <div>
            <dt className="font-semibold text-stone-600">떠오른 질문</dt>
            <dd className="text-stone-700">{sentence.question}</dd>
          </div>
        ) : null}
      </dl>

      {sentence.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sentence.tags.map((t) => (
            <Badge key={t}>#{t}</Badge>
          ))}
        </div>
      ) : null}

      {editable ? (
        <div className="mt-3">
          <Link
            href={`/sentences/${sentence.id}/edit`}
            className="text-sm font-medium text-brand underline"
          >
            수정·삭제
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
