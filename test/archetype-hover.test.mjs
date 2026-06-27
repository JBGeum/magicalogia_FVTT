import { describe, it, expect } from "vitest";
import { buildArchetypeTooltip } from "../module/system/archetype-hover.mjs";

describe("buildArchetypeTooltip", () => {
  it("블록 보유 시 블록 HP 라인과 부스트를 표시한다", () => {
    const html = buildArchetypeTooltip(
      { hasBlock: true, health: { value: 3, max: 5 }, boostCount: 2 },
      "불꽃의 기사",
    );
    expect(html).toContain("불꽃의 기사");
    expect(html).toContain("블록");
    expect(html).toContain("3");
    expect(html).toContain("5");
    expect(html).toContain("부스트");
    expect(html).toContain("2");
  });

  it("블록이 없으면 블록 라인을 생략하고 부스트만 표시한다", () => {
    const html = buildArchetypeTooltip({ hasBlock: false, boostCount: 1 }, "정령");
    expect(html).not.toContain("블록");
    expect(html).toContain("부스트");
    expect(html).toContain("정령");
  });

  it("기능(features)이 있으면 포함한다", () => {
    const html = buildArchetypeTooltip(
      { hasBlock: false, boostCount: 0, features: "<p>강타</p>" },
      "기사",
    );
    expect(html).toContain("강타");
  });

  it("attr이 6속성이면 속성명을 표시한다 (force → 힘)", () => {
    const html = buildArchetypeTooltip({ hasBlock: false, boostCount: 0, attr: "force" }, "기사");
    expect(html).toContain("힘");
  });
});
