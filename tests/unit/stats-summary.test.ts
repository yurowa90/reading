import { describe, expect, it } from "vitest";
import {
  countByStatus,
  countByKind,
  tallyByUser,
  buildParticipation,
} from "@/lib/stats/summary";

describe("countByStatus", () => {
  it("상태별로 집계한다", () => {
    const r = countByStatus([
      { status: "draft" },
      { status: "published" },
      { status: "published" },
      { status: "submitted" },
    ]);
    expect(r.published).toBe(2);
    expect(r.draft).toBe(1);
    expect(r.submitted).toBe(1);
    expect(r.hidden).toBe(0);
  });
});

describe("countByKind", () => {
  it("종류별로 집계한다", () => {
    const r = countByKind([{ kind: "review" }, { kind: "poster" }, { kind: "review" }]);
    expect(r.review).toBe(2);
    expect(r.poster).toBe(1);
  });
});

describe("tallyByUser", () => {
  it("사용자별 건수를 만든다", () => {
    const m = tallyByUser([{ user_id: "a" }, { user_id: "a" }, { user_id: "b" }]);
    expect(m.get("a")).toBe(2);
    expect(m.get("b")).toBe(1);
    expect(m.get("c")).toBeUndefined();
  });
});

describe("buildParticipation", () => {
  it("학생 목록과 카운트 맵을 결합한다", () => {
    const rows = buildParticipation(
      [
        { userId: "a", displayName: "가" },
        { userId: "b", displayName: "나" },
      ],
      new Map([["a", 3]]),
      new Map([["a", 1]]),
      new Map([["b", 2]]),
      new Map(),
    );
    expect(rows[0]).toMatchObject({ userId: "a", sentenceCount: 3, publishedCount: 1, commentCount: 0 });
    expect(rows[1]).toMatchObject({ userId: "b", submittedCount: 2, sentenceCount: 0 });
  });
});
