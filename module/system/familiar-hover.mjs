import { MAGICALOGIA } from "../helpers/config.mjs";

/**
 * 원형 hover 툴팁 내부 HTML 생성 (순수). 블록(HP·임시체력)/부스트/기능 표시.
 * @param {object} sys   familiar actor.system
 * @param {string} name  토큰 표시명
 * @returns {string} 툴팁 내부 HTML
 */
export function buildFamiliarTooltip(sys, name) {
  const attrTitle = sys.attr
    ? (MAGICALOGIA.attributes.find((a) => a.key === sys.attr)?.title ?? "")
    : "";

  const stats = [];
  if (sys.hasBlock) {
    stats.push(`블록 <b>${sys.health?.value ?? 0}</b>/${sys.health?.max ?? 0}`);
  }
  stats.push(`부스트 <b>${sys.boostCount ?? 0}</b>`);

  const parts = [
    `<div class="mg-fam-hud__name">${name}${attrTitle ? ` <span class="mg-fam-hud__attr">${attrTitle}</span>` : ""}</div>`,
    `<div class="mg-fam-hud__stats">${stats.join(" · ")}</div>`,
  ];
  if (sys.features) {
    parts.push(`<div class="mg-fam-hud__features">${sys.features}</div>`);
  }
  return parts.join("");
}

let hudEl = null;

/** 토큰 위(상단 중앙)에 원형 HUD를 띄운다. Foundry 의존. */
function showFamiliarHud(token) {
  const actor = token?.actor;
  if (!actor || actor.type !== "familiar") return;
  hideFamiliarHud();

  hudEl = document.createElement("div");
  hudEl.className = "mg-fam-hud magicalogia theme-light";
  hudEl.innerHTML = buildFamiliarTooltip(actor.system, token.document.name);
  document.body.appendChild(hudEl);

  // 토큰 상단 중앙(로컬) → 화면 픽셀.
  const rect = canvas.app.view.getBoundingClientRect();
  const pt = token.toGlobal({ x: token.w / 2, y: 0 });
  hudEl.style.left = `${rect.left + pt.x}px`;
  hudEl.style.top = `${rect.top + pt.y}px`;
}

function hideFamiliarHud() {
  hudEl?.remove();
  hudEl = null;
}

/** hoverToken 훅 등록 — 원형 토큰 hover 시 HUD 표시/제거. */
export function bindFamiliarHover() {
  Hooks.on("hoverToken", (token, hovered) => {
    if (hovered) showFamiliarHud(token);
    else hideFamiliarHud();
  });
  // 토큰 삭제/이동 등으로 hover가 풀리지 않는 경우 대비 — 캔버스 정리 시 제거.
  Hooks.on("canvasPan", hideFamiliarHud);
  Hooks.on("deleteToken", hideFamiliarHud);
}
