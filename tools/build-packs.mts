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

  // Foundry는 16자 영숫자 id만 유효(foundry.mjs validateId: /^[a-zA-Z0-9]{16}$/).
  // 아니면 로드 시 문서 id/uuid가 null이 되어 시트 편집·UUID 복사가 깨진다.
  const ID_RE = /^[A-Za-z0-9]{16}$/;
  let count = 0;
  if (existsSync(srcFile)) {
    const docs = JSON.parse(await readFile(srcFile, "utf8"));
    for (const doc of docs) {
      if (!ID_RE.test(doc._id ?? "")) {
        throw new Error(
          `[${name}] 잘못된 _id "${doc._id}" (${doc.name ?? "?"}) — 16자 영숫자 id만 허용(아니면 Foundry가 UUID를 못 만듦).`,
        );
      }
      doc._key = `!${collection}!${doc._id}`;
      // RollTable 등 embedded(results)도 각자 별도 키가 필요하다.
      if (Array.isArray(doc.results)) {
        for (const r of doc.results) {
          if (!ID_RE.test(r._id ?? "")) {
            throw new Error(
              `[${name}] 표 "${doc.name}"의 result _id "${r._id}" 가 16자 영숫자가 아님.`,
            );
          }
          r._key = `!${collection}.results!${doc._id}.${r._id}`;
        }
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
