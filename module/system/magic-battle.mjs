/**
 * 마법전 다이스 대결 — 순수 해결 로직 + Foundry 발행.
 * 공격/방어 비대칭 1:1 상쇄: 공격 다이스를 방어 다이스와 같은 눈끼리 1:1 매칭,
 * 남은(매칭 안 된) 공격 다이스 수 = 방어측 대미지.
 */

/**
 * 1:1 비대칭 상쇄. 소모된 방어 인덱스를 추적해 중복 눈도 정확히 1:1 소거.
 * @returns {{attackMarks:{v:number,st:string}[], defenseMarks:{v:number,st:string}[], surviving:number[], damage:number}}
 */
export function resolveExchange(attack, defense) {
  const usedIdx = new Set();
  const attackMarks = attack.map((v) => {
    const i = defense.findIndex((dv, idx) => dv === v && !usedIdx.has(idx));
    if (i > -1) {
      usedIdx.add(i);
      return { v, st: "cancel" };
    }
    return { v, st: "valid" };
  });
  const defenseMarks = defense.map((v, idx) =>
    usedIdx.has(idx) ? { v, st: "cancel" } : { v, st: "leftover" },
  );
  const surviving = attackMarks.filter((m) => m.st === "valid").map((m) => m.v);
  return { attackMarks, defenseMarks, surviving, damage: surviving.length };
}
