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

/**
 * 원형 소환 — 마스터 familiar의 prototypeToken을 현재 씬에 unlinked 복제.
 * 소환자 옆 칸에 배치, 토큰명에 지정특기(가변이면 자동 굴림) 반영, 소환자 귀속.
 * Foundry 의존(fromUuid/Roll/canvas/ui). 호출은 클릭 핸들러에서만.
 * @param {Actor} caster
 * @param {Item} spell
 */
export async function summonFamiliar(caster, spell) {
  const uuid = resolveFamiliar(spell);
  if (!uuid) return;
  const master = await fromUuid(uuid);
  if (!master) {
    ui.notifications.warn("소환할 원형을 찾을 수 없습니다.");
    return;
  }

  // 지정특기 확정 (가변이면 자동 굴림).
  let summonSkill = spell.system.skill ?? "";
  const rolls = [];
  if (summonSkill === "가변") {
    const fixed = spell.system.familiarVarAttr || "";
    let attrDie;
    if (!fixed) {
      const r = await new Roll("1d6").evaluate();
      rolls.push(r);
      attrDie = r.total;
    }
    const sr = await new Roll("2d6").evaluate();
    rolls.push(sr);
    summonSkill = resolveSummonSkill(spell, { attrDie, skillSum: sr.total });
  }

  const tokenName = buildTokenName(master.name, master.system.nameTemplate, summonSkill);

  // 배치 위치: 소환자 토큰 옆 칸, 없으면 씬 중앙.
  const grid = canvas.grid?.size ?? 100;
  const casterToken = caster.getActiveTokens?.()[0] ?? null;
  const pos = casterToken
    ? { x: casterToken.x + grid, y: casterToken.y }
    : { x: (canvas.scene?.width ?? grid) / 2, y: (canvas.scene?.height ?? grid) / 2 };

  // 마스터 prototypeToken → TokenDocument(unlinked).
  const tokenDoc = await master.getTokenDocument({
    name: tokenName,
    x: pos.x,
    y: pos.y,
    actorLink: false,
  });
  const data = tokenDoc.toObject();
  // 귀속 기록 + 소환자 ownership 복제(델타 actor에 반영).
  foundry.utils.setProperty(data, "flags.magicalogia.summonerId", caster.id);
  foundry.utils.setProperty(data, "delta.ownership", foundry.utils.deepClone(caster.ownership));

  await canvas.scene.createEmbeddedDocuments("Token", [data]);

  if (rolls.length) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: caster }),
      content: `<p>원형 소환 — 지정특기 <strong>${summonSkill}</strong></p>`,
      rolls,
    });
  }
}
