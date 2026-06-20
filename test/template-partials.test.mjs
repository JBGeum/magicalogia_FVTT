import { describe, it, expect } from "vitest";
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// templates/의 모든 .hbs partial 참조가 Foundry loadTemplates 규약과 맞는지 정적 검증.
// 배경: loadTemplates(배열)은 partial을 전체 경로로만 등록하고 짧은 이름 별칭을 만들지 않는다.
// 따라서 `{{> mg-svg-chart-icon}}` 같은 짧은 이름 참조는 런타임에만 "could not be found"로
// 터진다(build/단위테스트로는 안 잡힘). 이 테스트가 그 회귀를 막는다.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templatesDir = join(root, "templates");
const SYSTEM_PREFIX = "systems/magicalogia/";

// {{> "전체/경로.hbs" ...}} → group1, {{> 짧은이름 ...}} → group2
const PARTIAL_RE = /\{\{>\s*(?:"([^"]+)"|([^\s}]+))/g;

function collectHbs(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectHbs(full));
    else if (entry.endsWith(".hbs")) out.push(full);
  }
  return out;
}

describe("Handlebars partial 참조", () => {
  const files = collectHbs(templatesDir);

  it("모든 partial 참조는 따옴표로 감싼 전체 경로여야 한다(짧은 이름 금지)", () => {
    const violations = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(PARTIAL_RE)) {
        if (m[2]) violations.push(`${file}: {{> ${m[2]} ...}}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("참조된 전체 경로 partial 파일이 실제로 존재한다", () => {
    const missing = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(PARTIAL_RE)) {
        const path = m[1];
        if (!path) continue;
        if (!path.startsWith(SYSTEM_PREFIX)) {
          missing.push(`${file}: ${path} (systems/magicalogia/ 프리픽스 아님)`);
          continue;
        }
        const fsPath = join(root, path.slice(SYSTEM_PREFIX.length));
        if (!existsSync(fsPath)) missing.push(`${file}: ${path} (파일 없음)`);
      }
    }
    expect(missing).toEqual([]);
  });
});
