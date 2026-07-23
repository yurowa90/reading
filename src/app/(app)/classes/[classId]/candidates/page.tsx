import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Alert, EmptyState, Badge } from "@/components/ui";
import { CandidateActions } from "@/components/ranking/candidate-actions";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getActiveVotingRound } from "@/features/engagement/queries";
import { getCandidateBoard } from "@/features/ranking/queries";
import { MIN_CANDIDATE_RATINGS } from "@/lib/ranking/candidates";

export const metadata: Metadata = { title: "우수작 후보" };

export default async function CandidatesPage({
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
        <PageHeader title="우수작 후보" />
        <Alert tone="error">담당 교사만 접근할 수 있습니다.</Alert>
      </div>
    );
  }

  const [rows, activeRound] = await Promise.all([
    getCandidateBoard(classId),
    getActiveVotingRound(classId),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="동료평가 기반 우수작 후보"
        description={`${klass.name} · 좋아요·별점을 베이지안 보정으로 계산한 추천입니다(자동 확정 아님).`}
      />

      {activeRound ? (
        <Alert tone="error">
          평가 기간이 진행 중입니다. 기간이 끝난 뒤 확정하는 것을 권장합니다(현재 집계는 잠정값).
        </Alert>
      ) : null}

      <p className="text-xs text-stone-500">
        후보는 최소 {MIN_CANDIDATE_RATINGS}명 이상 평가한 작품 중 상위 20%입니다. 최종 우수작은
        교사가 루브릭으로 평가한 뒤 직접 선정합니다.
      </p>

      {rows.length === 0 ? (
        <EmptyState title="게시된 작품이 없습니다" description="작품이 게시되면 후보가 계산됩니다." />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ work, authorName, score, rubricTotal, rubricCriteria, featured }) => (
            <li key={work.id}>
              <Card className={score.isCandidate ? "border-emerald-300" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {score.isCandidate ? <Badge>후보 #{score.rank}</Badge> : null}
                      {featured ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          ★ 우수작
                        </span>
                      ) : null}
                      <Link href={`/works/${work.id}`} className="font-semibold text-stone-800 underline">
                        {work.title || (work.kind === "review" ? "(제목 없는 서평)" : "북포스터")}
                      </Link>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {authorName} · {work.book?.title ?? ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-stone-500">
                    <p>후보 점수 {score.peerScore.toFixed(3)}</p>
                    <p>
                      별점 {score.ratingCount > 0 ? score.ratingAvg.toFixed(1) : "-"} ({score.ratingCount}명)
                      · 보정 {score.bayesianRating.toFixed(2)}
                    </p>
                    <p>
                      좋아요 {score.likeCount}
                      {rubricTotal !== null ? ` · 루브릭 ${rubricTotal}` : ""}
                    </p>
                    {!score.eligible ? (
                      <p className="text-amber-600">평가 {MIN_CANDIDATE_RATINGS}명 미만</p>
                    ) : null}
                  </div>
                </div>
                <CandidateActions
                  classId={classId}
                  workId={work.id}
                  featured={featured}
                  rubric={rubricCriteria}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
