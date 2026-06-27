import { describe, it, expect } from "vitest";
import { chargeCostOf } from "../module/helpers/config.mjs";

describe("chargeCostOf", () => {
  it("area 미선택이면 0", () => {
    expect(chargeCostOf({ area: "", count: 2 })).toBe(0);
  });
  it("area none이면 0 (count 무관)", () => {
    expect(chargeCostOf({ area: "none", count: 3 })).toBe(0);
  });
  it("속성+count → count (별×2 → 2)", () => {
    expect(chargeCostOf({ area: "star", count: 2 })).toBe(2);
  });
  it("count 0이면 0 (표시상 라벨만이어도 소비 0)", () => {
    expect(chargeCostOf({ area: "song", count: 0 })).toBe(0);
  });
  it("all(전全)도 count만큼", () => {
    expect(chargeCostOf({ area: "all", count: 3 })).toBe(3);
  });
  it("cost가 undefined면 0", () => {
    expect(chargeCostOf(undefined)).toBe(0);
  });
});
