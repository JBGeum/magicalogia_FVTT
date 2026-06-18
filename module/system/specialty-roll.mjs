/**
 * 2d6 특기 판정 분류 (순수).
 *   (1,1) = 펌블(자동 실패), (6,6) = 스페셜(자동 성공),
 *   그 외 합 >= TN = 성공. 같은 눈 = 더블릿.
 *
 * @param {number} d1
 * @param {number} d2
 * @param {number} tn  목표치
 * @returns {{total:number, success:boolean, special:boolean, fumble:boolean, doublet:boolean}}
 */
export function classifyRoll(d1, d2, tn) {
  const total = d1 + d2;
  const doublet = d1 === d2;
  const fumble = d1 === 1 && d2 === 1;
  const special = d1 === 6 && d2 === 6;
  let success;
  if (fumble) success = false;
  else if (special) success = true;
  else success = total >= tn;
  return { total, success, special, fumble, doublet };
}
