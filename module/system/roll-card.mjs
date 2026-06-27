/**
 * 전역 롤 챗 카드 — Foundry 네이티브 다이스 렌더(/roll 등의 .dice-roll)를 시스템
 * .mg-card 양식으로 재구성한다. 순수 buildGlobalRollCard(테스트) + Foundry 의존
 * decorateRollCard(renderChatMessageHTML 훅). 시스템 자체 카드는 건드리지 않는다.
 */

const DIE_SVG =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">' +
  '<rect x="2.5" y="2.5" width="11" height="11" rx="2.2"/>' +
  '<circle cx="5.6" cy="5.6" r="1" fill="currentColor" stroke="none"/>' +
  '<circle cx="10.4" cy="10.4" r="1" fill="currentColor" stroke="none"/>' +
  '<circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/></svg>';

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const activeResults = (results) =>
  (Array.isArray(results) ? results : []).filter((r) => r.active !== false);

/** 다이스 면들을 .mg-face 스팬으로(최대면→--max, 1→--min). */
function facesHtml(results, sides) {
  return activeResults(results)
    .map((r) => {
      const v = r.result;
      let cls = "mg-face";
      if (sides && v === sides) cls += " mg-face--max";
      else if (v === 1) cls += " mg-face--min";
      return `<span class="${cls}">${esc(v)}</span>`;
    })
    .join("");
}

/** 한 롤의 본문(식 바 + 다이스 항별 부분식/면 + 합계). */
function rollBody(roll) {
  const dice = Array.isArray(roll.dice) ? roll.dice : [];
  const parts = dice
    .map((termObj) => {
      const sides = termObj.faces;
      const results = termObj.results;
      const n = termObj.number ?? activeResults(results).length;
      const sub = activeResults(results).reduce((s, r) => s + (r.result ?? 0), 0);
      return (
        `<div class="mg-roll-part"><span class="mg-roll-part__f">${esc(`${n}d${sides}`)}</span>` +
        `<span class="mg-roll-part__rule"></span>` +
        `<span class="mg-roll-part__sub">${esc(sub)}</span></div>` +
        `<div class="mg-roll-faces">${facesHtml(results, sides)}</div>`
      );
    })
    .join("");
  return (
    `<div class="mg-roll-formula">${esc(roll.formula)}</div>` +
    parts +
    `<div class="mg-roll-total"><span class="mg-roll-total__cap">합계</span>` +
    `<span class="mg-roll-total__n">${esc(roll.total)}</span></div>`
  );
}

/** 전역 롤 카드 HTML(순수). rolls: Roll 유사 객체 배열. 라이트 고정(타 챗 카드와 통일). */
export function buildGlobalRollCard({ rolls, who, time }) {
  const body = (rolls ?? []).map(rollBody).join("");
  return (
    `<div class="magicalogia theme-light"><div class="mg-card">` +
    `<div class="mg-card__head"><span class="mg-card__sigil">${DIE_SVG}</span>` +
    `<span class="mg-card__who">${esc(who)}</span>` +
    `<span class="mg-card__time">${esc(time)}</span></div>` +
    `<div class="mg-card__body">${body}</div></div></div>`
  );
}

/**
 * 네이티브 롤 메시지의 .message-content를 .mg-card 양식으로 교체한다.
 * 시스템 자체 카드(.mg-card/.mg-cc/.mg-mpd)는 제외 — 이미 자체 디자인을 가진다.
 */
export function decorateRollCard(message, html) {
  if (!message.rolls?.length) return;
  if (html.querySelector(".mg-card, .mg-cc, .mg-mpd")) return;
  const content = html.querySelector(".message-content");
  if (!content) return;
  const time = html.querySelector(".message-timestamp")?.textContent ?? "";
  content.innerHTML = buildGlobalRollCard({ rolls: message.rolls, who: message.alias, time });
}
