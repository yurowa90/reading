import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, LinkButton, Alert, Badge } from "@/components/ui";
import { WorkView } from "@/components/works/work-view";
import { SubmitWorkButton, DeleteWorkButton } from "@/components/works/owner-actions";
import { TeacherReviewActions } from "@/components/works/teacher-review-actions";
import { requireProfile } from "@/lib/auth/session";
import { getWork } from "@/features/works/queries";
import { getClass } from "@/features/classes/queries";
import { getSignedPosterUrl } from "@/features/works/posters";
import { statusLabel, isEditableByOwner } from "@/lib/works/status";

export const metadata: Metadata = { title: "작품" };

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId } = await params;
  const { userId } = await requireProfile();

  const work = await getWork(workId);
  if (!work) notFound();

  const klass = await getClass(work.class_id);
  const isOwner = work.user_id === userId;
  const isTeacher = klass?.teacher_id === userId;

  const posterUrl = work.kind === "poster" ? await getSignedPosterUrl(work.poster_path) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={work.kind === "review" ? "서평" : "북포스터"}
        action={
          <LinkButton href={`/classes/${work.class_id}/works`} variant="secondary">
            내 작품
          </LinkButton>
        }
      />

      {(isOwner || isTeacher) && (
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Badge>{statusLabel(work.status)}</Badge>
          {work.status === "rejected" && work.review_note ? (
            <span className="text-red-600">반려 사유: {work.review_note}</span>
          ) : null}
        </div>
      )}

      <WorkView work={work} posterUrl={posterUrl} authorName={isTeacher ? work.authorName : undefined} />

      {isOwner && isEditableByOwner(work.status) ? (
        <Card>
          <p className="mb-2 text-sm font-medium text-stone-700">내 작품 관리</p>
          <div className="flex flex-wrap gap-2">
            {work.kind === "review" ? (
              <Link
                href={`/works/${work.id}/edit`}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                수정
              </Link>
            ) : null}
            <SubmitWorkButton workId={work.id} />
            <DeleteWorkButton workId={work.id} classId={work.class_id} />
          </div>
        </Card>
      ) : null}

      {isTeacher && !isOwner && (work.status === "submitted" || work.status === "published") ? (
        <Card>
          <p className="mb-2 text-sm font-medium text-stone-700">교사 검토</p>
          <TeacherReviewActions workId={work.id} status={work.status} />
        </Card>
      ) : null}

      {work.status === "published" && !isOwner && !isTeacher ? (
        <Alert tone="success">학급 갤러리에 게시된 작품입니다.</Alert>
      ) : null}
    </div>
  );
}
