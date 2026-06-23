import { computeTable, findSpecialtyCoord } from "./specialty-table.mjs";
import { renderDie, classifyRoll } from "./specialty-roll.mjs";
import { formatCost } from "../helpers/config.mjs";

/**
 * 지정특기 명중 판정 목표치(TN) 해석 (순수).
 * 차트 특기명이면 액터 표의 해당 셀 TN(라이브). 그 값이 null(도달 가능한 보유특기 없음)
 * 이거나 차트 미매칭이면 manualTn으로 폴백.
 *
 * @param {Array} table  computeTable 결과
 * @param {string} skill 지정특기 이름
 * @param {number} manualTn 수동 폴백 목표값
 * @returns {{tn:?number, linked:boolean}}
 */
export function resolveSpecialtyTn(table, skill, manualTn) {
  const coord = findSpecialtyCoord(skill);
  let tn = null;
  if (coord) {
    const col = table.find((c) => c.key === coord.col);
    tn = col?.cells?.[coord.row]?.tn ?? null;
  }
  if (tn == null) tn = Number.isFinite(manualTn) ? manualTn : null;
  return { tn, linked: coord != null };
}

/**
 * 장서 시전 → .mg-card 시전 카드 출력. 라이트 고정.
 * @returns {?{success:boolean, special:boolean, fumble:boolean, doublet:boolean, total:number}}
 *   판정 결과(소환 장서가 성공 여부로 분기). 시전 불가(미존재/목표치 없음)면 undefined.
 */
export async function castSpell(actor, itemId) {
  const spell = actor.items.get(itemId);
  if (!spell || spell.type !== "spell") return;
  const sys = spell.system;

  const table = computeTable({
    owned: actor.system.skills,
    domain: actor.system.domain || null,
    wrap: actor.system.horizontalWrap,
  });
  const { tn } = resolveSpecialtyTn(table, sys.skill, sys.tn);
  if (tn == null) {
    ui.notifications.warn("목표치를 계산할 수 없습니다.");
    return;
  }

  const roll = await new Roll("2d6").evaluate();
  const [d1, d2] = roll.dice[0].results.map((r) => r.result);
  const result = classifyRoll(d1, d2, tn);
  const dieHtml =
    renderDie(d1, result.doublet) +
    '<span class="mg-roll-eq">+</span>' +
    renderDie(d2, result.doublet);

  const speaker = ChatMessage.getSpeaker({ actor });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/spell-card.hbs",
    {
      who: speaker.alias,
      name: spell.name,
      type: sys.type,
      skill: sys.skill,
      target: sys.target,
      cost: formatCost(sys.cost),
      effect: sys.effect,
      dieHtml,
      roll: {
        dice: [d1, d2],
        target: tn,
        sum: result.total,
        success: result.success,
        special: result.special,
        fumble: result.fumble,
        doublet: result.doublet,
        manaDomain: result.doublet ? CONFIG.MAGICALOGIA.attributes[d1 - 1].title : null,
      },
    },
  );
  await ChatMessage.create({ speaker, content, rolls: [roll] });
  return result;
}
