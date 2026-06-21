import { describe, it, expect } from "vitest";
import { buildChargeCard } from "../module/system/spell-charge.mjs";

describe("buildChargeCard", () => {
  it("증가: 2→4 → delta +2, up, ▲ +2, 미완료", () => {
    expect(
      buildChargeCard({ who: "이졸데", name: "조우", max: 6, before: 2, after: 4 }),
    ).toMatchObject({ delta: 2, up: true, deltaText: "▲ +2", ready: false, spent: false });
  });

  it("완료: 5→6(max 6) → ready, ▲ +1", () => {
    expect(
      buildChargeCard({ who: "이졸데", name: "폭렬", max: 6, before: 5, after: 6 }),
    ).toMatchObject({ delta: 1, up: true, deltaText: "▲ +1", ready: true, spent: false });
  });

  it("소비: 3→0 → delta -3, down, ▼ 3, spent", () => {
    expect(
      buildChargeCard({ who: "이졸데", name: "대마법", max: 6, before: 3, after: 0 }),
    ).toMatchObject({ delta: -3, up: false, deltaText: "▼ 3", ready: false, spent: true });
  });

  it("경계: after===max → ready true", () => {
    expect(buildChargeCard({ who: "x", name: "y", max: 6, before: 6, after: 6 }).ready).toBe(true);
  });

  it("who/name/max/before/after 패스스루", () => {
    expect(
      buildChargeCard({ who: "이졸데", name: "조우", max: 6, before: 2, after: 4 }),
    ).toMatchObject({ who: "이졸데", name: "조우", max: 6, before: 2, after: 4 });
  });
});
