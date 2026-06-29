import { describe, it, expect } from "vitest";
import {
  computeTable,
  findSpecialtyCoord,
  resolveVariableSkill,
  SPECIALTY_NAMES,
  specialtyGrid,
} from "../module/system/specialty-table.mjs";

// 빈 보유 맵
const noOwn = () => ({});
// 특정 (열,인덱스)만 보유한 맵 생성
function own(pairs) {
  const o = {};
  for (const [key, idx] of pairs) {
    o[key] ??= Array(11).fill(false);
    o[key][idx] = true;
  }
  return o;
}
// 결과에서 (열,인덱스) 셀 찾기
function cell(table, key, idx) {
  return table.find((c) => c.key === key).cells[idx];
}

describe("computeTable 거리/TN", () => {
  it("보유 특기 자신은 TN 5", () => {
    const t = computeTable({
      owned: own([["song", 3]]),
      domain: null,
      wrap: false,
    });
    expect(cell(t, "song", 3).tn).toBe(5);
    expect(cell(t, "song", 3).owned).toBe(true);
  });

  it("인접 열 같은 행은 gap 포함 거리 2 → TN 7 (물 ← 이별)", () => {
    // 이별 = song[3](행5), 물 = force[3](행5)
    const t = computeTable({
      owned: own([["song", 3]]),
      domain: null,
      wrap: false,
    });
    expect(cell(t, "force", 3).tn).toBe(7);
  });

  it("소속영역이면 양옆 gap 생략 → 인접 열 거리 1 → TN 6 (꽃 ← 숲/흐름)", () => {
    // 꽃 = beast[2](행4), 숲 = star[2], 흐름 = force[2]
    const t = computeTable({
      owned: own([["beast", 2]]),
      domain: "beast",
      wrap: false,
    });
    expect(cell(t, "star", 2).tn).toBe(6);
    expect(cell(t, "force", 2).tn).toBe(6);
  });

  it("세로 이동도 +1 (같은 열 2행 차 → TN 7)", () => {
    const t = computeTable({
      owned: own([["star", 0]]),
      domain: null,
      wrap: false,
    });
    expect(cell(t, "star", 2).tn).toBe(7);
  });

  it("어둠도 일반 속성 — 보유 시 TN 5, anchor로 인접 거리 반영", () => {
    const t = computeTable({
      owned: own([["dark", 0]]),
      domain: null,
      wrap: false,
    });
    expect(cell(t, "dark", 0).tn).toBe(5);
    expect(cell(t, "dark", 0).owned).toBe(true);
    // dark[0] 기준 dream[0]은 거리 2 → TN 7
    expect(cell(t, "dream", 0).tn).toBe(7);
  });

  it("보유 특기 0개면 tn=null", () => {
    const t = computeTable({ owned: noOwn(), domain: null, wrap: false });
    expect(cell(t, "star", 0).tn).toBeNull();
  });

  it("wrap=true면 어둠↔별이 인접 (거리 2 → TN 7)", () => {
    // 별 보유, 어둠 첫 행 거리: 직선은 멀지만 wrap으로 2
    const t = computeTable({
      owned: own([["star", 0]]),
      domain: null,
      wrap: true,
    });
    expect(cell(t, "dark", 0).tn).toBe(7);
  });
});

describe("findSpecialtyCoord 차트 역매핑", () => {
  it("차트 66특기명은 모두 고유하다", () => {
    expect(SPECIALTY_NAMES.length).toBe(66);
    expect(new Set(SPECIALTY_NAMES).size).toBe(66);
  });
  it("이름을 좌표로 매핑한다 (이야기 → song/0)", () => {
    expect(findSpecialtyCoord("이야기")).toEqual({ col: "song", row: 0 });
  });
  it("마지막 어둠 특기 (죽음 → dark/10)", () => {
    expect(findSpecialtyCoord("죽음")).toEqual({ col: "dark", row: 10 });
  });
  it("차트에 없는 이름은 null", () => {
    expect(findSpecialtyCoord("없는특기")).toBeNull();
  });
});

