/**
 * dist/ 를 Foundry의 Data/systems/magicalogia 로 심볼릭 링크.
 *
 * 사용법:
 *   $env:FOUNDRY_DATA_PATH = "C:\Users\me\AppData\Local\FoundryVTT\Data"
 *   npm run link:foundry
 *   # 또는: npm run link:foundry -- "C:\path\to\Data"
 */
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { platform } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SYSTEM_ID = "magicalogia";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const distDir = path.join(repoRoot, "dist");

function getFoundryDataPath(): string {
  const dataPath = process.argv[2] ?? process.env.FOUNDRY_DATA_PATH;
  if (!dataPath) {
    console.error(
      [
        "Foundry data 경로를 찾을 수 없습니다. 다음 중 하나로 지정하세요:",
        '  - 환경변수: $env:FOUNDRY_DATA_PATH = "<path-to-Data>"',
        '  - 명령 인자: npm run link:foundry -- "<path-to-Data>"',
        "참고(Windows 기본): C:\\Users\\<USER>\\AppData\\Local\\FoundryVTT\\Data",
      ].join("\n"),
    );
    process.exit(1);
  }
  return path.resolve(dataPath);
}

function ensureDistBuilt(): void {
  if (!existsSync(distDir)) {
    console.error(`dist/ 가 없습니다. 먼저 \`npm run build\` 실행. (경로: ${distDir})`);
    process.exit(1);
  }
}

function ensureSystemsDir(dataPath: string): string {
  const systemsDir = path.join(dataPath, "Data", "systems");
  if (!existsSync(systemsDir)) {
    const alt = path.join(dataPath, "systems");
    if (existsSync(alt)) return alt;
    mkdirSync(systemsDir, { recursive: true });
  }
  return systemsDir;
}

function linkDist(target: string, link: string): void {
  if (lstatSync(link, { throwIfNoEntry: false })) {
    const stat = lstatSync(link);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      rmSync(link, { recursive: true, force: true });
    } else {
      console.error(`기존 파일을 덮어쓰지 않습니다: ${link}`);
      process.exit(1);
    }
  }
  const type = platform() === "win32" ? "junction" : "dir";
  symlinkSync(target, link, type);
}

function main(): void {
  ensureDistBuilt();
  const dataPath = getFoundryDataPath();
  const systemsDir = ensureSystemsDir(dataPath);
  const linkPath = path.join(systemsDir, SYSTEM_ID);
  linkDist(distDir, linkPath);
  console.info("[link-to-foundry] 링크 생성 완료");
  console.info(`  source: ${distDir}`);
  console.info(`  target: ${linkPath}`);
  console.info("\nFoundry 재시작 후 시스템 목록에서 Magicalogia를 확인하세요.");
}

main();
