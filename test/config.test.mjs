import { describe, it, expect } from "vitest";
import { MAGICALOGIA } from "../module/helpers/config.mjs";

describe("MAGICALOGIA config", () => {
  it("6속성이 고정 순서로 정의된다", () => {
    expect(MAGICALOGIA.attributes.map((a) => a.key)).toEqual([
      "star",
      "beast",
      "force",
      "song",
      "dream",
      "dark",
    ]);
  });
  it("어둠만 dark=true", () => {
    const dark = MAGICALOGIA.attributes.filter((a) => a.dark).map((a) => a.key);
    expect(dark).toEqual(["dark"]);
  });
  it("각 속성 특기 이름이 11개씩 있다", () => {
    for (const a of MAGICALOGIA.attributes) {
      expect(MAGICALOGIA.chart[a.key]).toHaveLength(11);
    }
  });
  it("행(출목)은 2..12", () => {
    expect(MAGICALOGIA.rows).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it("상태이상 8종", () => {
    expect(MAGICALOGIA.statuses).toHaveLength(8);
    expect(MAGICALOGIA.statuses[0]).toEqual({ key: "seal", label: "봉인" });
  });
});
