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
  const mod =
    st === "valid"
      ? " mg-die--valid"
      : st === "cancel"
        ? " mg-die--cancel"
        : st === "focus"
          ? " mg-die--focus"
          : "";
  return `<span class="mg-die-wrap is-${st}"><span class="mg-die${mod}">${cells}</span><span class="mg-die-num">${v}</span></span>`;
}

/**
 * 공격/방어 상쇄.
 * - 일반: 1:1 비대칭(소모된 방어 인덱스 추적, 중복 눈도 정확히 1:1 소거).
 * - 집중 방어: defense에 0 마커가 있으면 나머지 한 눈(focus)을 공격에서 개수 무관 전부 상쇄.
 * @returns {{attackMarks, defenseMarks, surviving:number[], damage:number, focus:number|null}}
 */
export function resolveExchange(attack, defense) {
  // 집중 방어: [0, X] → 공격의 눈 X 전부 상쇄, 나머지 유효.
  if (defense.includes(0)) {
    const focus = defense.find((v) => v !== 0) ?? null;
    const attackMarks = attack.map((v) => ({
      v,
      st: focus !== null && v === focus ? "cancel" : "valid",
    }));
    const surviving = attackMarks.filter((m) => m.st === "valid").map((m) => m.v);
    const defenseMarks = focus !== null ? [{ v: focus, st: "focus" }] : [];
    return { attackMarks, defenseMarks, surviving, damage: surviving.length, focus };
  }

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
  return { attackMarks, defenseMarks, surviving, damage: surviving.length, focus: null };
}

/** 전투 카드 템플릿 데이터(순수). 공개 시 발행 전제. */
export function buildBattleCard({ round, exchange, attacker, defender, attack, defense }) {
  const { attackMarks, defenseMarks, damage, focus } = resolveExchange(attack, defense);
  return {
    round,
    exchange,
    attacker,
    defender,
    damage,
    focus, // 집중 방어 시 대상 눈(number), 아니면 null
    attackDiceHtml: attackMarks.map((m) => renderBattleDie(m.v, m.st)).join(""),
    defenseDiceHtml: defenseMarks.map((m) => renderBattleDie(m.v, m.st)).join(""),
  };
}

/**
 * 부스트 카드 데이터(순pure, 표시 전용). dice=굴린 nD6, struck=상대 잔여(1:1 소거).
 * 시안 buildBoostCard 이식. 자동 합산/합계 없음.
 */
export function buildBoostCard({ who, n, dice, struck = [] }) {
  const used = [...struck];
  const marked = dice.map((v) => {
    const k = used.indexOf(v);
    if (k > -1) {
      used.splice(k, 1);
      return { v, st: "cancel" };
    }
    return { v, st: "valid" };
  });
  return {
    who,
    n: n ?? dice.length,
    dice: marked,
    diceHtml: marked.map((d) => renderBattleDie(d.v, d.st)).join(""),
  };
}

/* ===== Foundry 의존부 (F5 육안) ===== */

/** 공개된 전투 카드를 채팅에 발행. 라이트 고정. 적용 버튼용 flag 포함. */
export async function postBattleCard(
  attackerActor,
  defenderActor,
  { round, exchange, attack, defense },
) {
  const speaker = ChatMessage.getSpeaker({ actor: attackerActor });
  const data = buildBattleCard({
    round,
    exchange,
    attacker: attackerActor.name,
    defender: defenderActor.name,
    attack,
    defense,
  });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/battle-card.hbs",
    data,
  );
  await ChatMessage.create({
    speaker,
    content,
    flags: {
      magicalogia: {
        battle: { defenderId: defenderActor.id, damage: data.damage, applied: false },
      },
    },
  });
}

/** 부스트 카드 발행(표시 전용). */
export async function postBoostCard(actor, { n, dice, struck }) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const data = buildBoostCard({ who: actor.name, n, dice, struck });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/boost-card.hbs",
    data,
  );
  await ChatMessage.create({ speaker, content });
}

/** 전투 카드 대미지를 방어측 마력에 적용(멱등) + 마력 감소 카드 발행. GM만 호출. */
export async function applyBattleDamage(message) {
  const f = message.getFlag("magicalogia", "battle");
  if (!f || f.applied) return;
  const actor = game.actors.get(f.defenderId);
  if (!actor) {
    ui.notifications.warn("대미지 적용 대상 액터를 찾을 수 없습니다.");
    return;
  }
  const before = actor.system.mp?.value ?? 0;
  const after = Math.max(0, before - f.damage);
  await actor.update({ "system.mp.value": after });
  await message.setFlag("magicalogia", "battle", { ...f, applied: true });
  await postMpDamageCard(actor, f.damage, before, after);
}

/** 마력 감소 compact 한줄 카드 발행. 라이트 고정. */
export async function postMpDamageCard(actor, amount, before, after) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/mp-damage-card.hbs",
    { who: actor.name, amount, before, after },
  );
  await ChatMessage.create({ speaker, content });
}

/** 채팅 카드의 적용 버튼 바인딩(renderChatMessageHTML 훅에서 호출). */
export function bindBattleCardActions(message, html) {
  const btn = html.querySelector('[data-action="apply-battle-damage"]');
  if (!btn) return;
  if (!game.user.isGM) {
    btn.style.display = "none";
    return;
  }
  const f = message.getFlag("magicalogia", "battle");
  if (f?.applied) {
    btn.textContent = "적용됨";
    btn.disabled = true;
    return;
  }
  btn.addEventListener("click", () => {
    btn.disabled = true;
    applyBattleDamage(message);
  });
}
