"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendAnswerAction } from "@/actions/chat";
import { STAGE_LABEL } from "@/lib/ai/types";
import type { ChatMessage, SocraticStage } from "@/types/database";

export function ChatConversation({
  sessionId,
  classId,
  bookId,
  messages,
  status,
  stage,
}: {
  sessionId: string;
  classId: string;
  bookId: string;
  messages: ChatMessage[];
  status: "active" | "completed";
  stage: SocraticStage;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (answer.trim().length === 0) {
      setError("답변을 입력하세요.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("sessionId", sessionId);
    fd.set("answer", answer);
    startTransition(async () => {
      const result = await sendAnswerAction(null, fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAnswer("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={m.role === "assistant" ? "" : "flex justify-end"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "assistant"
                  ? "bg-white border border-stone-200 text-stone-800"
                  : "bg-brand text-white"
              }`}
            >
              {m.role === "assistant" ? (
                <p className="mb-1 text-xs font-semibold text-brand">
                  안내자 · {STAGE_LABEL[m.stage]}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </li>
        ))}
      </ul>

      {status === "completed" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">대화를 마쳤습니다.</p>
          <p className="mt-1">
            이 도구는 서평을 대신 써 주지 않습니다. 지금까지 정리한 <strong>당신의 생각</strong>으로
            서평을 직접 작성해 보세요.
          </p>
          <Link
            href={`/classes/${classId}/works/reviews/new?bookId=${bookId}`}
            className="mt-3 inline-flex rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
          >
            서평 쓰러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="answer" className="block text-sm font-medium text-stone-700">
            내 답변 <span className="text-xs font-normal text-stone-400">(현재 단계: {STAGE_LABEL[stage]})</span>
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="스스로 생각한 답을 적어 보세요. 개인정보(이름·연락처 등)는 입력하지 마세요."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          {error ? (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={send}
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? "생각을 정리하는 중…" : "답변하고 다음 질문 받기"}
          </button>
        </div>
      )}
    </div>
  );
}
