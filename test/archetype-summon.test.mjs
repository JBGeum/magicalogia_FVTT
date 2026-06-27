import { describe, it, expect } from "vitest";
import {
  resolveArchetype,
  resolveSummonSkill,
  buildTokenName,
} from "../module/system/archetype-summon.mjs";

const spell = (system) => ({ system });

describe("resolveArchetype", () => {
  it("archetypeUuid 있으면 UUID 반환", () => {
    expect(resolveArchetype(spell({ archetypeUuid: "Actor.abc" }))).toBe("Actor.abc");
  });
  it("비었으면 null", () => {
    expect(resolveArchetype(spell({ archetypeUuid: "" }))).toBe(null);
    expect(resolveArchetype(spell({ archetypeUuid: "   " }))).toBe(null);
  });
});

describe("resolveSummonSkill", () => {
  it("비가변이면 지정특기 그대로(rolls 무시)", () => {
    expect(resolveSummonSkill(spell({ skill: "불꽃" }), { skillSum: 7 })).toBe("불꽃");
  });
  it("가변 + 고정영역: 2d6 합으로 row 결정 (force 합10 → 불)", () => {
    // force 열 row 8 = "불" (chart.force[8])
    expect(
      resolveSummonSkill(spell({ skill: "가변", archetypeVarAttr: "force" }), { skillSum: 10 }),
    ).toBe("불");
  });
  it("가변 + 완전가변: 1d6로 영역, 2d6로 row (attrDie3=force, 합10 → 불)", () => {
    expect(
      resolveSummonSkill(spell({ skill: "가변", archetypeVarAttr: "" }), {
        attrDie: 3,
        skillSum: 10,
      }),
    ).toBe("불");
  });
  it("row 경계: 합2 → row0, 합12 → row10", () => {
    // star 열: chart.star[0]="황금", chart.star[10]="이계"
    expect(
      resolveSummonSkill(spell({ skill: "가변", archetypeVarAttr: "star" }), { skillSum: 2 }),
    ).toBe("황금");
    expect(
      resolveSummonSkill(spell({ skill: "가변", archetypeVarAttr: "star" }), { skillSum: 12 }),
    ).toBe("이계");
  });
});

describe("buildTokenName", () => {
  it("템플릿 비면 마스터명", () => {
    expect(buildTokenName("기사", "", "불꽃")).toBe("기사");
  });
  it("{skill} 치환", () => {
    expect(buildTokenName("기사", "{skill}의 기사", "불꽃")).toBe("불꽃의 기사");
  });
});
