import { describe, it, expect } from "vitest";
import { formatCost } from "../module/helpers/config.mjs";

describe("formatCost", () => {
  it("area 미선택이면 —", () => {
    expect(formatCost({ area: "", count: 0 })).toBe("—");
  });
  it("area+count → 별×2", () => {
    expect(formatCost({ area: "star", count: 2 })).toBe("별×2");
  });
  it("count 0이면 라벨만 (노래)", () => {
    expect(formatCost({ area: "song", count: 0 })).toBe("노래");
  });
  it("none → 없음", () => {
    expect(formatCost({ area: "none", count: 0 })).toBe("없음");
  });
  it("cost가 undefined면 —", () => {
    expect(formatCost(undefined)).toBe("—");
  });
});
