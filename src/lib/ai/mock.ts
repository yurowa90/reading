import type { SocraticResponse, SocraticStage } from "@/types/database";
import { nextStage, type GenerateInput } from "@/lib/ai/types";

/**
 * AI 키가 없거나 실제 호출이 실패할 때 쓰는 안전한 폴백 제공자.
 * 대필하지 않고 단계별 열린 질문 하나를 결정적으로 반환한다.
 */
const CANNED: Record<SocraticStage, { question: string; hint: string }> = {
  OBSERVE: {
    question: "이 책에서 가장 인상 깊었던 문장이나 장면은 무엇이었나요? 그때 어떤 느낌이 들었는지도 함께 적어 보세요.",
    hint: "반복해서 나오는 단어나, 마음이 멈칫했던 부분을 떠올려 보세요.",
  },
  INTERPRET: {
    question: "방금 고른 부분을 당신은 어떻게 해석했나요? 그렇게 읽은 이유는 무엇인가요?",
    hint: "정답을 찾기보다, 왜 그렇게 느꼈는지 근거를 떠올려 보세요.",
  },
  EVIDENCE: {
    question: "그 해석을 뒷받침하는 책 속 장면이나 문장은 무엇인가요?",
    hint: "인물의 말이나 행동, 수집한 문장을 찾아보세요.",
  },
  COUNTERARGUMENT: {
    question: "당신의 해석과 반대되는 관점이나, 저자의 주장에서 아쉬운 점은 무엇일까요?",
    hint: "다른 독자라면 어떤 점을 비판할지 상상해 보세요.",
  },
  CONNECT: {
    question: "이 책의 문제의식은 당신의 경험이나 다른 책, 사회 문제와 어떻게 연결되나요?",
    hint: "과학·윤리·정책 같은 다른 영역과 이어 보아도 좋아요.",
  },
  ORGANIZE: {
    question: "지금까지의 생각을 서평으로 옮긴다면, 중심 주장과 가장 중요한 근거는 무엇인가요?",
    hint: "주장 → 근거 → 예상 반론 → 결론 순서로 정리해 보세요.",
  },
  COMPLETE: {
    question: "오늘 나눈 생각을 당신의 말로 한두 문장으로 요약해 볼까요? 이 요약이 서평의 출발점이 됩니다.",
    hint: "요약은 스스로 씁니다. 이 도구는 대신 써 주지 않아요.",
  },
};

export function mockGenerate(input: GenerateInput): SocraticResponse {
  const canned = CANNED[input.stage];
  return {
    stage: input.stage,
    question: canned.question,
    hint: canned.hint,
    nextStage: nextStage(input.stage),
  };
}
