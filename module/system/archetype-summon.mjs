import { MAGICALOGIA } from "../helpers/config.mjs";
import { resolveVariableSkill } from "./specialty-table.mjs";

/**
 * 소환 대상 UUID 해석 (순수).
 * @param {object} spell  spell 아이템(또는 {system})
 * @returns {string|null} archetypeUuid (빈 값이면 null)
 */
export function resolveArchetype(spell) {
  const uuid = (spell?.system?.archetypeUuid ?? "").trim();
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
  return resolveVariableSkill(spell?.system?.archetypeVarAttr || "", rolls);
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
 * 원형 소환 — 마스터 archetype의 prototypeToken을 현재 씬에 unlinked 복제.
 * 소환자 옆 칸에 배치, 토큰명에 지정특기(가변이면 자동 굴림) 반영, 소환자 귀속.
 * Foundry 의존(fromUuid/Roll/canvas/ui). 호출은 클릭 핸들러에서만.
 * @param {Actor} caster
 * @param {Item} spell
 */
export async function summonArchetype(caster, spell, { skill, rolls = [] } = {}) {
  const uuid = resolveArchetype(spell);
  if (!uuid) return;
  const master = await fromUuid(uuid);
  if (!master) {
    ui.notifications.warn("소환할 원형을 찾을 수 없습니다.");
    return;
  }

  // 확정특기·특기결정 굴림은 호출부(#onCastSpell)가 영역+굴림으로 정해 전달한다.
  const summonSkill = skill ?? spell.system.skill ?? "";
  const variable = spell.system.skill === "가변";
  const tokenName = buildTokenName(master.name, master.system.nameTemplate, summonSkill);

  // 배치 위치: 소환자 토큰 기준 한 칸 간격 띄운 아래(x 정렬), 없으면 씬 중앙.
  const grid = canvas.grid?.size ?? 100;
  const casterToken = caster.getActiveTokens?.()[0] ?? null;
  const pos = casterToken
    ? {
        x: casterToken.x,
        y: casterToken.y + (casterToken.document.height ?? 1) * grid + grid,
      }
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
  // 블록 보유 원형: 토큰 HP bar(health)를 기본 표시.
  if (master.system.hasBlock) {
    foundry.utils.setProperty(data, "bar1.attribute", "health");
    foundry.utils.setProperty(data, "displayBars", CONST.TOKEN_DISPLAY_MODES.ALWAYS);
  }

  await canvas.scene.createEmbeddedDocuments("Token", [data]);

  // 원형 정보 채팅 카드(가변이면 굴림 첨부).
  await postArchetypeCard(caster, master, tokenName, summonSkill, variable, rolls);
}

/** 소환된 원형의 정보 채팅 카드를 출력. 라이트 고정. */
async function postArchetypeCard(caster, master, name, skill, variable, rolls) {
  const sys = master.system;
  const attrTitle = sys.attr
    ? (MAGICALOGIA.attributes.find((a) => a.key === sys.attr)?.title ?? "")
    : "";
  const speaker = ChatMessage.getSpeaker({ actor: caster });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/archetype-card.hbs",
    {
      who: speaker.alias,
      name,
      skill,
      variable,
      attr: attrTitle,
      hasBlock: sys.hasBlock,
      health: sys.health,
      boostCount: sys.boostCount,
      features: sys.features,
    },
  );
  await ChatMessage.create({ speaker, content, rolls });
}
