import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { fileURLToPath } from "node:url";
import { rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * packs/_source/<pack> (JSON) → dist/packs/<pack> (LevelDB) 컴파일.
 * PACKS가 비어 있으면 no-op. 팩 추가 시 PACKS에 이름을 더하고 system.json packs에도 등록한다.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Item 팩 이름 목록. system.json의 packs[].path 와 정합. 현재 없음. */
const ITEM_PACKS: string[] = [];

for (const pack of ITEM_PACKS) {
  const srcFile = path.join(ROOT, "packs", "_source", `${pack}.json`);
  const dest = path.join(ROOT, "dist", "packs", pack);
  const staging = path.join(ROOT, "dist", ".pack-staging", pack);

  await rm(dest, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  let count = 0;
  if (existsSync(srcFile)) {
    const items = JSON.parse(await readFile(srcFile, "utf8"));
    for (const item of items) {
      item._key = `!items!${item._id}`;
      await writeFile(path.join(staging, `${item._id}.json`), JSON.stringify(item));
      count++;
    }
  }

  await compilePack(staging, dest, { log: true });
  await rm(staging, { recursive: true, force: true });
  console.log(`[build] ${pack}: ${count}개 아이템`);
}

console.log(`[build:packs] 완료 — 팩 ${ITEM_PACKS.length}개`);
