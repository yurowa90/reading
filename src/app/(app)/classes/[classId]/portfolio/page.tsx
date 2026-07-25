import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Alert, EmptyState, Badge } from "@/components/ui";
import { PrintButton } from "@/components/layout/print-button";
import { SentenceCardView } from "@/components/sentences/sentence-card-view";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getStudentPortfolio } from "@/features/portfolio/queries";
import { statusLabel } from "@/lib/works/status";

export const metadata: Metadata = { title: "독서 포트폴리오" };

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { classId } = await params;
  const { userId: targetParam } = await searchParams;
  const { userId } = await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  const isOwnerTeacher = klass.teacher_id === userId;
  const targetUserId = targetParam ?? userId;

  // 남의 포트폴리오는 담당 교사만 열람 가능.
  if (targetUserId !== userId && !isOwnerTeacher) {
    return (
      <div>
        <PageHeader title="독서 포트폴리오" />
        <Alert tone="error">본인 또는 담당 교사만 열람할 수 있습니다.</Alert>
      </div>
    );
  }

  const portfolio = await getStudentPortfolio(classId, targetUserId);
  if (!portfolio) notFound();

  const stats = [
    { label: "수집 문장", value: portfolio.sentenceCount },
    { label: "게시 작품", value: portfolio.publishedCount },
    { label: "우수작", value: portfolio.featuredCount },
    { label: "산파법 대화", value: portfolio.chatCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="독서 포트폴리오"
        description={`${klass.name} · ${portfolio.displayName}`}
        action={<PrintButton />}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="text-center">
            <p className="text-2xl font-bold text-stone-800">{s.value}</p>
            <p className="mt-1 text-xs text-stone-500">{s.label}</p>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600">작품 ({portfolio.works.length})</h2>
        {portfolio.works.length === 0 ? (
          <EmptyState title="아직 작품이 없습니다" />
        ) : (
          <ul className="space-y-2">
            {portfolio.works.map((w) => (
              <li key={w.id}>
                <Card>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge>{w.kind === "review" ? "서평" : "북포스터"}</Badge>
                      <Link href={`/works/${w.id}`} className="font-medium text-stone-800 underline">
                        {w.title || (w.kind === "review" ? "(제목 없는 서평)" : "북포스터")}
                      </Link>
                      {w.featured_at ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          ★ 우수작
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-stone-400">{statusLabel(w.status)}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">{w.book?.title ?? ""}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600">
          수집한 문장 ({portfolio.sentenceCount})
        </h2>
        {portfolio.sentences.length === 0 ? (
          <EmptyState title="아직 수집한 문장이 없습니다" />
        ) : (
          <ul className="space-y-3">
            {portfolio.sentences.map((s) => (
              <li key={s.id}>
                <SentenceCardView sentence={{ ...s, book: s.book ? { ...s.book, author: null } : null }} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
