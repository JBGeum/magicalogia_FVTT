import { MAGICALOGIA } from "../helpers/config.mjs";
import { resolveVariableSkill } from "./specialty-table.mjs";
import { CHANNEL } from "./socket-channel.mjs";

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

/** 소환 배치 위치 — 소환자 토큰 한 칸 아래, 없으면 씬 중앙. (Foundry 의존) */
function summonPosition(caster) {
  const grid = canvas.grid?.size ?? 100;
  const t = caster.getActiveTokens?.()[0] ?? null;
  if (t) return { x: t.x, y: t.y + (t.document.height ?? 1) * grid + grid };
  return { x: (canvas.scene?.width ?? grid) / 2, y: (canvas.scene?.height ?? grid) / 2 };
}

/**
 * 원형 소환 — 컴펜디움/월드 원형을 per-summon 임시 월드 액터로 만들어 토큰 배치.
 * 토큰은 월드 액터를 참조해야 하므로 GM이 생성을 담당한다(플레이어는 GM에 위임).
 * 채팅 카드는 시전자 클라이언트에서 발행(가변이면 굴림 첨부).
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
  const pos = summonPosition(caster);
  const payload = {
    uuid,
    tokenName,
    sceneId: canvas.scene?.id ?? null,
    x: pos.x,
    y: pos.y,
    casterId: caster.id,
    casterUserId: game.user.id,
    hasBlock: !!master.system.hasBlock,
  };

  // 생성은 GM 권한 필요 — GM이면 직접, 플레이어면 activeGM에 소켓 위임.
  if (game.user.isGM) {
    await createSummon(payload);
  } else if (game.users.activeGM) {
    game.socket.emit(CHANNEL, { t: "summon:request", payload });
  } else {
    ui.notifications.warn("소환을 처리할 GM이 접속해 있지 않습니다.");
    return;
  }

  await postArchetypeCard(caster, master, tokenName, summonSkill, variable, rolls);
}

/** 임시 소환 액터를 모아둘 'Actor' 폴더 '원형'(없으면 생성). GM 전용 경로에서 호출. */
async function ensureArchetypeFolder() {
  const existing = game.folders.find((f) => f.type === "Actor" && f.name === "원형");
  return existing ?? Folder.implementation.create({ name: "원형", type: "Actor" });
}

/**
 * 원형 마스터를 폴더 '원형'에 per-summon 임시 월드 액터로 복제하고, 그 액터의 토큰을
 * 씬에 배치(actorLink). 시전자를 OWNER로, summonedFrom 플래그로 표시 → 토큰 삭제 시
 * cleanupSummonedActor가 제거. GM(activeGM)에서만 호출된다.
 */
export async function createSummon({
  uuid,
  tokenName,
  sceneId,
  x,
  y,
  casterId,
  casterUserId,
  hasBlock,
}) {
  const master = await fromUuid(uuid);
  if (!master) return;
  const folder = await ensureArchetypeFolder();

  const adata = master.toObject();
  delete adata._id;
  adata.folder = folder?.id ?? null;
  foundry.utils.setProperty(adata, "flags.magicalogia.summonedFrom", uuid);
  const ownership = { default: 0 };
  if (casterUserId) ownership[casterUserId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  adata.ownership = ownership;
  const ephemeral = await Actor.implementation.create(adata);
  if (!ephemeral) return;

  const tokenDoc = await ephemeral.getTokenDocument({ name: tokenName, x, y, actorLink: true });
  const data = tokenDoc.toObject();
  foundry.utils.setProperty(data, "flags.magicalogia.summonerId", casterId);
  if (hasBlock) {
    foundry.utils.setProperty(data, "bar1.attribute", "health");
    foundry.utils.setProperty(data, "displayBars", CONST.TOKEN_DISPLAY_MODES.ALWAYS);
  }
  const scene = game.scenes.get(sceneId) ?? canvas.scene;
  await scene?.createEmbeddedDocuments("Token", [data]);
}

/** PL→GM 소환 요청 수신(activeGM만 처리). ready 훅에서 등록. */
export function registerSummonSocket() {
  game.socket.on(CHANNEL, (msg) => {
    if (msg?.t !== "summon:request") return;
    if (game.users.activeGM !== game.user) return;
    createSummon(msg.payload);
  });
}

/**
 * 토큰 삭제 시 per-summon 임시 액터를 정리한다(activeGM, 잔여 토큰 0일 때만).
 * deleteToken 훅에 연결. 누가 토큰을 지웠든 activeGM이 액터를 삭제한다.
 */
export async function cleanupSummonedActor(tokenDoc) {
  if (game.users.activeGM !== game.user) return;
  const actor = game.actors.get(tokenDoc.actorId);
  if (!actor?.getFlag("magicalogia", "summonedFrom")) return;
  const stillUsed = game.scenes.some((s) => s.tokens.some((t) => t.actorId === actor.id));
  if (!stillUsed) await actor.delete();
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
      level: sys.level,
      features: sys.features,
    },
  );
  await ChatMessage.create({ speaker, content, rolls });
}
