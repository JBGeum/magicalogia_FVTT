import { describe, it, expect } from "vitest";
import {
  resolveFamiliar,
  resolveSummonSkill,
  buildTokenName,
} from "../module/system/familiar-summon.mjs";

const spell = (system) => ({ system });

describe("resolveFamiliar", () => {
  it("familiarUuid 있으면 UUID 반환", () => {
    expect(resolveFamiliar(spell({ familiarUuid: "Actor.abc" }))).toBe("Actor.abc");
  });
  it("비었으면 null", () => {
    expect(resolveFamiliar(spell({ familiarUuid: "" }))).toBe(null);
    expect(resolveFamiliar(spell({ familiarUuid: "   " }))).toBe(null);
  });
});

describe("resolveSummonSkill", () => {
  it("비가변이면 지정특기 그대로(rolls 무시)", () => {
    expect(resolveSummonSkill(spell({ skill: "불꽃" }), { skillSum: 7 })).toBe("불꽃");
  });
  it("가변 + 고정영역: 2d6 합으로 row 결정 (force 합10 → 불꽃)", () => {
    // force 열 row 8 = "불꽃" (chart.force[8])
    expect(
      resolveSummonSkill(spell({ skill: "가변", familiarVarAttr: "force" }), { skillSum: 10 }),
    ).toBe("불꽃");
  });
  it("가변 + 완전가변: 1d6로 영역, 2d6로 row (attrDie3=force, 합10 → 불꽃)", () => {
    expect(
      resolveSummonSkill(spell({ skill: "가변", familiarVarAttr: "" }), {
        attrDie: 3,
        skillSum: 10,
      }),
    ).toBe("불꽃");
  });
  it("row 경계: 합2 → row0, 합12 → row10", () => {
    // star 열: chart.star[0]="황금", chart.star[10]="이게"
    expect(
      resolveSummonSkill(spell({ skill: "가변", familiarVarAttr: "star" }), { skillSum: 2 }),
    ).toBe("황금");
    expect(
      resolveSummonSkill(spell({ skill: "가변", familiarVarAttr: "star" }), { skillSum: 12 }),
    ).toBe("이게");
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
