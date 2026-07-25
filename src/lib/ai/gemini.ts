import { z } from "zod";
import type { SocraticResponse } from "@/types/database";
import { SYSTEM_INSTRUCTION, buildUserPrompt } from "@/lib/ai/prompt";
import { nextStage, type GenerateInput } from "@/lib/ai/types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20_000;
// 2.5 계열 flash 모델은 내부 'thinking'에 토큰을 소비하므로 여유를 둔다.
const MAX_OUTPUT_TOKENS = 1024;

/**
 * 모델 원본 응답에서 필요한 것만 관대하게 추출한다.
 * stage/nextStage 는 서버가 강제하므로 모델 값(가끔 enum 밖)에 의존하지 않는다.
 */
const geminiRawSchema = z
  .object({
    question: z.string().trim().min(1).max(1000),
    hint: z.string().trim().max(600).optional(),
  })
  .passthrough();

/**
 * Google Gemini(Generative Language API) 호출.
 * 키는 서버 환경 변수에서만 전달받는다.
 * 응답은 Zod 로 검증하고, 단계 정합성은 서버가 강제한다(모델 값 무시).
 */
export async function geminiGenerate(
  apiKey: string,
  model: string,
  input: GenerateInput,
): Promise<SocraticResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(input) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API 오류: ${res.status}`);
    }

    const data: unknown = await res.json();
    const text = extractText(data);
    if (!text) throw new Error("Gemini 응답이 비었습니다.");

    const raw = geminiRawSchema.parse(JSON.parse(text));

    // 단계 진행 정합성은 서버가 강제한다(모델의 stage/nextStage 를 신뢰하지 않음).
    return {
      stage: input.stage,
      question: raw.question.slice(0, 500),
      hint: raw.hint ? raw.hint.slice(0, 300) : undefined,
      nextStage: nextStage(input.stage),
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractText(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const text = (parts[0] as { text?: unknown })?.text;
  return typeof text === "string" ? text : null;
}
