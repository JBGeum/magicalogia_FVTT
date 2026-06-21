import { describe, it, expect } from "vitest";
import { computeTable } from "../module/system/specialty-table.mjs";
import { resolveSpecialtyTn } from "../module/system/spell-cast.mjs";

// 특정 (열,인덱스)만 보유한 맵 생성
function own(pairs) {
  const o = {};
  for (const [key, idx] of pairs) {
    o[key] ??= Array(11).fill(false);
    o[key][idx] = true;
  }
  return o;
}

describe("resolveSpecialtyTn", () => {
  it("차트 링크 + 보유특기 있음 → 라이브 TN (이야기 자신 보유 → 5)", () => {
    const table = computeTable({ owned: own([["song", 0]]), domain: null, wrap: false });
    expect(resolveSpecialtyTn(table, "이야기", 9)).toEqual({ tn: 5, linked: true });
  });
  it("차트 링크지만 보유특기 없어 cell.tn null → 수동 폴백", () => {
    const table = computeTable({ owned: {}, domain: null, wrap: false });
    expect(resolveSpecialtyTn(table, "이야기", 9)).toEqual({ tn: 9, linked: true });
  });
  it("차트 미매칭 → 수동 폴백, linked false", () => {
    const table = computeTable({ owned: own([["song", 0]]), domain: null, wrap: false });
    expect(resolveSpecialtyTn(table, "커스텀특기", 8)).toEqual({ tn: 8, linked: false });
  });
  it("링크 TN도 수동값도 없으면 tn null", () => {
    const table = computeTable({ owned: {}, domain: null, wrap: false });
    expect(resolveSpecialtyTn(table, "커스텀특기", null)).toEqual({ tn: null, linked: false });
  });
});
