/**
 * 장서 충전 변동 카드 — 충전 수(system.charge) 변동 시 채팅 발행.
 * 순수 buildChargeCard(테스트) + Foundry 의존 postChargeCard(F5 육안).
 */

/** 충전 변동 카드 템플릿 데이터(순수). */
export function buildChargeCard({ who, name, max, before, after }) {
  const delta = after - before;
  const up = delta >= 0;
  return {
    who,
    name,
    max,
    before,
    after,
    delta,
    up,
    deltaText: (up ? "▲ +" : "▼ ") + (up ? delta : Math.abs(delta)),
    ready: after >= max,
    spent: delta < 0,
  };
}

/** 충전 변동 카드 채팅 발행(Foundry 의존). 라이트 고정. */
export async function postChargeCard(actor, spell, before, after, max) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const data = buildChargeCard({ who: speaker.alias, name: spell.name, max, before, after });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/charge-card.hbs",
    data,
  );
  await ChatMessage.create({ speaker, content });
}
