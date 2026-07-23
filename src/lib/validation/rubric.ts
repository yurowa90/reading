import { z } from "zod";

/** 교사 루브릭 평가 항목(각 0~5점). */
export const RUBRIC_CRITERIA = [
  { key: "understanding", label: "주제 이해" },
  { key: "evidence", label: "근거 활용" },
  { key: "expression", label: "표현·구성" },
] as const;

export type RubricKey = (typeof RUBRIC_CRITERIA)[number]["key"];

const score = z.coerce.number().int().min(0).max(5);

export const rubricSchema = z.object({
  workId: z.string().uuid(),
  understanding: score,
  evidence: score,
  expression: score,
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type RubricInput = z.infer<typeof rubricSchema>;

export function rubricTotal(input: Pick<RubricInput, RubricKey>): number {
  return input.understanding + input.evidence + input.expression;
}
