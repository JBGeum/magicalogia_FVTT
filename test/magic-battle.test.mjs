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

describe("resolveExchange — 집중 방어 / 일반화", () => {
  it("[4,4,4,2] vs [4,0] → 눈4 전부 상쇄, 유효 [2], damage 1, focus [4]", () => {
    const r = resolveExchange([4, 4, 4, 2], [4, 0]);
    expect(r.focus).toEqual([4]);
    expect(r.surviving).toEqual([2]);
    expect(r.damage).toBe(1);
    expect(r.defenseMarks).toEqual([{ v: 4, st: "focus" }]);
  });

  it("집중 2-눈: [2,2,4,3,5] vs [2,4,0,3] → 2·4 전부 + 3 1:1 상쇄, 유효 [5], damage 1", () => {
    const r = resolveExchange([2, 2, 4, 3, 5], [2, 4, 0, 3]);
    expect(r.focus).toEqual([2, 4]);
    expect(r.surviving).toEqual([5]);
    expect(r.damage).toBe(1);
    expect(r.defenseMarks).toEqual([
      { v: 2, st: "focus" },
      { v: 4, st: "focus" },
      { v: 3, st: "cancel" },
    ]);
  });

  it("빗나감: [1,2,3] vs [5,0] → 상쇄 없음, damage 3, focus [5]", () => {
    const r = resolveExchange([1, 2, 3], [5, 0]);
    expect(r.focus).toEqual([5]);
    expect(r.damage).toBe(3);
  });

  it("focus 미지정([0]만): [3,4] vs [0] → focus [], 0뒤 없음 → damage 2", () => {
    const r = resolveExchange([3, 4], [0]);
    expect(r.focus).toEqual([]);
    expect(r.damage).toBe(2);
    expect(r.defenseMarks).toEqual([]);
  });

  it("일반 모드는 focus []", () => {
    expect(resolveExchange([4, 4, 2], [4, 5]).focus).toEqual([]);
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
  it("witness 표식: renderBattleDie(4,'valid',true) → mg-die--witness 포함", () => {
    const h = renderBattleDie(4, "valid", true);
    expect(h).toContain("mg-die--witness");
    expect(h).toContain("mg-die--valid");
  });
  it("witness 기본 false: 표식 없음", () => {
    expect(renderBattleDie(4, "valid")).not.toContain("mg-die--witness");
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
    expect(c.focus).toEqual([]);
    expect(c.attackDiceHtml).toContain("mg-die--valid");
    expect(c.attackDiceHtml).toContain("mg-die--cancel");
    expect(c.defenseDiceHtml).toContain("mg-die--cancel");
    expect(c.defenseDiceHtml).toContain("is-leftover");
  });
});

describe("buildBattleCard — 입회인", () => {
  it("입회 없음: 기존과 동일(focus [], witnessSummary [])", () => {
    const c = buildBattleCard({
      round: 1,
      exchange: 1,
      attacker: "이졸데",
      defender: "고블린",
      attack: [4, 4, 2],
      defense: [4, 5],
    });
    expect(c.damage).toBe(2);
    expect(c.focus).toEqual([]);
    expect(c.witnessSummary).toEqual([]);
    expect(c.hasWitness).toBe(false);
    expect(c.attackDiceHtml).not.toContain("mg-die--witness");
  });

  it("입회 공격 가산: attack [4] + 입회공격 [6] vs [4] → damage 1, 6에 witness 표식", () => {
    const c = buildBattleCard({
      round: 1,
      exchange: 1,
      attacker: "A",
      defender: "B",
      attack: [4],
      defense: [4],
      witnesses: [{ actorId: "x", name: "케이", side: "attack", dice: [6] }],
    });
    expect(c.damage).toBe(1); // 4 상쇄, 6 유효
    expect(c.attackDiceHtml).toContain("mg-die--witness");
    expect(c.witnessSummary).toEqual([
      { name: "케이", side: "attack", dice: [{ v: 6, st: "valid" }] },
    ]);
    expect(c.hasWitness).toBe(true);
  });

  it("입회 방어 + 집중: attack [4,4,6] vs 집중[4,0] + 입회방어 [6] → 4·4 focus, 6 1:1 → damage 0", () => {
    const c = buildBattleCard({
      round: 1,
      exchange: 1,
      attacker: "A",
      defender: "B",
      attack: [4, 4, 6],
      defense: [4, 0],
      witnesses: [{ actorId: "y", name: "미라", side: "defense", dice: [6] }],
    });
    expect(c.focus).toEqual([4]);
    expect(c.damage).toBe(0);
    expect(c.defenseDiceHtml).toContain("mg-die--witness");
    expect(c.witnessSummary).toEqual([
      { name: "미라", side: "defense", dice: [{ v: 6, st: "cancel" }] },
    ]);
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

  it("집중방어 focus: dice [4,4,2], focus 4 → 눈4 전부 cancel(무제한), 2 valid", () => {
    const c = buildBoostCard({ who: "x", n: 3, dice: [4, 4, 2], struck: [], focus: 4 });
    expect(c.dice.map((d) => d.st)).toEqual(["cancel", "cancel", "valid"]);
  });

  it("focus + struck 혼합: dice [4,5,5], struck [5], focus 4 → 4 focus·5 struck1:1 cancel, 5 valid", () => {
    const c = buildBoostCard({ who: "x", n: 3, dice: [4, 5, 5], struck: [5], focus: 4 });
    expect(c.dice.map((d) => d.st)).toEqual(["cancel", "cancel", "valid"]);
  });

  it("focus는 struck 항목을 소비하지 않음: dice [4,4], struck [4], focus 4 → 둘 다 focus로 cancel(struck 미소비)", () => {
    const c = buildBoostCard({ who: "x", n: 2, dice: [4, 4], struck: [4], focus: 4 });
    expect(c.dice.map((d) => d.st)).toEqual(["cancel", "cancel"]);
  });
});
