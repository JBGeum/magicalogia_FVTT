import { BattleDiceDialog } from "../apps/battle-dice-dialog.mjs";
import { MagicBattlePanel } from "../apps/magic-battle-panel.mjs";

export const CHANNEL = "system.magicalogia";

/** GM → PL: 다이스 선택 요청. */
export function requestPick({ reqId, userId, actorId, role, max, allowFocus, prompt }) {
  game.socket.emit(CHANNEL, {
    t: "battle:pick",
    reqId,
    userId,
    actorId,
    role,
    max,
    allowFocus,
    prompt,
  });
}

/** GM → PL: 부스트 요청. */
export function requestBoost({ reqId, userId, side, max, prompt }) {
  game.socket.emit(CHANNEL, { t: "battle:boost", reqId, userId, side, max, prompt });
}

/** PL → GM: 선택 결과. */
export function sendPickResult({ reqId, dice }) {
  game.socket.emit(CHANNEL, { t: "battle:pick-result", reqId, dice });
}

/** PL → GM: 부스트 결과. */
export function sendBoostResult({ reqId, n, dice }) {
  game.socket.emit(CHANNEL, { t: "battle:boost-result", reqId, n, dice });
}

/** GM → PL: 입회 요청. */
export function requestWitness({ reqId, userId, actorId, name, prompt }) {
  game.socket.emit(CHANNEL, { t: "battle:witness", reqId, userId, actorId, name, prompt });
}

/** PL → GM: 입회 결과. */
export function sendWitnessResult({ reqId, side, dice }) {
  game.socket.emit(CHANNEL, { t: "battle:witness-result", reqId, side, dice });
}

/** 수신 디스패치. PL은 본인 userId 요청만 다이얼로그, GM은 결과만 수신. */
function onSocket(msg) {
  switch (msg?.t) {
    case "battle:pick":
      if (game.user.id === msg.userId) {
        new BattleDiceDialog({
          mode: msg.role,
          max: msg.max,
          allowFocus: msg.allowFocus,
          prompt: msg.prompt,
          onSubmit: (dice) => sendPickResult({ reqId: msg.reqId, dice }),
        }).render(true);
      }
      break;
    case "battle:boost":
      if (game.user.id === msg.userId) {
        new BattleDiceDialog({
          mode: "boost",
          max: msg.max,
          prompt: msg.prompt,
          onSubmit: (dice, n) => sendBoostResult({ reqId: msg.reqId, n, dice }),
        }).render(true);
      }
      break;
    case "battle:pick-result":
      if (game.user.isGM) MagicBattlePanel.deliverPick(msg);
      break;
    case "battle:boost-result":
      if (game.user.isGM) MagicBattlePanel.deliverBoost(msg);
      break;
    case "battle:witness":
      if (game.user.id === msg.userId) {
        new BattleDiceDialog({
          mode: "witness",
          prompt: msg.prompt,
          onSubmit: (dice, extra) =>
            sendWitnessResult({ reqId: msg.reqId, side: extra?.side ?? "defense", dice }),
        }).render(true);
      }
      break;
    case "battle:witness-result":
      if (game.user.isGM) MagicBattlePanel.deliverWitness(msg);
      break;
  }
}

/** ready 훅에서 호출. */
export function registerBattleSocket() {
  game.socket.on(CHANNEL, onSocket);
}
