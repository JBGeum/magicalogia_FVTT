import { describe, it, expect } from "vitest";
import { buildStatCard } from "../module/system/stat-card.mjs";

describe("buildStatCard", () => {
  it("증가 시 up=true, deltaText '▲ +N', max 포함", () => {
    const c = buildStatCard({ who: "아리아", label: "마력", before: 3, after: 7, max: 10 });
    expect(c.delta).toBe(4);
    expect(c.up).toBe(true);
    expect(c.deltaText).toBe("▲ +4");
    expect(c.hasMax).toBe(true);
    expect(c.max).toBe(10);
  });

  it("감소 시 up=false, deltaText '▼ N'", () => {
    const c = buildStatCard({ who: "아리아", label: "마력", before: 5, after: 2, max: 10 });
    expect(c.delta).toBe(-3);
    expect(c.up).toBe(false);
    expect(c.deltaText).toBe("▼ 3");
  });

  it("max 미지정이면 hasMax=false, max=null", () => {
    const c = buildStatCard({ who: "아리아", label: "일시적 마력", before: 0, after: 2 });
    expect(c.hasMax).toBe(false);
    expect(c.max).toBe(null);
  });
});
