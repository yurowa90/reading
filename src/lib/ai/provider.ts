import "server-only";
import type { SocraticResponse } from "@/types/database";
import { getAiConfig } from "@/lib/ai/config";
import { geminiGenerate } from "@/lib/ai/gemini";
import { mockGenerate } from "@/lib/ai/mock";
import type { GenerateInput } from "@/lib/ai/types";

/**
 * 산파법 질문 생성. 제공자 교체용 adapter.
 * 실제 AI 호출이 실패하거나 키가 없으면 안전한 mock 으로 폴백해
 * UI 가 항상 유효한 질문 하나를 받도록 보장한다.
 */
export async function generateSocraticQuestion(input: GenerateInput): Promise<SocraticResponse> {
  const config = getAiConfig();

  if (config.provider === "gemini" && config.apiKey) {
    try {
      return await geminiGenerate(config.apiKey, config.model, input);
    } catch (err) {
      // 키·네트워크·검증 실패 시 폴백. 키 등 민감정보는 로그에 남기지 않는다.
      console.error("[ai] Gemini 호출 실패, mock 으로 폴백:", (err as Error).message);
      return mockGenerate(input);
    }
  }

  return mockGenerate(input);
}
