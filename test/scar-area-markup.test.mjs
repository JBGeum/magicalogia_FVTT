import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const relations = readFileSync(join(root, "templates/actor/parts/relations.hbs"), "utf8");
const chart = readFileSync(join(root, "templates/actor/parts/magic-chart.hbs"), "utf8");
const anchorSheet = readFileSync(join(root, "templates/item/anchor-sheet.hbs"), "utf8");

describe("상흔 영역 마크업", () => {
  it("relations에는 상흔 영역 select가 없다(anchor 시트로 이동)", () => {
    expect(relations).not.toContain("data-scar-attr");
  });

  it("relations 행에 메모 셀(col-memo)이 있다", () => {
    expect(relations).toContain("col-memo");
  });

  it("magic-chart 열에 scarActive 기반 is-scar 클래스가 있다", () => {
    expect(chart).toContain("this.scarActive");
    expect(chart).toContain("is-scar");
  });

  it("anchor 시트에 상흔 영역 select와 메모 입력이 있다", () => {
    expect(anchorSheet).toContain('name="system.scarAttr"');
    expect(anchorSheet).toContain('name="system.memo"');
  });
});
