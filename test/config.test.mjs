import { describe, it, expect } from "vitest";
import { MAGICALOGIA } from "../module/helpers/config.mjs";

describe("MAGICALOGIA config", () => {
  it("6속성이 고정 순서로 정의된다", () => {
    expect(MAGICALOGIA.attributes.map((a) => a.key)).toEqual([
      "star",
      "beast",
      "force",
      "song",
      "dream",
      "dark",
    ]);
  });
  it("어둠은 특수처리 플래그 없이 일반 속성과 동일하다", () => {
    const flagged = MAGICALOGIA.attributes.filter((a) => a.dark).map((a) => a.key);
    expect(flagged).toEqual([]);
  });
  it("각 속성 특기 이름이 11개씩 있다", () => {
    for (const a of MAGICALOGIA.attributes) {
      expect(MAGICALOGIA.chart[a.key]).toHaveLength(11);
    }
  });
  it("행(출목)은 2..12", () => {
    expect(MAGICALOGIA.rows).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it("상태이상 8종", () => {
    expect(MAGICALOGIA.statuses).toHaveLength(8);
    expect(MAGICALOGIA.statuses[0]).toEqual({ key: "seal", label: "봉인" });
  });
  it("효과종류는 없음/지속/순간/장면 4종", () => {
    expect(MAGICALOGIA.EFFECT_TYPES).toEqual(["없음", "지속", "순간", "장면"]);
  });
  it("경력/기관 datalist 추천목록을 제공한다", () => {
    expect(Array.isArray(MAGICALOGIA.CAREER_OPTIONS)).toBe(true);
    expect(MAGICALOGIA.CAREER_OPTIONS.length).toBeGreaterThan(0);
    expect(Array.isArray(MAGICALOGIA.ORG_OPTIONS)).toBe(true);
    expect(MAGICALOGIA.ORG_OPTIONS.length).toBeGreaterThan(0);
  });
});
