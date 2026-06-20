import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 라이트 테마가 다크의 모든 "색상" 토큰을 오버라이드하는지 정적 검증.
// 배경: 컴포넌트 SCSS는 --mg-* 기반이라, 라이트가 어떤 색상 토큰을 빠뜨리면
// 라이트 모드에서 그 요소만 다크 색으로 남는다(build로는 안 잡힘).
// 비색상 토큰(radius/row-h/head-h)은 테마 공통이라 오버라이드 대상이 아니다.

const tokensPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "scss",
  "theme",
  "_tokens.scss",
);
const NON_COLOR = new Set(["mg-radius", "mg-row-h", "mg-head-h"]);
const tokenKeys = (s) => new Set([...s.matchAll(/--(mg-[\w-]+)\s*:/g)].map((m) => m[1]));

describe("테마 토큰 완전성", () => {
  const text = readFileSync(tokensPath, "utf8");

  it(".magicalogia.theme-light 블록이 존재한다", () => {
    expect(text).toContain(".magicalogia.theme-light {");
  });

  it("라이트가 다크의 모든 색상 토큰을 오버라이드한다", () => {
    // 셀렉터의 여는 중괄호까지 앵커로 잡아 주석에 같은 문자열이 있어도 오분할되지 않게 한다.
    const idx = text.indexOf(".magicalogia.theme-light {");
    const darkKeys = tokenKeys(text.slice(0, idx));
    const lightKeys = tokenKeys(text.slice(idx));
    const missing = [...darkKeys].filter((k) => !NON_COLOR.has(k) && !lightKeys.has(k));
    expect(missing).toEqual([]);
  });
});
