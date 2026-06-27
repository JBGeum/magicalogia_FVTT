/**
 * LevelDB 팩 실측 — 엔트리 수·_id·name 덤프. 빌드 산출물/배포본 검증용.
 * 사용: node tools/inspect-pack.mjs <pack-dir>
 *   예) node tools/inspect-pack.mjs dist/packs/archetypes
 *   예) node tools/inspect-pack.mjs /srv/foundry/Data/systems/magicalogia/packs/archetypes
 * classic-level 의존 — 서버라면 Foundry 번들 옆에서 실행:
 *   cp tools/inspect-pack.mjs <foundry>/resources/app/  (node_modules/classic-level 인접)
 *   node <foundry>/resources/app/inspect-pack.mjs <pack-dir>
 */
import { ClassicLevel } from "classic-level";

const dir = process.argv[2];
if (!dir) {
  console.error("사용: node inspect-pack.mjs <pack-dir>");
  process.exit(1);
}

// abstract-level 버전 차에 안전하도록 명시적으로 연다(deferred iterator race 회피).
const db = new ClassicLevel(dir, { valueEncoding: "json", createIfMissing: false });
await db.open();

let total = 0;
let noId = 0;
const names = new Map();
const rows = [];
try {
  for await (const [key, v] of db.iterator()) {
    const seg = key.split("!"); // ["", collection, id]
    if (seg.length !== 3 || seg[1].includes(".")) continue; // 최상위 문서만(embedded 제외)
    total++;
    if (!v?._id) noId++;
    const nm = v?.name ?? "(no name)";
    names.set(nm, (names.get(nm) ?? 0) + 1);
    rows.push(`${v?._id ?? "(NO _id)"}\t${nm}\tkey=${key}`);
  }
} finally {
  await db.close();
}

console.log(rows.join("\n"));
const dups = [...names].filter(([, n]) => n > 1);
console.log(
  `\n총 ${total}개 | _id 누락 ${noId}개 | 중복: ${dups.length ? dups.map(([n, c]) => `${n}×${c}`).join(", ") : "없음"}`,
);
