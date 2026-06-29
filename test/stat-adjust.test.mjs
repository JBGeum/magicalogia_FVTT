import { describe, it, expect } from "vitest";
import { adjustStatValue } from "../module/system/stat-adjust.mjs";

describe("adjustStatValue", () => {
  it("delta만큼 증가시킨다", () => {
    expect(adjustStatValue(3, 1)).toBe(4);
  });

  it("delta만큼 감소시킨다", () => {
    expect(adjustStatValue(3, -1)).toBe(2);
  });

  it("0 미만으로 내려가지 않는다", () => {
    expect(adjustStatValue(0, -1)).toBe(0);
  });

  it("현재값이 없으면(null/undefined) 0으로 취급한다", () => {
    expect(adjustStatValue(null, 1)).toBe(1);
    expect(adjustStatValue(undefined, -1)).toBe(0);
  });
});
