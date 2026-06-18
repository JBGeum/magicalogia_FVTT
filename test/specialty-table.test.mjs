import { describe, it, expect } from "vitest";
import { computeTable } from "../module/system/specialty-table.mjs";

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
      scarDomains: {},
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
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "force", 3).tn).toBe(7);
  });

  it("소속영역이면 양옆 gap 생략 → 인접 열 거리 1 → TN 6 (꽃 ← 숲/흐름)", () => {
    // 꽃 = beast[2](행4), 숲 = star[2], 흐름 = force[2]
    const t = computeTable({
      owned: own([["beast", 2]]),
      domain: "beast",
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "star", 2).tn).toBe(6);
    expect(cell(t, "force", 2).tn).toBe(6);
  });

  it("세로 이동도 +1 (같은 열 2행 차 → TN 7)", () => {
    const t = computeTable({
      owned: own([["star", 0]]),
      domain: null,
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "star", 2).tn).toBe(7);
  });

  it("어둠 열은 rollable=false, 보유 시 anchor로는 유효", () => {
    const t = computeTable({
      owned: own([["dark", 0]]),
      domain: null,
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "dark", 0).rollable).toBe(false);
    expect(cell(t, "dark", 0).owned).toBe(true);
    // 어둠 보유가 인접 거리에 반영되는지: dark[0] 기준 dream[0]은 거리 2 → TN 7
    expect(cell(t, "dream", 0).tn).toBe(7);
  });

  it("상흔영역 열은 rollable=false", () => {
    const t = computeTable({
      owned: own([["song", 0]]),
      domain: null,
      scarDomains: { song: true },
      wrap: false,
    });
    expect(cell(t, "song", 0).rollable).toBe(false);
  });

  it("일반 열은 rollable=true", () => {
    const t = computeTable({
      owned: own([["song", 0]]),
      domain: null,
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "song", 0).rollable).toBe(true);
  });

  it("보유 특기 0개면 tn=null, rollable=false 무관하게 tn 없음", () => {
    const t = computeTable({ owned: noOwn(), domain: null, scarDomains: {}, wrap: false });
    expect(cell(t, "star", 0).tn).toBeNull();
  });

  it("wrap=true면 어둠↔별이 인접 (거리 2 → TN 7)", () => {
    // 별 보유, 어둠 첫 행 거리: 직선은 멀지만 wrap으로 2
    const t = computeTable({
      owned: own([["star", 0]]),
      domain: null,
      scarDomains: {},
      wrap: true,
    });
    expect(cell(t, "dark", 0).tn).toBe(7);
  });
});
