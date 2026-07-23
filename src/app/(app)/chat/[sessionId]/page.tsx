import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { requireProfile } from "@/lib/auth/session";
import { getChatSession, getChatMessages } from "@/features/chat/queries";

export const metadata: Metadata = { title: "산파법 대화" };

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { userId } = await requireProfile();

  const session = await getChatSession(sessionId);
  if (!session) notFound();

  const messages = await getChatMessages(sessionId);
  const isOwner = session.user_id === userId;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`독서 산파법 · ${session.book?.title ?? "도서"}`}
        description={isOwner ? undefined : "학생의 대화 기록(열람)"}
        action={
          <LinkButton href={`/classes/${session.class_id}/chat`} variant="secondary">
            대화 목록
          </LinkButton>
        }
      />

      {isOwner ? (
        <ChatConversation
          sessionId={session.id}
          classId={session.class_id}
          bookId={session.book_id}
          messages={messages}
          status={session.status}
          stage={session.stage}
        />
      ) : (
        // 교사 열람(읽기 전용): 답변 입력 없이 기록만 표시
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={m.role === "assistant" ? "" : "flex justify-end"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "assistant"
                    ? "border border-stone-200 bg-white text-stone-800"
                    : "bg-brand text-white"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
