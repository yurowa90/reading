import { describe, expect, it } from "vitest";
import { normalizeTags, MAX_TAGS } from "@/lib/utils/tags";

describe("normalizeTags", () => {
  it("문자열을 쉼표/공백으로 분리하고 # 을 제거한다", () => {
    expect(normalizeTags("#책임, 선택  공동체")).toEqual(["책임", "선택", "공동체"]);
  });

  it("중복(대소문자 무시)을 제거한다", () => {
    expect(normalizeTags("Hope hope HOPE")).toEqual(["Hope"]);
  });

  it("빈 토큰을 제거한다", () => {
    expect(normalizeTags(",, ,  ,")).toEqual([]);
  });

  it("최대 개수를 초과하지 않는다", () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag${i}`).join(" ");
    expect(normalizeTags(many).length).toBe(MAX_TAGS);
  });

  it("배열 입력도 처리한다", () => {
    expect(normalizeTags(["#a", " b ", "a"])).toEqual(["a", "b"]);
  });

  it("개별 태그 길이를 20자로 제한한다", () => {
    const long = "가".repeat(30);
    expect(normalizeTags(long)[0]).toHaveLength(20);
  });
});
