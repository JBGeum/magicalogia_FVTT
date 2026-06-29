import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hbs = readFileSync(join(root, "templates/actor/character-sheet.hbs"), "utf8");

const FIELDS = [
  "system.abilities.attack",
  "system.abilities.defense",
  "system.abilities.source",
  "system.mp.value",
  "system.tempMp",
];

describe("능력치 증감 오버레이 마크업", () => {
  // adjust-stat 버튼 여는 태그를 모두 추출해 (field:delta) 쌍 집합으로 만든다.
  const tags = [...hbs.matchAll(/<button[^>]*data-action="adjust-stat"[^>]*>/g)];
  const pairs = new Set(
    tags.map((t) => {
      const field = /data-field="([^"]+)"/.exec(t[0])?.[1];
      const delta = /data-delta="(-?\d+)"/.exec(t[0])?.[1];
      return `${field}:${delta}`;
    }),
  );

  it("5개 필드 각각에 -1/+1 버튼이 정확히 존재한다", () => {
    const expected = new Set(FIELDS.flatMap((f) => [`${f}:-1`, `${f}:1`]));
    expect(pairs).toEqual(expected);
  });

  it("mp.max 에는 증감 버튼이 없다", () => {
    expect([...pairs].some((p) => p.startsWith("system.mp.max:"))).toBe(false);
  });
});
