import { describe, it, expect } from "vitest";
import { resolveExchange, renderBattleDie } from "../module/system/magic-battle.mjs";

describe("resolveExchange", () => {
  it("기본: [4,4,2] vs [4,5] → 유효 [4,2], 대미지 2", () => {
    const r = resolveExchange([4, 4, 2], [4, 5]);
    expect(r.surviving).toEqual([4, 2]);
    expect(r.damage).toBe(2);
    expect(r.attackMarks).toEqual([
      { v: 4, st: "cancel" },
      { v: 4, st: "valid" },
      { v: 2, st: "valid" },
    ]);
    expect(r.defenseMarks).toEqual([
      { v: 4, st: "cancel" },
      { v: 5, st: "leftover" },
    ]);
  });

  it("전부 상쇄: [3,3] vs [3,3] → 대미지 0", () => {
    const r = resolveExchange([3, 3], [3, 3]);
    expect(r.surviving).toEqual([]);
    expect(r.damage).toBe(0);
    expect(r.defenseMarks.every((m) => m.st === "cancel")).toBe(true);
  });

  it("전부 통과: [1,2] vs [] → 대미지 2", () => {
    const r = resolveExchange([1, 2], []);
    expect(r.surviving).toEqual([1, 2]);
    expect(r.damage).toBe(2);
  });

  it("방어 과잉: [5] vs [5,5,1] → 대미지 0, 방어 5 하나만 cancel", () => {
    const r = resolveExchange([5], [5, 5, 1]);
    expect(r.damage).toBe(0);
    expect(r.defenseMarks).toEqual([
      { v: 5, st: "cancel" },
      { v: 5, st: "leftover" },
      { v: 1, st: "leftover" },
    ]);
  });

  it("중복 부분 매칭: [6,6,6] vs [6,6] → 유효 [6], 대미지 1", () => {
    const r = resolveExchange([6, 6, 6], [6, 6]);
    expect(r.surviving).toEqual([6]);
    expect(r.damage).toBe(1);
  });

  it("빈 공격: [] vs [3] → 대미지 0", () => {
    const r = resolveExchange([], [3]);
    expect(r.damage).toBe(0);
    expect(r.attackMarks).toEqual([]);
  });
});

describe("renderBattleDie", () => {
  it("valid: 골드 클래스 + pip 개수(4→4개)", () => {
    const h = renderBattleDie(4, "valid");
    expect(h).toContain("mg-die--valid");
    expect(h).toContain("is-valid");
    expect((h.match(/<i><\/i>/g) || []).length).toBe(4);
    expect(h).toContain(">4</span>");
  });
  it("cancel: 상쇄 클래스", () => {
    const h = renderBattleDie(3, "cancel");
    expect(h).toContain("mg-die--cancel");
    expect(h).toContain("is-cancel");
  });
  it("leftover: 모디파이어 없는 플레인 면", () => {
    const h = renderBattleDie(5, "leftover");
    expect(h).toContain("is-leftover");
    expect(h).not.toContain("mg-die--valid");
    expect(h).not.toContain("mg-die--cancel");
  });
});
