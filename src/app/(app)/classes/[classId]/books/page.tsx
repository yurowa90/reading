import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, LinkButton, EmptyState } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassBooks } from "@/features/books/queries";

export const metadata: Metadata = { title: "학급 도서" };

export default async function ClassBooksPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { userId } = await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();
  const isOwnerTeacher = klass.teacher_id === userId;

  const books = await getClassBooks(classId);

  return (
    <div>
      <PageHeader
        title="학급 도서"
        description={klass.name}
        action={
          isOwnerTeacher ? <LinkButton href={`/classes/${classId}/books/new`}>도서 등록</LinkButton> : null
        }
      />
      {books.length === 0 ? (
        <EmptyState
          title="아직 등록된 도서가 없습니다"
          description={isOwnerTeacher ? "도서를 등록하면 학생이 문장을 수집할 수 있습니다." : "교사가 도서를 등록할 때까지 기다려 주세요."}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {books.map((b) => (
            <li key={b.id}>
              <Card>
                <div className="flex gap-3">
                  {b.cover_url ? (
                    // 외부 임의 호스트 URL 이므로 일반 img 사용(next.config 참고)
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.cover_url}
                      alt=""
                      className="h-20 w-14 flex-shrink-0 rounded object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800">{b.title}</p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {[b.author, b.publisher].filter(Boolean).join(" · ") || "정보 없음"}
                    </p>
                    {b.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-stone-400">{b.description}</p>
                    ) : null}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
