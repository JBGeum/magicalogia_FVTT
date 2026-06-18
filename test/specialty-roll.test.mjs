import { describe, it, expect } from "vitest";
import { classifyRoll } from "../module/system/specialty-roll.mjs";

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
});
