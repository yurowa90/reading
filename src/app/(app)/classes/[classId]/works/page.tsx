import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, LinkButton, EmptyState, Badge } from "@/components/ui";
import { SubmitWorkButton, DeleteWorkButton } from "@/components/works/owner-actions";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getMyWorks } from "@/features/works/queries";
import { statusLabel, isEditableByOwner } from "@/lib/works/status";

export const metadata: Metadata = { title: "내 작품" };

export default async function WorksPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { userId } = await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();
  const isOwnerTeacher = klass.teacher_id === userId;

  const works = await getMyWorks(classId);

  return (
    <div>
      <PageHeader
        title="내 작품"
        description={klass.name}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/classes/${classId}/works/reviews/new`}>서평 쓰기</LinkButton>
            <LinkButton href={`/classes/${classId}/works/posters/new`} variant="secondary">
              포스터 올리기
            </LinkButton>
          </div>
        }
      />

      {isOwnerTeacher ? (
        <p className="mb-4 text-sm text-stone-500">
          교사 계정입니다. 학생 작품 검토는{" "}
          <Link href={`/classes/${classId}/pending`} className="underline">
            검토 큐
          </Link>
          , 게시된 작품은{" "}
          <Link href={`/classes/${classId}/gallery`} className="underline">
            갤러리
          </Link>
          에서 확인하세요.
        </p>
      ) : null}

      {works.length === 0 ? (
        <EmptyState
          title="아직 작성한 작품이 없습니다"
          description="서평을 쓰거나 북포스터를 올려 보세요. 제출하면 교사 승인 후 갤러리에 공개됩니다."
        />
      ) : (
        <ul className="space-y-3">
          {works.map((w) => (
            <li key={w.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge>{w.kind === "review" ? "서평" : "북포스터"}</Badge>
                      <span className="text-sm text-stone-500">{statusLabel(w.status)}</span>
                    </div>
                    <p className="mt-1 font-semibold text-stone-800">
                      {w.title || (w.kind === "review" ? "(제목 없는 서평)" : "북포스터")}
                    </p>
                    <p className="text-xs text-stone-400">{w.book?.title ?? ""}</p>
                    {w.status === "rejected" && w.review_note ? (
                      <p className="mt-1 text-xs text-red-600">반려 사유: {w.review_note}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/works/${w.id}`}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      보기
                    </Link>
                    {isEditableByOwner(w.status) && w.kind === "review" ? (
                      <Link
                        href={`/works/${w.id}/edit`}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                      >
                        수정
                      </Link>
                    ) : null}
                    {isEditableByOwner(w.status) ? <SubmitWorkButton workId={w.id} /> : null}
                    {isEditableByOwner(w.status) ? (
                      <DeleteWorkButton workId={w.id} classId={classId} />
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
