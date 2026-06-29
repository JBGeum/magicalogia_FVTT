/**
 * 마력/일시적 마력 증감 카드 — charge-card(.mg-cc) 양식 재사용.
 * 순수 buildStatCard(테스트) + Foundry 의존 postStatCard(F5 육안).
 */

/** 증감 카드 템플릿 데이터(순수). */
export function buildStatCard({ who, label, before, after, max }) {
  const delta = after - before;
  const up = delta >= 0;
  return {
    who,
    label,
    before,
    after,
    max: max ?? null,
    hasMax: max != null,
    delta,
    up,
    deltaText: (up ? "▲ +" : "▼ ") + (up ? delta : Math.abs(delta)),
  };
}

// 카드 대상 필드별 라벨·max 사용 여부.
const STAT_CARD_FIELDS = {
  "system.mp.value": { label: "마력", hasMax: true },
  "system.tempMp": { label: "일시적 마력", hasMax: false },
};

/** 증감 카드 채팅 발행(Foundry 의존). 라이트 고정. 대상 필드가 아니면 무시. */
export async function postStatCard(actor, field, before, after) {
  const meta = STAT_CARD_FIELDS[field];
  if (!meta) return;
  const speaker = ChatMessage.getSpeaker({ actor });
  const data = buildStatCard({
    who: speaker.alias,
    label: meta.label,
    before,
    after,
    max: meta.hasMax ? actor.system.mp.max : null,
  });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/stat-adjust-card.hbs",
    data,
  );
  await ChatMessage.create({ speaker, content });
}
