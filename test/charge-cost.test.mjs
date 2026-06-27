import { describe, it, expect } from "vitest";
import { chargeCostOf, isCharged } from "../module/helpers/config.mjs";

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

describe("isCharged (장비/유효 판정)", () => {
  it("충전이 코스트와 같으면 유효 (별×2, charge 2)", () => {
    expect(isCharged({ area: "star", count: 2 }, 2)).toBe(true);
  });
  it("충전이 코스트를 넘으면 유효 (별×2, charge 3)", () => {
    expect(isCharged({ area: "star", count: 2 }, 3)).toBe(true);
  });
  it("충전이 코스트보다 적으면 무효 (별×2, charge 1)", () => {
    expect(isCharged({ area: "star", count: 2 }, 1)).toBe(false);
  });
  it("충전 코스트가 0이면 무효 (area none → 표시 불필요)", () => {
    expect(isCharged({ area: "none", count: 3 }, 5)).toBe(false);
  });
  it("충전 코스트가 0이면 무효 (area 미선택)", () => {
    expect(isCharged({ area: "", count: 0 }, 0)).toBe(false);
  });
  it("charge가 undefined면 무효", () => {
    expect(isCharged({ area: "star", count: 2 }, undefined)).toBe(false);
  });
});
