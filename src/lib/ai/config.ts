/**
 * 서버 전용 AI 설정. 이 모듈은 서버 코드(서버 액션)에서만 import 한다.
 * AI_API_KEY 는 NEXT_PUBLIC_ 접두사가 없으므로 클라이언트 번들에 포함되지 않는다.
 */

export interface AiConfig {
  provider: "gemini" | "mock";
  apiKey: string | null;
  model: string;
}

export function getAiConfig(): AiConfig {
  const apiKey = process.env.AI_API_KEY ?? null;
  const declared = process.env.AI_PROVIDER;
  // 명시가 없으면 키 유무로 결정: 키가 있으면 gemini, 없으면 mock(안전 폴백).
  const provider = declared === "gemini" || (!declared && apiKey) ? "gemini" : "mock";
  return {
    provider,
    apiKey,
    // gemini-flash-latest 는 무료 등급에서 호출 가능하도록 유지되는 별칭 모델.
    model: process.env.AI_MODEL ?? "gemini-flash-latest",
  };
}

/** UI 안내용: 실제 AI 연결 여부(키 존재). */
export function isAiConfigured(): boolean {
  const { provider, apiKey } = getAiConfig();
  return provider === "gemini" && Boolean(apiKey);
}
