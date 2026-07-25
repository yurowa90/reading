import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Alert, EmptyState } from "@/components/ui";
import { PrintButton } from "@/components/layout/print-button";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassDashboard } from "@/features/dashboard/queries";

export const metadata: Metadata = { title: "학급 대시보드" };

export default async function ClassDashboardPage({
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
        <PageHeader title="학급 대시보드" />
        <Alert tone="error">담당 교사만 접근할 수 있습니다.</Alert>
      </div>
    );
  }

  const d = await getClassDashboard(classId);

  const cards = [
    { label: "학생", value: d.studentCount },
    { label: "수집 문장", value: d.sentenceTotal },
    { label: "검토 대기", value: d.statusCounts.submitted },
    { label: "게시 작품", value: d.publishedTotal },
    { label: "우수작", value: d.featuredTotal },
    { label: "산파법 대화", value: d.chatSessionTotal },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="학급 대시보드" description={klass.name} action={<PrintButton />} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="text-center">
            <p className="text-2xl font-bold text-stone-800">{c.value}</p>
            <p className="mt-1 text-xs text-stone-500">{c.label}</p>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600">학생별 참여</h2>
        {d.participation.length === 0 ? (
          <EmptyState title="아직 참여한 학생이 없습니다" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="px-3 py-2 font-medium">학생</th>
                  <th className="px-3 py-2 text-right font-medium">문장</th>
                  <th className="px-3 py-2 text-right font-medium">제출</th>
                  <th className="px-3 py-2 text-right font-medium">게시</th>
                  <th className="px-3 py-2 text-right font-medium">댓글</th>
                  <th className="px-3 py-2 font-medium">포트폴리오</th>
                </tr>
              </thead>
              <tbody>
                {d.participation.map((p) => (
                  <tr key={p.userId} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-2 text-stone-800">{p.displayName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.sentenceCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.submittedCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.publishedCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.commentCount}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/classes/${classId}/portfolio?userId=${p.userId}`}
                        className="no-print text-brand underline"
                      >
                        보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
