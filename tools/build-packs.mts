import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { fileURLToPath } from "node:url";
import { rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * packs/_source/<name>.json (문서 배열) → dist/packs/<name> (LevelDB) 컴파일.
 *
 * 각 문서엔 16자 _id가 있어야 한다(Foundry randomID 형식). collection은 LevelDB 키
 * 접두사 — RollTable→"tables", Item→"items", Actor→"actors". system.json packs[].path
 * (= "packs/<name>")·type 과 정합해야 한다. PACKS가 비면 no-op.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PACKS: { name: string; collection: string }[] = [
  { name: "tables", collection: "tables" },
  { name: "archetypes", collection: "actors" },
  { name: "library", collection: "items" },
];

for (const { name, collection } of PACKS) {
  const srcFile = path.join(ROOT, "packs", "_source", `${name}.json`);
  const dest = path.join(ROOT, "dist", "packs", name);
  const staging = path.join(ROOT, "dist", ".pack-staging", name);

  await rm(dest, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  let count = 0;
  if (existsSync(srcFile)) {
    const docs = JSON.parse(await readFile(srcFile, "utf8"));
    for (const doc of docs) {
      doc._key = `!${collection}!${doc._id}`;
      // RollTable 등 embedded(results)도 각자 별도 키가 필요하다.
      if (Array.isArray(doc.results)) {
        for (const r of doc.results) r._key = `!${collection}.results!${doc._id}.${r._id}`;
      }
      await writeFile(path.join(staging, `${doc._id}.json`), JSON.stringify(doc));
      count++;
    }
  }

  await compilePack(staging, dest, { log: true });
  await rm(staging, { recursive: true, force: true });
  console.log(`[build] ${name}: ${count}개`);
}

console.log(`[build:packs] 완료 — 팩 ${PACKS.length}개`);
