import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Card, LinkButton, EmptyState, Badge } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { isTeacher } from "@/lib/permissions/roles";
import { getMyClasses } from "@/features/classes/queries";
import { getRecentMySentences } from "@/features/sentences/queries";

export const metadata: Metadata = { title: "대시보드" };

export default async function DashboardPage() {
  const { profile } = await requireProfile();
  const teacher = isTeacher(profile.role);
  const classes = await getMyClasses();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`안녕하세요, ${profile.display_name}님`}
        description={teacher ? "담당 학급을 관리합니다." : "참여 중인 학급에서 독서 활동을 이어가세요."}
        action={
          teacher ? (
            <LinkButton href="/classes/new">학급 만들기</LinkButton>
          ) : (
            <LinkButton href="/classes/join">학급 참여</LinkButton>
          )
        }
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600">
          {teacher ? "담당 학급" : "참여 중인 학급"}
        </h2>
        {classes.length === 0 ? (
          <EmptyState
            title={teacher ? "아직 만든 학급이 없습니다" : "아직 참여한 학급이 없습니다"}
            description={
              teacher ? "학급을 만들고 참여 코드를 학생에게 공유하세요." : "교사에게 받은 참여 코드로 학급에 참여하세요."
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {classes.map(({ class: c, memberRole }) => (
              <li key={c.id}>
                <Link href={`/classes/${c.id}`} className="block">
                  <Card className="transition hover:border-brand">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-stone-800">{c.name}</p>
                      {memberRole !== "student" ? <Badge>교사</Badge> : null}
                    </div>
                    {c.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-stone-500">{c.description}</p>
                    ) : null}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!teacher ? <RecentSentences /> : null}
    </div>
  );
}

async function RecentSentences() {
  const recent = await getRecentMySentences(5);
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-stone-600">최근 수집한 문장</h2>
      {recent.length === 0 ? (
        <EmptyState title="아직 수집한 문장이 없습니다" description="학급에 들어가 첫 문장을 수집해 보세요." />
      ) : (
        <ul className="space-y-2">
          {recent.map((s) => (
            <li key={s.id}>
              <Link href={`/sentences/${s.id}/edit`}>
                <Card className="transition hover:border-brand">
                  <p className="line-clamp-2 text-sm text-stone-800">“{s.quote}”</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {s.book?.title ?? "도서"} {s.book?.author ? `· ${s.book.author}` : ""}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
