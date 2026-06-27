/**
 * 롤테이블 결과 챗 카드 — 시스템이 굴린 표(table.draw) 결과를 .mg-card 양식으로 발행한다.
 * 순수 buildTableCard(테스트) + Foundry 의존 postTableCard(#onRollTable에서 호출).
 * 표명·굴림식·결과 숫자·효과 텍스트로 구성. 라이트 고정(타 챗 카드와 통일).
 */

const DIE_SVG =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">' +
  '<rect x="2.5" y="2.5" width="11" height="11" rx="2.2"/>' +
  '<circle cx="5.6" cy="5.6" r="1" fill="currentColor" stroke="none"/>' +
  '<circle cx="10.4" cy="10.4" r="1" fill="currentColor" stroke="none"/>' +
  '<circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/></svg>';

const SCROLL_SVG =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">' +
  '<path d="M4 2.5h7a1.5 1.5 0 0 1 1.5 1.5v9a1 1 0 0 1-1 1H5a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 5 2.5"/>' +
  '<path d="M6 5.5h4M6 8h4M6 10.5h2.5"/></svg>';

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * 롤테이블 결과 카드 HTML(순수).
 * @param {object} p
 * @param {string} p.table   표 이름(이스케이프됨)
 * @param {string} p.formula 굴림식(예: "2d6"). 빈 값이면 pill 생략
 * @param {number|string|null} p.result 결과 숫자(roll.total). 없으면 결과 블록 생략
 * @param {string[]} p.texts 효과 HTML(이미 enrich된 신뢰 콘텐츠 — 그대로 렌더)
 */
export function buildTableCard({ table, formula, result, texts }) {
  const formulaHtml = formula ? `<span class="mg-card__formula">${esc(formula)}</span>` : "";
  const hasResult = result !== null && result !== undefined && result !== "";
  const tres = hasResult
    ? `<div class="mg-tres"><span class="mg-tres__cap">결과</span>` +
      `<span class="mg-tres__flank">❖</span><span class="mg-tres__num">${esc(result)}</span>` +
      `<span class="mg-tres__flank">❖</span></div>`
    : "";
  const body = (texts ?? [])
    .map(
      (t) =>
        `<div class="mg-tbody"><span class="mg-tbody__icon">${SCROLL_SVG}</span>` +
        `<span class="mg-tbody__text">${t}</span></div>`,
    )
    .join("");
  return (
    `<div class="magicalogia theme-light"><div class="mg-card">` +
    `<div class="mg-card__head"><span class="mg-card__sigil">${DIE_SVG}</span>` +
    `<span class="mg-card__title">${esc(table)}</span>${formulaHtml}</div>` +
    `<div class="mg-card__body">${tres}${body}</div></div></div>`
  );
}

/**
 * 표 결과를 .mg-card 챗 카드로 발행(Foundry 의존). #onRollTable에서 displayChat:false로
 * 뽑은 {roll, results}를 받아 호출한다. 결과 텍스트는 enrichHTML로 렌더.
 */
export async function postTableCard(table, roll, results, actor) {
  const enrich = foundry.applications.ux.TextEditor.implementation.enrichHTML;
  const texts = await Promise.all(
    (results ?? []).map((r) => {
      const raw = r.description?.trim() ? r.description : (r.name ?? "");
      return enrich(raw, { secrets: false });
    }),
  );
  const content = buildTableCard({
    table: table.name,
    formula: roll?.formula ?? "",
    result: roll?.total ?? null,
    texts,
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: roll ? [roll] : [],
    sound: roll ? CONFIG.sounds.dice : null,
  });
}
