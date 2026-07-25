import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, LinkButton, Alert, EmptyState, Badge } from "@/components/ui";
import { JoinCodeCard } from "@/components/classes/join-code-card";
import { requireProfile } from "@/lib/auth/session";
import { getClass, getClassMembers } from "@/features/classes/queries";
import { getClassBooks } from "@/features/books/queries";

export const metadata: Metadata = { title: "학급" };

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { classId } = await params;
  const { created } = await searchParams;
  const { userId } = await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  const isOwnerTeacher = klass.teacher_id === userId;
  const [books, members] = await Promise.all([
    getClassBooks(classId),
    isOwnerTeacher ? getClassMembers(classId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={klass.name}
        description={klass.description ?? undefined}
        action={
          isOwnerTeacher ? (
            <LinkButton href={`/classes/${classId}/books/new`}>도서 등록</LinkButton>
          ) : (
            <LinkButton href={`/classes/${classId}/sentences/new`}>문장 수집</LinkButton>
          )
        }
      />

      {created ? <Alert tone="success">학급을 만들었습니다. 아래 참여 코드를 학생에게 공유하세요.</Alert> : null}

      {isOwnerTeacher ? <JoinCodeCard code={klass.join_code} /> : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href={`/classes/${classId}/books`}>
          <Card className="transition hover:border-brand">
            <p className="font-semibold text-stone-800">학급 도서</p>
            <p className="mt-1 text-sm text-stone-500">{books.length}권 등록됨</p>
          </Card>
        </Link>
        <Link href={`/classes/${classId}/sentences`}>
          <Card className="transition hover:border-brand">
            <p className="font-semibold text-stone-800">문장 수집</p>
            <p className="mt-1 text-sm text-stone-500">
              {isOwnerTeacher ? "학생 문장 기록 확인" : "내 문장 카드 보기·쓰기"}
            </p>
          </Card>
        </Link>
        {isOwnerTeacher ? (
          <Link href={`/classes/${classId}/pending`}>
            <Card className="transition hover:border-brand">
              <p className="font-semibold text-stone-800">검토 큐</p>
              <p className="mt-1 text-sm text-stone-500">제출된 서평·포스터 게시 승인</p>
            </Card>
          </Link>
        ) : (
          <Link href={`/classes/${classId}/works`}>
            <Card className="transition hover:border-brand">
              <p className="font-semibold text-stone-800">내 작품</p>
              <p className="mt-1 text-sm text-stone-500">서평 쓰기·북포스터 올리기</p>
            </Card>
          </Link>
        )}
        <Link href={`/classes/${classId}/gallery`}>
          <Card className="transition hover:border-brand">
            <p className="font-semibold text-stone-800">학급 갤러리</p>
            <p className="mt-1 text-sm text-stone-500">게시된 작품 감상 (학급 내부)</p>
          </Card>
        </Link>
        {!isOwnerTeacher ? (
          <>
            <Link href={`/classes/${classId}/chat`}>
              <Card className="transition hover:border-brand">
                <p className="font-semibold text-stone-800">독서 산파법 대화</p>
                <p className="mt-1 text-sm text-stone-500">AI와 질문을 주고받으며 생각 넓히기</p>
              </Card>
            </Link>
            <Link href={`/classes/${classId}/portfolio`}>
              <Card className="transition hover:border-brand">
                <p className="font-semibold text-stone-800">내 독서 포트폴리오</p>
                <p className="mt-1 text-sm text-stone-500">내 문장·작품·대화 여정 (인쇄/PDF)</p>
              </Card>
            </Link>
          </>
        ) : null}
        {isOwnerTeacher ? (
          <>
            <Link href={`/classes/${classId}/dashboard`}>
              <Card className="transition hover:border-brand">
                <p className="font-semibold text-stone-800">학급 대시보드</p>
                <p className="mt-1 text-sm text-stone-500">참여 통계·학생별 활동 (인쇄/PDF)</p>
              </Card>
            </Link>
            <Link href={`/classes/${classId}/voting`}>
              <Card className="transition hover:border-brand">
                <p className="font-semibold text-stone-800">상호평가 기간</p>
                <p className="mt-1 text-sm text-stone-500">평가 기간 설정·종료</p>
              </Card>
            </Link>
            <Link href={`/classes/${classId}/reports`}>
              <Card className="transition hover:border-brand">
                <p className="font-semibold text-stone-800">신고 처리</p>
                <p className="mt-1 text-sm text-stone-500">신고된 댓글 검토·숨김</p>
              </Card>
            </Link>
            <Link href={`/classes/${classId}/candidates`}>
              <Card className="transition hover:border-brand">
                <p className="font-semibold text-stone-800">우수작 후보</p>
                <p className="mt-1 text-sm text-stone-500">동료평가 점수·루브릭·최종 선정</p>
              </Card>
            </Link>
          </>
        ) : null}
      </section>

      {isOwnerTeacher ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-600">구성원 ({members.length})</h2>
          {members.length === 0 ? (
            <EmptyState title="아직 참여한 학생이 없습니다" />
          ) : (
            <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-stone-800">{m.displayName}</span>
                  {m.memberRole !== "student" ? <Badge>교사</Badge> : <span className="text-xs text-stone-400">학생</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
