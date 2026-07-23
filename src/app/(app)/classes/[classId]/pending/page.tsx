import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, Alert, EmptyState } from "@/components/ui";
import { WorkView } from "@/components/works/work-view";
import { TeacherReviewActions } from "@/components/works/teacher-review-actions";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getSubmittedWorks } from "@/features/works/queries";
import { getSignedPosterUrl } from "@/features/works/posters";

export const metadata: Metadata = { title: "검토 큐" };

export default async function PendingPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { userId } = await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  if (klass.teacher_id !== userId) {
    return (
      <div>
        <PageHeader title="검토 큐" />
        <Alert tone="error">담당 교사만 접근할 수 있습니다.</Alert>
      </div>
    );
  }

  const works = await getSubmittedWorks(classId);
  const withUrls = await Promise.all(
    works.map(async (w) => ({
      work: w,
      posterUrl: w.kind === "poster" ? await getSignedPosterUrl(w.poster_thumb_path) : null,
    })),
  );

  return (
    <div>
      <PageHeader
        title="검토 큐"
        description={`${klass.name} · 제출된 작품 ${works.length}건`}
      />
      {works.length === 0 ? (
        <EmptyState title="검토할 제출물이 없습니다" description="학생이 작품을 제출하면 여기에 표시됩니다." />
      ) : (
        <ul className="space-y-4">
          {withUrls.map(({ work, posterUrl }) => (
            <li key={work.id} className="space-y-2">
              <WorkView work={work} posterUrl={posterUrl} authorName={work.authorName} />
              <Card>
                <TeacherReviewActions workId={work.id} status="submitted" />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
