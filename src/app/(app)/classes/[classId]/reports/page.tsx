import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Alert, EmptyState } from "@/components/ui";
import { ReportActions } from "@/components/comments/report-actions";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getOpenReports } from "@/features/comments/queries";

export const metadata: Metadata = { title: "신고 처리" };

export default async function ReportsPage({
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
        <PageHeader title="신고 처리" />
        <Alert tone="error">담당 교사만 접근할 수 있습니다.</Alert>
      </div>
    );
  }

  const reports = await getOpenReports(classId);

  return (
    <div>
      <PageHeader title="신고 처리" description={`${klass.name} · 미처리 신고 ${reports.length}건`} />
      {reports.length === 0 ? (
        <EmptyState title="미처리 신고가 없습니다" />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.reportId}>
              <Card>
                <p className="whitespace-pre-wrap text-sm text-stone-800">“{r.commentBody}”</p>
                <p className="mt-1 text-xs text-stone-500">
                  신고자: {r.reporterName}
                  {r.reason ? ` · 사유: ${r.reason}` : ""}
                  {r.commentHidden ? " · (현재 숨김)" : ""}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <Link href={`/works/${r.workId}`} className="text-xs text-brand underline">
                    작품에서 보기
                  </Link>
                  <ReportActions
                    reportId={r.reportId}
                    commentId={r.commentId}
                    workId={r.workId}
                    classId={classId}
                    commentHidden={r.commentHidden}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
