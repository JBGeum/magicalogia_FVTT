import { computeTable, resolveVariableSkill } from "./specialty-table.mjs";

// d6 pip 배치(0..8 = 3×3 셀 인덱스).
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** d6 한 면을 pip 그리드 markup으로. match=true면 골드 강조(더블릿). */
export function renderDie(value, match) {
  let cells = "";
  for (let i = 0; i < 9; i++) cells += PIPS[value].includes(i) ? "<i></i>" : "<span></span>";
  return `<span class="mg-die ${match ? "is-match" : ""}">${cells}</span>`;
}

/**
 * 2d6 특기 판정 분류 (순수).
 *   (1,1) = 펌블(자동 실패), (6,6) = 스페셜(자동 성공),
 *   그 외 합 >= TN = 성공. 같은 눈 = 더블릿.
 *
 * @param {number} d1
 * @param {number} d2
 * @param {number} tn  목표치
 * @param {number} [penalty=0] 불운 등 합 차감(성공 판정에만 적용)
 * @returns {{total:number, success:boolean, special:boolean, fumble:boolean, doublet:boolean}}
 */
export function classifyRoll(d1, d2, tn, penalty = 0) {
  const total = d1 + d2;
  const doublet = d1 === d2;
  const fumble = d1 === 1 && d2 === 1;
  const special = d1 === 6 && d2 === 6;
  let success;
  if (fumble) success = false;
  else if (special) success = true;
  else success = total - penalty >= tn;
  return { total, success, special, fumble, doublet };
}

/** 2d6 판정 후 .mg-card 채팅 카드 출력(특기·혼의특기 공용). 라이트 테마 고정. */
async function postRollCard(actor, { domain, skill, tn, penalty = 0 }) {
  const roll = await new Roll("2d6").evaluate();
  const [d1, d2] = roll.dice[0].results.map((r) => r.result);
  const result = classifyRoll(d1, d2, tn, penalty);
  const dieHtml =
    renderDie(d1, result.doublet) +
    '<span class="mg-roll-eq">+</span>' +
    renderDie(d2, result.doublet);
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/specialty-roll.hbs",
    {
      who: ChatMessage.getSpeaker({ actor }).alias,
      domain,
      skill,
      target: tn,
      dice: [d1, d2],
      sum: result.total,
      // 스페셜(6,6)/펌블(1,1)은 주사위 눈으로 자동 판정 → 보정이 무의미하므로 불운 표기를 숨긴다.
      showPenalty: penalty > 0 && !result.special && !result.fumble,
      penalty,
      success: result.success,
      special: result.special,
      fumble: result.fumble,
      doublet: result.doublet,
      manaDomain: result.doublet ? CONFIG.MAGICALOGIA.attributes[d1 - 1].title : null,
      dieHtml,
    },
  );
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll] });
}

/**
 * 특기 셀로 2d6 판정 후 챗카드 출력.
 * @param {Actor} actor
 * @param {string} colKey   속성 key
 * @param {number} rowIndex 행 인덱스 0..10
 */
export async function rollSpecialty(actor, colKey, rowIndex) {
  const sys = actor.system;
  const table = computeTable({
    owned: sys.skills,
    misfortune: sys.misfortune,
    domain: sys.domain || null,
    wrap: sys.horizontalWrap,
  });
  const column = table.find((c) => c.key === colKey);
  const cell = column?.cells?.[rowIndex];

  if (!cell) {
    ui.notifications.warn("이 특기로는 판정할 수 없습니다.");
    return;
  }
  if (cell.tn == null) {
    ui.notifications.warn("보유한 특기가 없어 목표치를 계산할 수 없습니다.");
    return;
  }

  await postRollCard(actor, {
    domain: column.title,
    skill: cell.name,
    tn: cell.tn,
    penalty: cell.misfortune ? 1 : 0,
  });
}

/**
 * 혼의 특기 2d6 판정 — 목표치 6 고정의 특수 특기로 간주. 챗카드 출력.
 * @param {Actor} actor
 */
export async function rollSoulSkill(actor) {
  const skill = actor.system.soulSkill?.trim() || "혼의 특기";
  await postRollCard(actor, { domain: "혼의 특기", skill, tn: 6 });
}

/**
 * 가변특기 — 선택 영역(system.variableSkill)에서 굴려 특기를 정하고 채팅 카드 출력.
 * 전체(""): 1d6로 영역 + 2d6로 행. 영역별: 2d6로 행. 판정은 하지 않는다(결정만).
 * @param {Actor} actor
 */
export async function rollVariableSkill(actor) {
  const area = actor.system.variableSkill || "";
  const rolls = [];
  let attrDie;
  if (!area) {
    const ar = await new Roll("1d6").evaluate();
    rolls.push(ar);
    attrDie = ar.total;
  }
  const sr = await new Roll("2d6").evaluate();
  rolls.push(sr);
  const skill = resolveVariableSkill(area, { attrDie, skillSum: sr.total });
  const areaTitle = area
    ? (CONFIG.MAGICALOGIA.attributes.find((a) => a.key === area)?.title ?? "")
    : "전체";
  const speaker = ChatMessage.getSpeaker({ actor });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/variable-skill-card.hbs",
    { who: speaker.alias, area: areaTitle, skill },
  );
  await ChatMessage.create({ speaker, content, rolls });
}
