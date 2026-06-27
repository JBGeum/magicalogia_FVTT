import { MAGICALOGIA } from "../helpers/config.mjs";

/**
 * 마법표 셀별 목표치(TN)·owned 계산 (순수, Foundry 비의존).
 *
 * 거리 모델: 표를 2D 그래프로 본다.
 *   - 세로: 행 인덱스 차 |i-j| (순환 없음).
 *   - 가로: 열 사이에 gap이 1칸씩 끼어 인접 열까지 2칸(열→gap→열).
 *     소속영역(domain) 열의 양옆 gap은 칠해져 0칸으로 생략된다.
 *   - wrap=true면 어둠↔별 사이에 wrap-gap이 생겨 원형이 된다.
 *   - TN = 5 + (가장 가까운 보유 특기까지 거리). 보유 자신 = 0 → TN 5.
 *
 * 모든 속성 열은 동등(어둠도 이름만 어둠인 일반 속성). 상흔(scar)은 특기 사용·거리와 무관한
 * 별도 룰이라 여기서 다루지 않는다. TN이 있는 셀은 모두 판정 대상이다.
 *
 * @param {{owned:Object, domain:?string, wrap:boolean}} state
 * @returns {Array} 열별 { key,num,title,domainActive, cells:[{name,index,value,tn,owned}] }
 */
export function computeTable(state) {
  const attrs = MAGICALOGIA.attributes;
  const rows = MAGICALOGIA.rows;
  const N = attrs.length;
  const colIndex = Object.fromEntries(attrs.map((a, i) => [a.key, i]));
  const domainIdx =
    state.domain != null && colIndex[state.domain] != null ? colIndex[state.domain] : null;

  const owned = state.owned ?? {};
  const isOwned = (key, i) => Boolean(owned[key]?.[i]);

  // 보유 특기 좌표 목록 (anchor) — 어둠/상흔 포함.
  const anchors = [];
  for (const a of attrs) {
    for (let i = 0; i < rows.length; i++) {
      if (isOwned(a.key, i)) anchors.push({ c: colIndex[a.key], i });
    }
  }

  // gap g(0..N-1)는 열 g와 (g+1)%N 사이. domain은 좌측 gap((d-1+N)%N)과 우측 gap(d)을 칠한다.
  const isGapFilled = (g) =>
    domainIdx != null && (g === (domainIdx - 1 + N) % N || g === domainIdx);

  // 두 열 사이 가로 거리(칸 수). wrap이면 양 방향 중 최소.
  function horizontalDist(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    // 직선: gap 인덱스 lo..hi-1 사용.
    let directFilled = 0;
    for (let g = lo; g < hi; g++) if (isGapFilled(g)) directFilled++;
    const direct = 2 * (hi - lo) - directFilled;
    if (!state.wrap) return direct;
    // 반대 호: gap 인덱스 hi..N-1, 0..lo-1 사용 (wrap-gap = N-1 포함).
    let aroundFilled = 0;
    for (let g = hi; g <= N - 1; g++) if (isGapFilled(g)) aroundFilled++;
    for (let g = 0; g < lo; g++) if (isGapFilled(g)) aroundFilled++;
    const around = 2 * (N - (hi - lo)) - aroundFilled;
    return Math.min(direct, around);
  }

  return attrs.map((a) => {
    const c = colIndex[a.key];
    const cells = MAGICALOGIA.chart[a.key].map((name, i) => {
      let tn = null;
      for (const anchor of anchors) {
        const dist = Math.abs(i - anchor.i) + horizontalDist(c, anchor.c);
        const t = 5 + dist;
        if (tn == null || t < tn) tn = t;
      }
      return {
        name,
        index: i,
        value: rows[i],
        tn,
        owned: isOwned(a.key, i),
      };
    });
    return {
      key: a.key,
      num: a.num,
      title: a.title,
      domainActive: domainIdx === c,
      cells,
    };
  });
}

// 차트 특기명 → 좌표 역매핑. 66 이름은 모두 고유(specialty-table.test가 가드).
const SPECIALTY_INDEX = (() => {
  const idx = {};
  for (const a of MAGICALOGIA.attributes) {
    MAGICALOGIA.chart[a.key].forEach((name, row) => {
      idx[name] = { col: a.key, row };
    });
  }
  return idx;
})();

/** 차트 특기명 → {col,row}(없으면 null). */
export function findSpecialtyCoord(name) {
  return SPECIALTY_INDEX[name] ?? null;
}

/**
 * 가변 특기 결정 (순수). 영역 + 굴림 → chart 특기.
 * @param {string} area 영역 key. ""=전체 가변(attrDie로 영역 결정), "star".."dark"=고정 영역
 * @param {{attrDie?:number, skillSum:number}} rolls attrDie 1..6(전체 가변만), skillSum 2..12
 * @returns {string}
 */
export function resolveVariableSkill(area, { attrDie, skillSum }) {
  const attrKey = area || MAGICALOGIA.attributes[attrDie - 1].key;
  return MAGICALOGIA.chart[attrKey][skillSum - 2];
}

/** 차트 전체 특기명 평면 배열(시트 datalist용). */
export const SPECIALTY_NAMES = MAGICALOGIA.attributes.flatMap((a) => MAGICALOGIA.chart[a.key]);

/** picker용: 열 우선 chart를 11행×6열(행 우선)로 전치. */
export function specialtyGrid() {
  return MAGICALOGIA.rows.map((num, i) => ({
    num,
    cells: MAGICALOGIA.attributes.map((a) => ({ col: a.key, name: MAGICALOGIA.chart[a.key][i] })),
  }));
}
