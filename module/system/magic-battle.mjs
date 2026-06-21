/**
 * 마법전 다이스 대결 — 순수 해결 로직 + Foundry 발행.
 * 공격/방어 비대칭 1:1 상쇄: 공격 다이스를 방어 다이스와 같은 눈끼리 1:1 매칭,
 * 남은(매칭 안 된) 공격 다이스 수 = 방어측 대미지.
 */

// d6 pip 배치 (0..8 = 3×3 셀 인덱스). 시안 chat-card-helpers.js와 동일.
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/**
 * 다이스 한 면을 pip 그리드 markup으로. st: "valid"|"cancel"|"leftover".
 * leftover=중립 플레인 면(.mg-die만). 공개 카드 전용(시안 "back"은 v1 미사용).
 */
export function renderBattleDie(v, st) {
  let cells = "";
  for (let i = 0; i < 9; i++) cells += PIPS[v].includes(i) ? "<i></i>" : "<span></span>";
  const mod = st === "valid" ? " mg-die--valid" : st === "cancel" ? " mg-die--cancel" : "";
  return `<span class="mg-die-wrap is-${st}"><span class="mg-die${mod}">${cells}</span><span class="mg-die-num">${v}</span></span>`;
}

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

/** 전투 카드 템플릿 데이터(순수). 공개 시 발행 전제. */
export function buildBattleCard({ round, exchange, attacker, defender, attack, defense }) {
  const { attackMarks, defenseMarks, damage } = resolveExchange(attack, defense);
  return {
    round,
    exchange,
    attacker,
    defender,
    damage,
    attackDiceHtml: attackMarks.map((m) => renderBattleDie(m.v, m.st)).join(""),
    defenseDiceHtml: defenseMarks.map((m) => renderBattleDie(m.v, m.st)).join(""),
  };
}
