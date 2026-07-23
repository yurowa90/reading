import { z } from "zod";
import type { SocraticStage } from "@/types/database";

/** 산파법 단계 순서(고정). AI 의 nextStage 는 참고용이며 진행은 이 순서를 따른다. */
export const STAGE_ORDER: SocraticStage[] = [
  "OBSERVE",
  "INTERPRET",
  "EVIDENCE",
  "COUNTERARGUMENT",
  "CONNECT",
  "ORGANIZE",
  "COMPLETE",
];

export const STAGE_LABEL: Record<SocraticStage, string> = {
  OBSERVE: "관찰",
  INTERPRET: "해석",
  EVIDENCE: "근거",
  COUNTERARGUMENT: "반론",
  CONNECT: "연결",
  ORGANIZE: "정리",
  COMPLETE: "마무리",
};

/** 각 단계의 목적(시스템 프롬프트/힌트 생성에 사용). */
export const STAGE_GOAL: Record<SocraticStage, string> = {
  OBSERVE: "인상 깊은 문장·장면, 반복되는 단어, 처음 느낀 감정과 반응을 확인한다.",
  INTERPRET: "학생의 해석과 그 근거를 확인하고, 다른 해석 가능성을 탐색한다.",
  EVIDENCE: "해석을 뒷받침하는 책 속 근거(인물의 말·행동, 수집한 문장)를 찾게 한다.",
  COUNTERARGUMENT: "반대 관점, 저자의 한계, 다른 독자의 비판을 예상하게 한다.",
  CONNECT: "자신의 경험, 다른 책, 사회 문제, 과학·윤리·정책과 연결하게 한다.",
  ORGANIZE: "중심 주장·핵심 근거·예상 반론·결론·남길 질문을 스스로 정리하게 한다.",
  COMPLETE: "지금까지의 생각을 학생이 직접 요약하도록 돕는다. 서평을 대신 쓰지 않는다.",
};

export function nextStage(stage: SocraticStage): SocraticStage {
  const i = STAGE_ORDER.indexOf(stage);
  if (i < 0 || i >= STAGE_ORDER.length - 1) return "COMPLETE";
  return STAGE_ORDER[i + 1]!;
}

export function isTerminalStage(stage: SocraticStage): boolean {
  return stage === "COMPLETE";
}

const stageEnum = z.enum([
  "OBSERVE",
  "INTERPRET",
  "EVIDENCE",
  "COUNTERARGUMENT",
  "CONNECT",
  "ORGANIZE",
  "COMPLETE",
]);

/** AI 응답 구조 검증 스키마. 자유 텍스트가 아니라 구조화 결과만 받는다. */
export const socraticResponseSchema = z.object({
  stage: stageEnum,
  question: z.string().trim().min(1).max(500),
  hint: z.string().trim().max(300).optional(),
  nextStage: stageEnum,
});

export type SocraticResponseParsed = z.infer<typeof socraticResponseSchema>;

/** provider 로 전달하는 입력. 학생 식별정보(이름/이메일/학번)는 포함하지 않는다. */
export interface GenerateInput {
  stage: SocraticStage;
  bookTitle: string;
  bookAuthor: string | null;
  /** 학생이 수집한 문장(따옴표 원문만, 개인정보 아님). */
  collectedQuotes: string[];
  /** 최근 대화(질문/답변) — 학생 답변 텍스트. */
  history: { role: "assistant" | "user"; content: string }[];
}