describe("specialtyGrid 전치", () => {
  it("11행 × 각 6셀, 출목 라벨 2..12", () => {
    const g = specialtyGrid();
    expect(g).toHaveLength(11);
    expect(g[0].num).toBe(2);
    expect(g[10].num).toBe(12);
    for (const row of g) expect(row.cells).toHaveLength(6);
  });
  it("셀 위치가 차트와 일치 (이야기=row0 song, 죽음=row10 dark)", () => {
    const g = specialtyGrid();
    expect(g[0].cells[3]).toEqual({ col: "song", name: "이야기" });
    expect(g[10].cells[5]).toEqual({ col: "dark", name: "죽음" });
  });
});

describe("resolveVariableSkill 가변 특기 결정", () => {
  it("영역별: 2d6 합으로 행 결정 (force 합10 → 불)", () => {
    expect(resolveVariableSkill("force", { skillSum: 10 })).toBe("불");
  });
  it("전체 가변: 1d6로 영역, 2d6로 행 (attrDie3=force, 합10 → 불)", () => {
    expect(resolveVariableSkill("", { attrDie: 3, skillSum: 10 })).toBe("불");
  });
  it("행 경계: 합2 → row0, 합12 → row10 (star: 황금/이계)", () => {
    expect(resolveVariableSkill("star", { skillSum: 2 })).toBe("황금");
    expect(resolveVariableSkill("star", { skillSum: 12 })).toBe("이계");
  });
});

describe("computeTable misfortune", () => {
  it("misfortune을 셀에 패스스루하고 tn 계산에는 영향을 주지 않는다", () => {
    const owned = { star: [true, ...Array(10).fill(false)] }; // star[0] 습득 → anchor
    const misfortune = { star: [false, true, ...Array(9).fill(false)] }; // star[1] 불운
    const withM = computeTable({ owned, misfortune, domain: null, wrap: false });
    const withoutM = computeTable({ owned, domain: null, wrap: false });
    const starWith = withM.find((c) => c.key === "star").cells;
    const starWithout = withoutM.find((c) => c.key === "star").cells;
    expect(starWith[1].misfortune).toBe(true);
    expect(starWith[0].misfortune).toBe(false);
    // tn은 misfortune 유무와 무관하게 동일.
    expect(starWith.map((c) => c.tn)).toEqual(starWithout.map((c) => c.tn));
  });

  it("misfortune 인자가 없으면 모든 셀 misfortune=false", () => {
    const table = computeTable({
      owned: { star: [true, ...Array(10).fill(false)] },
      domain: null,
      wrap: false,
    });
    expect(table.every((col) => col.cells.every((c) => c.misfortune === false))).toBe(true);
  });
});

describe("computeTable scarActive", () => {
  it("scarAttrs에 포함된 열만 scarActive=true", () => {
    const t = computeTable({ owned: {}, scarAttrs: ["beast", "dark"], domain: null, wrap: false });
    const map = Object.fromEntries(t.map((c) => [c.key, c.scarActive]));
    expect(map.beast).toBe(true);
    expect(map.dark).toBe(true);
    expect(map.star).toBe(false);
  });

  it("scarAttrs가 없으면 모든 열 scarActive=false", () => {
    const t = computeTable({ owned: {}, domain: null, wrap: false });
    expect(t.every((c) => c.scarActive === false)).toBe(true);
  });

  it("scarAttrs는 tn 계산에 영향을 주지 않는다", () => {
    const owned = { star: [true, ...Array(10).fill(false)] };
    const withS = computeTable({ owned, scarAttrs: ["star"], domain: null, wrap: false });
    const withoutS = computeTable({ owned, domain: null, wrap: false });
    const starWith = withS.find((c) => c.key === "star").cells.map((c) => c.tn);
    const starWithout = withoutS.find((c) => c.key === "star").cells.map((c) => c.tn);
    expect(starWith).toEqual(starWithout);
  });
});
