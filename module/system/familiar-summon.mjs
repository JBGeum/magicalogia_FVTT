import { MAGICALOGIA } from "../helpers/config.mjs";

/**
 * 소환 대상 UUID 해석 (순수).
 * @param {object} spell  spell 아이템(또는 {system})
 * @returns {string|null} familiarUuid (빈 값이면 null)
 */
export function resolveFamiliar(spell) {
  const uuid = (spell?.system?.familiarUuid ?? "").trim();
  return uuid || null;
}

/**
 * 소환 시 확정 지정특기명 (순수).
 * 비가변이면 spell.system.skill 그대로. 가변이면 굴림값으로 chart 조회.
 * @param {object} spell  spell 아이템(또는 {system})
 * @param {{attrDie?:number, skillSum:number}} rolls
 *   attrDie 1..6(완전가변일 때만), skillSum 2..12
 * @returns {string}
 */
export function resolveSummonSkill(spell, rolls) {
  const skill = spell?.system?.skill ?? "";
  if (skill !== "가변") return skill;
  const fixed = spell?.system?.familiarVarAttr || "";
  const attrKey = fixed || MAGICALOGIA.attributes[rolls.attrDie - 1].key;
  const row = rolls.skillSum - 2;
  return MAGICALOGIA.chart[attrKey][row];
}

/**
 * 토큰명 생성 (순수). nameTemplate의 "{skill}"을 치환, 비면 마스터명.
 * @param {string} masterName
 * @param {string} nameTemplate
 * @param {string} skill
 * @returns {string}
 */
export function buildTokenName(masterName, nameTemplate, skill) {
  if (!nameTemplate) return masterName;
  return nameTemplate.replaceAll("{skill}", skill);
}
