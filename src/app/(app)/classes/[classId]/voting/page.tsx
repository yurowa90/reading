import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Card, Alert, EmptyState, Badge } from "@/components/ui";
import { VotingRoundForm, EndRoundButton } from "@/components/voting/voting-round-form";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassVotingRounds } from "@/features/engagement/queries";

export const metadata: Metadata = { title: "상호평가 기간" };

function fmt(iso: string): string {
  // 서버에서 고정 표기(로케일 영향 최소화)
  return iso.replace("T", " ").slice(0, 16);
}

export default async function VotingPage({
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
        <PageHeader title="상호평가 기간" />
        <Alert tone="error">담당 교사만 설정할 수 있습니다.</Alert>
      </div>
    );
  }

  const rounds = await getClassVotingRounds(classId);
  const nowMs = Date.now();

  return (
    <div className="space-y-6">
      <PageHeader
        title="상호평가 기간"
        description={`${klass.name} · 평가 기간 동안만 좋아요·별점을 받을 수 있고, 기간 중 집계는 비공개됩니다.`}
      />

      <Card>
        <p className="mb-3 text-sm font-semibold text-stone-700">새 평가 기간</p>
        <VotingRoundForm classId={classId} />
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600">설정된 평가 기간</h2>
        {rounds.length === 0 ? (
          <EmptyState title="설정된 평가 기간이 없습니다" />
        ) : (
          <ul className="space-y-2">
            {rounds.map((r) => {
              const open = nowMs >= Date.parse(r.opens_at) && nowMs < Date.parse(r.closes_at);
              const ended = nowMs >= Date.parse(r.closes_at);
              return (
                <li key={r.id}>
                  <Card>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-800">{r.label ?? "평가 기간"}</span>
                          {open ? (
                            <Badge>진행 중</Badge>
                          ) : ended ? (
                            <span className="text-xs text-stone-400">종료됨</span>
                          ) : (
                            <span className="text-xs text-stone-400">예정</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {fmt(r.opens_at)} ~ {fmt(r.closes_at)}
                          {r.min_reviews_per_student > 0
                            ? ` · 최소 ${r.min_reviews_per_student}작품 평가`
                            : ""}
                        </p>
                      </div>
                      {open ? <EndRoundButton roundId={r.id} classId={classId} /> : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
