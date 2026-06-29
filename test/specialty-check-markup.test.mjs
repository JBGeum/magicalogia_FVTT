import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hbs = readFileSync(join(root, "templates/actor/parts/magic-chart.hbs"), "utf8");

describe("특기표 불운/편집 마크업", () => {
  it("mg-check는 toggle-misfortune 액션이다(toggleSkill 아님)", () => {
    expect(hbs).toContain('data-action="toggle-misfortune"');
    expect(hbs).not.toContain('data-action="toggleSkill"');
  });

  it("mg-check ✓는 misfortune 기준으로 표시된다", () => {
    expect(hbs).toContain("this.misfortune");
  });

  it("습득 편집 모드 칩이 있다", () => {
    expect(hbs).toContain('data-action="toggle-skill-edit"');
  });

  it("특기명은 여전히 rollSpecialty 액션이다", () => {
    expect(hbs).toContain('data-action="rollSpecialty"');
  });

  it("셀 배경 is-on은 여전히 this.owned(습득) 기준이다", () => {
    expect(hbs).toContain("mg-chart__cell {{#if this.owned}}is-on");
  });
});
