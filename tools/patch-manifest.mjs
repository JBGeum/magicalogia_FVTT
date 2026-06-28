import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * system.json manifest에 릴리스 메타데이터(버전/URL)를 주입한다.
 * 입력을 변형하지 않고 새 객체를 반환한다.
 * @param {object} manifest 원본 system.json 객체
 * @param {{ version: string, repo: string, tag: string }} opts
 * @returns {object} 패치된 새 객체
 */
export function patchManifest(manifest, { version, repo, tag }) {
  const base = `https://github.com/${repo}`;
  return {
    ...manifest,
    version,
    url: base,
    manifest: `${base}/releases/latest/download/system.json`,
    download: `${base}/releases/download/${tag}/magicalogia.zip`,
  };
}

function runCli() {
  const [version, repo, tag] = process.argv.slice(2);
  if (!version || !repo || !tag) {
    console.error("Usage: node tools/patch-manifest.mjs <version> <repo> <tag>");
    process.exit(1);
  }
  const file = "system.json";
  const current = JSON.parse(readFileSync(file, "utf8"));
  const patched = patchManifest(current, { version, repo, tag });
  writeFileSync(file, JSON.stringify(patched, null, 2) + "\n");
  console.log(`Patched ${file}: version=${version}, tag=${tag}`);
}

// 직접 실행될 때만 CLI 동작(테스트 import 시에는 동작 안 함)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
