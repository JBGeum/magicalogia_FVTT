import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const system = JSON.parse(readFileSync(join(root, "system.json"), "utf8"));

describe("system.json packs", () => {
  it("packs는 tables(RollTable)만 포함한다", () => {
    const names = (system.packs ?? []).map((p) => p.name);
    expect(names).toEqual(["tables"]);
  });

  it("archetypes/library pack은 제거되었다", () => {
    const names = (system.packs ?? []).map((p) => p.name);
    expect(names).not.toContain("archetypes");
    expect(names).not.toContain("library");
  });
});
