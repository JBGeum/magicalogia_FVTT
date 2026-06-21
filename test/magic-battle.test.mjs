import { describe, it, expect } from "vitest";
import {
  resolveExchange,
  renderBattleDie,
  buildBattleCard,
  buildBoostCard,
} from "../module/system/magic-battle.mjs";

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

describe("resolveExchange — 집중 방어 (defense에 0 마커)", () => {
  it("[4,4,4,2] vs [0,4] → 눈4 전부 상쇄, 유효 [2], 대미지 1, focus 4", () => {
    const r = resolveExchange([4, 4, 4, 2], [0, 4]);
    expect(r.focus).toBe(4);
    expect(r.surviving).toEqual([2]);
    expect(r.damage).toBe(1);
    expect(r.attackMarks).toEqual([
      { v: 4, st: "cancel" },
      { v: 4, st: "cancel" },
      { v: 4, st: "cancel" },
      { v: 2, st: "valid" },
    ]);
    expect(r.defenseMarks).toEqual([{ v: 4, st: "focus" }]);
  });

  it("빗나감: [1,2,3] vs [0,5] → 상쇄 없음, 대미지 3, focus 5", () => {
    const r = resolveExchange([1, 2, 3], [0, 5]);
    expect(r.focus).toBe(5);
    expect(r.damage).toBe(3);
    expect(r.surviving).toEqual([1, 2, 3]);
  });

  it("전부 상쇄: [6,6] vs [0,6] → 대미지 0", () => {
    expect(resolveExchange([6, 6], [0, 6]).damage).toBe(0);
  });

  it("focus 미지정([0]만) → 상쇄 없음, focus null", () => {
    const r = resolveExchange([3, 4], [0]);
    expect(r.focus).toBe(null);
    expect(r.damage).toBe(2);
    expect(r.defenseMarks).toEqual([]);
  });

  it("일반 모드는 focus null", () => {
    expect(resolveExchange([4, 4, 2], [4, 5]).focus).toBe(null);
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

describe("buildBattleCard", () => {
  it("[4,4,2] vs [4,5]: damage 2, 라벨 패스스루, dieHtml 클래스", () => {
    const c = buildBattleCard({
      round: 1,
      exchange: 1,
      attacker: "이졸데",
      defender: "고블린",
      attack: [4, 4, 2],
      defense: [4, 5],
    });
    expect(c).toMatchObject({
      round: 1,
      exchange: 1,
      attacker: "이졸데",
      defender: "고블린",
      damage: 2,
    });
    expect(c.attackDiceHtml).toContain("mg-die--valid");
    expect(c.attackDiceHtml).toContain("mg-die--cancel");
    expect(c.defenseDiceHtml).toContain("mg-die--cancel");
    expect(c.defenseDiceHtml).toContain("is-leftover");
  });
});

describe("buildBoostCard", () => {
  it("struck 1:1 소거: dice [5,3], struck [3] → 3=cancel, 5=valid", () => {
    const c = buildBoostCard({ who: "이졸데", n: 2, dice: [5, 3], struck: [3] });
    expect(c.dice).toEqual([
      { v: 5, st: "valid" },
      { v: 3, st: "cancel" },
    ]);
    expect(c.who).toBe("이졸데");
    expect(c.n).toBe(2);
    expect(c).not.toHaveProperty("sum");
  });
  it("중복 struck: dice [4,4,2], struck [4,4] → 4·4 cancel, 2 valid", () => {
    const c = buildBoostCard({ who: "x", n: 3, dice: [4, 4, 2], struck: [4, 4] });
    expect(c.dice.map((d) => d.st)).toEqual(["cancel", "cancel", "valid"]);
  });
  it("n 미지정 시 dice.length", () => {
    expect(buildBoostCard({ who: "x", dice: [1, 2] }).n).toBe(2);
  });
});
