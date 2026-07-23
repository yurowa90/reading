import { describe, expect, it } from "vitest";
import {
  socraticResponseSchema,
  nextStage,
  isTerminalStage,
  STAGE_ORDER,
} from "@/lib/ai/types";
import { mockGenerate } from "@/lib/ai/mock";
import type { SocraticStage } from "@/types/database";

describe("nextStage", () => {
  it("단계가 순서대로 진행된다", () => {
    expect(nextStage("OBSERVE")).toBe("INTERPRET");
    expect(nextStage("INTERPRET")).toBe("EVIDENCE");
    expect(nextStage("ORGANIZE")).toBe("COMPLETE");
  });
  it("COMPLETE 는 종착점", () => {
    expect(nextStage("COMPLETE")).toBe("COMPLETE");
    expect(isTerminalStage("COMPLETE")).toBe(true);
    expect(isTerminalStage("OBSERVE")).toBe(false);
  });
  it("7단계가 정의되어 있다", () => {
    expect(STAGE_ORDER).toHaveLength(7);
  });
});

describe("socraticResponseSchema", () => {
  it("정상 구조를 통과시킨다", () => {
    const r = socraticResponseSchema.safeParse({
      stage: "EVIDENCE",
      question: "그 해석을 뒷받침하는 장면은?",
      hint: "인물의 말·행동을 보세요.",
      nextStage: "COUNTERARGUMENT",
    });
    expect(r.success).toBe(true);
  });
  it("질문이 비면 거부(대필/빈응답 방지)", () => {
    const r = socraticResponseSchema.safeParse({
      stage: "EVIDENCE",
      question: "",
      nextStage: "CONNECT",
    });
    expect(r.success).toBe(false);
  });
  it("잘못된 단계 값을 거부", () => {
    const r = socraticResponseSchema.safeParse({
      stage: "WRITE_REVIEW",
      question: "x",
      nextStage: "CONNECT",
    });
    expect(r.success).toBe(false);
  });
});

describe("mockGenerate", () => {
  it("모든 단계에서 질문 하나와 올바른 다음 단계를 반환한다", () => {
    for (const stage of STAGE_ORDER) {
      const res = mockGenerate({
        stage: stage as SocraticStage,
        bookTitle: "데미안",
        bookAuthor: "헤르만 헤세",
        collectedQuotes: [],
        history: [],
      });
      expect(res.stage).toBe(stage);
      expect(res.question.length).toBeGreaterThan(0);
      expect(res.nextStage).toBe(nextStage(stage));
      // 스키마로도 검증
      expect(socraticResponseSchema.safeParse(res).success).toBe(true);
    }
  });
});
