import type { SocraticResponse } from "@/types/database";
import { SYSTEM_INSTRUCTION, buildUserPrompt } from "@/lib/ai/prompt";
import { socraticResponseSchema, nextStage, type GenerateInput } from "@/lib/ai/types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 15_000;

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
          maxOutputTokens: 512,
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

    const parsed = socraticResponseSchema.parse(JSON.parse(text));

    // 단계 진행 정합성은 서버가 강제한다(모델의 stage/nextStage 를 신뢰하지 않음).
    return {
      stage: input.stage,
      question: parsed.question,
      hint: parsed.hint,
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
