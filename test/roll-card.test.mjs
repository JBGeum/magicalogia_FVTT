import { describe, it, expect } from "vitest";
import { buildGlobalRollCard } from "../module/system/roll-card.mjs";

// Roll 유사 객체: { formula, total, dice: [{ faces, number?, results: [{ result, active? }] }] }
const roll = (formula, total, dice = []) => ({ formula, total, dice });
const term = (faces, results) => ({ faces, results: results.map((result) => ({ result })) });

describe("buildGlobalRollCard", () => {
  it("formula·total·who·time과 카드 셸을 포함한다", () => {
    const html = buildGlobalRollCard({
      rolls: [roll("1d100", 47, [term(100, [47])])],
      who: "모몬가",
      time: "2분 전",
    });
    expect(html).toContain("mg-card");
    expect(html).toContain("1d100");
    expect(html).toContain("모몬가");
    expect(html).toContain("2분 전");
    expect(html).toContain("mg-roll-total__n");
    expect(html).toContain("47");
  });

  it("최대면은 mg-face--max, 1은 mg-face--min으로 강조한다", () => {
    const html = buildGlobalRollCard({
      rolls: [roll("2d6", 6, [term(6, [6, 1])])],
      who: "X",
      time: "",
    });
    expect(html).toContain("mg-face--max"); // 6 === faces
    expect(html).toContain("mg-face--min"); // 1
  });

  it("부분식 소계는 활성 다이스 결과의 합이다", () => {
    const html = buildGlobalRollCard({
      rolls: [roll("2d6", 6, [term(6, [5, 1])])],
      who: "X",
      time: "",
    });
    // sub = 5 + 1 = 6 → mg-roll-part__sub 안에 6
    expect(html).toMatch(/mg-roll-part__sub">6</);
  });

  it("who/time을 HTML 이스케이프한다", () => {
    const html = buildGlobalRollCard({ rolls: [roll("1d6", 3, [])], who: "<b>x</b>", time: "" });
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("여러 롤은 각각 formula와 합계를 낸다", () => {
    const html = buildGlobalRollCard({
      rolls: [roll("1d6", 3, [term(6, [3])]), roll("1d8", 8, [term(8, [8])])],
      who: "X",
      time: "",
    });
    expect(html).toContain("1d6");
    expect(html).toContain("1d8");
    expect((html.match(/mg-roll-total__n/g) || []).length).toBe(2);
  });

  it("다이스 없는 순수 숫자 롤도 식과 합계를 낸다", () => {
    const html = buildGlobalRollCard({ rolls: [roll("5", 5, [])], who: "X", time: "" });
    expect(html).toContain("mg-roll-formula");
    expect(html).toContain("mg-roll-total__n");
    expect(html).not.toContain("mg-face");
  });
});
