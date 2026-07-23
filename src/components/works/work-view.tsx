import { Card, Badge } from "@/components/ui";
import { SECTION_LABELS } from "@/lib/validation/work";
import type { ReviewSections, WorkKind } from "@/types/database";
import type { WorkWithBook } from "@/features/works/queries";

const SECTION_ORDER: (keyof ReviewSections)[] = [
  "one_line",
  "key_problem",
  "impressive_sentence",
  "author_judgment",
  "disagreement",
  "connection",
  "final_evaluation",
];

function kindLabel(kind: WorkKind): string {
  return kind === "review" ? "서평" : "북포스터";
}

/** 작품 본문 표시. 포스터 이미지는 서버가 생성한 서명 URL(posterUrl)을 받는다. */
export function WorkView({
  work,
  posterUrl,
  authorName,
}: {
  work: WorkWithBook;
  posterUrl?: string | null;
  authorName?: string;
}) {
  const meta = [work.book?.title, work.book?.author].filter(Boolean).join(" · ");

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <Badge>{kindLabel(work.kind)}</Badge>
        {work.title ? <span className="font-semibold text-stone-800">{work.title}</span> : null}
      </div>
      <p className="text-xs text-stone-400">
        {meta}
        {authorName ? ` · ${authorName}` : ""}
      </p>

      {work.kind === "poster" ? (
        <div className="mt-3">
          {posterUrl ? (
            // 서명 URL(임의 외부 경로) → 일반 img
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt={work.title ? `${work.title} 북포스터` : "북포스터"}
              className="mx-auto max-h-[70vh] w-auto rounded-lg border border-stone-200"
            />
          ) : (
            <p className="text-sm text-stone-400">이미지를 불러올 수 없습니다.</p>
          )}
        </div>
      ) : work.mode === "free" ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-800">{work.body}</p>
      ) : (
        <dl className="mt-3 space-y-3 text-sm">
          {SECTION_ORDER.map((key, i) => {
            const value = work.sections?.[key];
            if (!value || value.trim().length === 0) return null;
            return (
              <div key={key}>
                <dt className="font-semibold text-stone-600">
                  {i + 1}. {SECTION_LABELS[key]}
                </dt>
                <dd className="whitespace-pre-wrap text-stone-700">{value}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </Card>
  );
}
