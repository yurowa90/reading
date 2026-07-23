"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import { generateSocraticQuestion } from "@/lib/ai/provider";
import { nextStage, type GenerateInput } from "@/lib/ai/types";
import type { Book, ChatSession, SocraticResponse, SocraticStage } from "@/types/database";

const startSchema = z.object({ bookId: z.string().uuid("도서를 선택하세요.") });
const answerSchema = z.object({
  sessionId: z.string().uuid(),
  answer: z.string().trim().min(1, "답변을 입력하세요.").max(4000),
});

/** 세션의 책 정보 + 내 수집 문장(따옴표만)으로 생성 입력을 구성한다. 개인정보는 넣지 않는다. */
async function buildInput(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: ChatSession,
  stage: SocraticStage,
  userId: string,
): Promise<GenerateInput> {
  const [{ data: book }, { data: quotes }, { data: history }] = await Promise.all([
    supabase.from("books").select("title, author").eq("id", session.book_id).maybeSingle(),
    supabase
      .from("sentence_cards")
      .select("quote")
      .eq("user_id", userId)
      .eq("book_id", session.book_id)
      .limit(5),
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true }),
  ]);

  const b = book as Pick<Book, "title" | "author"> | null;
  return {
    stage,
    bookTitle: b?.title ?? "책",
    bookAuthor: b?.author ?? null,
    collectedQuotes: ((quotes as { quote: string }[] | null) ?? []).map((q) => q.quote),
    history: ((history as { role: "assistant" | "user"; content: string }[] | null) ?? []).map(
      (m) => ({ role: m.role, content: m.content }),
    ),
  };
}

async function insertAssistant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  response: SocraticResponse,
): Promise<void> {
  const content = response.hint
    ? `${response.question}\n\n힌트: ${response.hint}`
    : response.question;
  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "assistant",
    stage: response.stage,
    content,
    structured: response,
  });
}

/** 새 산파법 대화 시작: 세션 생성 + 첫 질문(OBSERVE) 생성. */
export async function startChatAction(
  classId: string,
  _prev: ActionResult<{ sessionId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = startSchema.safeParse({ bookId: formData.get("bookId") });
  if (!parsed.success) return actionError("도서를 선택하세요.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const { data: session, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id, class_id: classId, book_id: parsed.data.bookId, stage: "OBSERVE" })
    .select("*")
    .single<ChatSession>();
  if (error || !session) {
    return actionError("대화를 시작하지 못했습니다. 학급 소속과 도서를 확인하세요.");
  }

  const input = await buildInput(supabase, session, "OBSERVE", user.id);
  const response = await generateSocraticQuestion(input);
  await insertAssistant(supabase, session.id, response);

  revalidatePath(`/classes/${classId}/chat`);
  return actionOk({ sessionId: session.id });
}

/** 학생 답변 제출 → 다음 단계 질문 생성. 학생이 답해야만 진행한다. */
export async function sendAnswerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = answerSchema.safeParse({
    sessionId: formData.get("sessionId"),
    answer: formData.get("answer"),
  });
  if (!parsed.success) return actionError("답변을 입력하세요.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionError("로그인이 필요합니다.");

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle<ChatSession>();
  if (!session || session.user_id !== user.id) return actionError("세션을 찾을 수 없습니다.");
  if (session.status === "completed") return actionError("이미 마무리된 대화입니다.");

  // 현재 단계에 학생 답변을 기록한다.
  await supabase.from("chat_messages").insert({
    session_id: session.id,
    role: "user",
    stage: session.stage,
    content: parsed.data.answer,
  });

  // 마지막 단계였다면 대화를 마무리(대필 없이 종료).
  if (session.stage === "COMPLETE") {
    await supabase.from("chat_sessions").update({ status: "completed" }).eq("id", session.id);
    revalidatePath(`/chat/${session.id}`);
    return actionOk(undefined);
  }

  // 다음 단계 질문을 생성한다(진행은 서버가 강제하는 고정 순서).
  const next = nextStage(session.stage);
  const input = await buildInput(supabase, session, next, user.id);
  const response = await generateSocraticQuestion(input);
  await insertAssistant(supabase, session.id, response);
  await supabase.from("chat_sessions").update({ stage: next }).eq("id", session.id);

  revalidatePath(`/chat/${session.id}`);
  return actionOk(undefined);
}
