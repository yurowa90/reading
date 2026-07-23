import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { StartChatForm } from "@/components/chat/start-chat-form";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassBooks } from "@/features/books/queries";
import { getMyChatSessions } from "@/features/chat/queries";
import { STAGE_LABEL } from "@/lib/ai/types";
import { isAiConfigured } from "@/lib/ai/config";

export const metadata: Metadata = { title: "독서 산파법 대화" };

export default async function ChatListPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  const [books, sessions] = await Promise.all([
    getClassBooks(classId),
    getMyChatSessions(classId),
  ]);
  const aiOn = isAiConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title="독서 산파법 대화"
        description="AI가 서평을 대신 쓰지 않습니다. 한 번에 하나씩 질문하며 당신의 생각을 넓혀 줍니다."
      />

      <div className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
        개인정보(이름·학번·연락처 등)는 입력하지 마세요. 대화 내용 중 책 제목과 당신의 답변만 AI로 전달됩니다.
        {aiOn ? null : " (현재 AI 키가 설정되지 않아 기본 예시 질문으로 동작합니다.)"}
      </div>

      {books.length === 0 ? (
        <EmptyState title="아직 등록된 도서가 없습니다" description="교사에게 도서 등록을 요청하세요." />
      ) : (
        <Card>
          <p className="mb-3 text-sm font-semibold text-stone-700">새 대화 시작</p>
          <StartChatForm classId={classId} books={books.map((b) => ({ id: b.id, title: b.title }))} />
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-600">이전 대화</h2>
        {sessions.length === 0 ? (
          <EmptyState title="아직 나눈 대화가 없습니다" />
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/chat/${s.id}`}>
                  <Card className="transition hover:border-brand">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-stone-800">{s.book?.title ?? "도서"}</span>
                      {s.status === "completed" ? (
                        <span className="text-xs text-stone-400">마무리됨</span>
                      ) : (
                        <Badge>{STAGE_LABEL[s.stage]} 단계</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
