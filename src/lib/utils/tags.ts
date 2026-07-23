/**
 * 태그 문자열을 정규화한다.
 * - 쉼표/공백/해시(#) 기준 분리
 * - 앞뒤 공백 및 선행 # 제거
 * - 빈 값 제거, 중복 제거(대소문자·순서 유지)
 * - 최대 개수 및 개별 길이 제한
 */
export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 20;

export function normalizeTags(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(/[,\s]+/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const token of raw) {
    const cleaned = token.replace(/^#+/, "").trim().slice(0, MAX_TAG_LENGTH);
    if (cleaned.length === 0) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= MAX_TAGS) break;
  }

  return result;
}
