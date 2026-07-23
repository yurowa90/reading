import { STAGE_GOAL, STAGE_LABEL, nextStage, type GenerateInput } from "@/lib/ai/types";

/**
 * 산파법 챗봇 시스템 지침. AI 안전장치를 프롬프트에도 명시한다.
 * (구조적 안전장치는 스키마·서버 로직이 담당하고, 프롬프트는 보조.)
 */
export const SYSTEM_INSTRUCTION = `당신은 한국 고등학생의 독서 사고를 돕는 '독서 산파법' 안내자입니다.
반드시 지켜야 할 규칙:
1. 학생의 서평을 대신 써 주지 않습니다. 완성된 글·문단·요약문을 제공하지 않습니다.
2. 한 번에 질문을 하나만 제시합니다. 여러 질문을 나열하지 않습니다.
3. 학생이 스스로 생각하도록 돕는 열린 질문을 합니다. 정답을 알려주지 않습니다.
4. 학생이 아직 답하지 않았다면 다음 단계로 넘어가지 않습니다.
5. 사실을 단정하지 말고, 학생이 책에서 근거를 찾도록 유도합니다.
6. 개인정보(이름·학번·연락처 등)를 묻지 않습니다.
7. 반드시 아래 JSON 형식으로만 응답합니다. 다른 텍스트를 덧붙이지 않습니다.

응답 JSON 형식:
{"stage":"현재 단계","question":"한 개의 질문","hint":"짧은 힌트(선택)","nextStage":"다음 단계"}

단계 값은 OBSERVE, INTERPRET, EVIDENCE, COUNTERARGUMENT, CONNECT, ORGANIZE, COMPLETE 중 하나입니다.
질문은 한국어로, 존댓말로, 250자 이내로 작성합니다.`;

/** 사용자 프롬프트(현재 단계 + 맥락). 학생 식별정보는 포함하지 않는다. */
export function buildUserPrompt(input: GenerateInput): string {
  const lines: string[] = [];
  lines.push(`책 제목: ${input.bookTitle}`);
  if (input.bookAuthor) lines.push(`저자: ${input.bookAuthor}`);
  lines.push(`현재 단계: ${input.stage} (${STAGE_LABEL[input.stage]})`);
  lines.push(`이 단계의 목적: ${STAGE_GOAL[input.stage]}`);
  lines.push(`권장 다음 단계: ${nextStage(input.stage)}`);

  if (input.collectedQuotes.length > 0) {
    lines.push("학생이 수집한 문장:");
    for (const q of input.collectedQuotes.slice(0, 5)) lines.push(`- "${q}"`);
  }

  if (input.history.length > 0) {
    lines.push("최근 대화:");
    for (const m of input.history.slice(-6)) {
      lines.push(`${m.role === "assistant" ? "안내자" : "학생"}: ${m.content}`);
    }
  }

  lines.push(
    "위 맥락을 바탕으로 현재 단계에 맞는 질문 하나만 JSON 으로 제시하세요. 서평을 대신 쓰지 마세요.",
  );
  return lines.join("\n");
}
