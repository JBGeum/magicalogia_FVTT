import { describe, it, expect } from "vitest";
import { classifyRoll, renderDie } from "../module/system/specialty-roll.mjs";

describe("classifyRoll", () => {
  it("(1,1)은 펌블 = 자동 실패", () => {
    const r = classifyRoll(1, 1, 5);
    expect(r.fumble).toBe(true);
    expect(r.success).toBe(false);
    expect(r.doublet).toBe(true);
  });
  it("(6,6)은 스페셜 = 자동 성공", () => {
    const r = classifyRoll(6, 6, 12);
    expect(r.special).toBe(true);
    expect(r.success).toBe(true);
    expect(r.doublet).toBe(true);
  });
  it("합이 TN 이상이면 성공", () => {
    const r = classifyRoll(3, 4, 7); // 7 >= 7
    expect(r.success).toBe(true);
    expect(r.special).toBe(false);
    expect(r.fumble).toBe(false);
  });
  it("합이 TN 미만이면 실패", () => {
    expect(classifyRoll(2, 3, 7).success).toBe(false); // 5 < 7
  });
  it("같은 눈은 더블릿 플래그", () => {
    expect(classifyRoll(4, 4, 5).doublet).toBe(true);
    expect(classifyRoll(4, 5, 5).doublet).toBe(false);
  });
  it("total은 두 눈의 합", () => {
    expect(classifyRoll(2, 5, 5).total).toBe(7);
  });
  it("penalty는 합 비교에서 차감된다 (불운 -1)", () => {
    // (3,4)=7, tn=7: penalty 없으면 성공, penalty=1이면 6<7 실패.
    expect(classifyRoll(3, 4, 7).success).toBe(true);
    expect(classifyRoll(3, 4, 7, 1).success).toBe(false);
  });
  it("penalty는 total(raw 합)을 바꾸지 않는다", () => {
    expect(classifyRoll(3, 4, 7, 1).total).toBe(7);
  });
  it("penalty가 있어도 (6,6) 스페셜은 자동 성공", () => {
    expect(classifyRoll(6, 6, 12, 1).success).toBe(true);
    expect(classifyRoll(6, 6, 12, 1).special).toBe(true);
  });
  it("penalty가 있어도 (1,1) 펌블은 자동 실패", () => {
    expect(classifyRoll(1, 1, 5, 1).success).toBe(false);
    expect(classifyRoll(1, 1, 5, 1).fumble).toBe(true);
  });
});

describe("renderDie", () => {
  const pips = (html) => (html.match(/<i><\/i>/g) || []).length;
  const cells = (html) => (html.match(/<i><\/i>|<span><\/span>/g) || []).length;

  it("1면은 pip 1개", () => {
    expect(pips(renderDie(1, false))).toBe(1);
  });
  it("6면은 pip 6개", () => {
    expect(pips(renderDie(6, false))).toBe(6);
  });
  it("항상 9칸(pip + 빈칸)을 출력", () => {
    expect(cells(renderDie(3, false))).toBe(9);
  });
  it("match=true면 is-match 클래스, false면 없음", () => {
    expect(renderDie(2, true)).toContain("is-match");
    expect(renderDie(2, false)).not.toContain("is-match");
  });
});
