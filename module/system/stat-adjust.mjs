/**
 * 능력치 수치를 delta만큼 증감하되 하한 0으로 클램프한다.
 * @param {number|null|undefined} current 현재값(없으면 0으로 취급)
 * @param {number} delta 증감폭(+1 / -1)
 * @returns {number} 0 이상의 새 값
 */
export function adjustStatValue(current, delta) {
  return Math.max(0, Number(current ?? 0) + delta);
}
