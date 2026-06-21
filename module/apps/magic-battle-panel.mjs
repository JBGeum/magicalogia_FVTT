import { applyTheme } from "../helpers/theme.mjs";
import { resolveExchange, postBattleCard, postBoostCard } from "../system/magic-battle.mjs";
import { BattleDiceDialog } from "./battle-dice-dialog.mjs";
import { requestPick, requestBoost } from "../system/battle-socket.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM 마법전 패널. 선공/후공 지정 → 라운드(2교전) 오케스트레이션.
 * 교전: 공격자=공격 다이스, 방어자=방어 다이스(각 ≤ 근원력) 수집 → 공개 → 카드 발행.
 * 상태는 인스턴스 메모리(새로고침 시 소실 → 재개시).
 */
export class MagicBattlePanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "magic-battle-panel"],
    window: { title: "마법전" },
    position: { width: 400, height: "auto" },
    actions: {
      start: MagicBattlePanel.#onStart,
      reveal: MagicBattlePanel.#onReveal,
      requestPick: MagicBattlePanel.#onRequestPick,
      nextExchange: MagicBattlePanel.#onNextExchange,
      boost: MagicBattlePanel.#onBoost,
      end: MagicBattlePanel.#onEnd,
    },
  };

  static PARTS = {
    panel: { template: "systems/magicalogia/templates/apps/magic-battle-panel.hbs" },
  };

  static _active = null;
  static deliverPick(msg) {
    MagicBattlePanel._active?._receivePick(msg);
  }
  static deliverBoost(msg) {
    MagicBattlePanel._active?._receiveBoost?.(msg);
  }

  constructor(options = {}) {
    super(options);
    this._reset();
  }

  _reset() {
    this.started = false;
    this.round = 0;
    this.exchange = 0;
    this.revealed = false;
    this.firstId = null;
    this.secondId = null;
    this.picks = { attack: null, defense: null };
    this.reqs = { attack: null, defense: null };
    this.lastResult = null;
    this.lastRoles = null;
  }

  get _attacker() {
    return game.actors.get(this.exchange === 1 ? this.firstId : this.secondId);
  }
  get _defender() {
    return game.actors.get(this.exchange === 1 ? this.secondId : this.firstId);
  }

  _ownerUser(actor) {
    return (
      game.users.find((u) => u.active && !u.isGM && actor.testUserPermission(u, "OWNER")) ?? null
    );
  }

  async _prepareContext() {
    const actors = game.actors
      .filter((a) => a.type === "character")
      .map((a) => ({ id: a.id, name: a.name }));
    return {
      actors,
      started: this.started,
      round: this.round,
      exchange: this.exchange,
      revealed: this.revealed,
      firstId: this.firstId,
      secondId: this.secondId,
      attacker: this.started ? this._attacker?.name : null,
      defender: this.started ? this._defender?.name : null,
      attackReady: this.picks.attack !== null,
      defenseReady: this.picks.defense !== null,
      bothReady: this.picks.attack !== null && this.picks.defense !== null,
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    MagicBattlePanel._active = this;
    applyTheme(this.element);
  }

  async close(options) {
    if (MagicBattlePanel._active === this) MagicBattlePanel._active = null;
    return super.close(options);
  }

  static async #onStart() {
    const root = this.element;
    this.firstId = root.querySelector('[name="first"]').value;
    this.secondId = root.querySelector('[name="second"]').value;
    if (!this.firstId || !this.secondId) {
      ui.notifications.warn("선공/후공 액터를 모두 선택하세요.");
      return;
    }
    this.started = true;
    this.round = 1;
    await this._beginExchange(1);
  }

  async _beginExchange(n) {
    this.exchange = n;
    this.revealed = false;
    this.picks = { attack: null, defense: null };
    this.reqs = { attack: null, defense: null };
    this.render();
    await this._requestPick("attack", this._attacker);
    await this._requestPick("defense", this._defender);
  }

  async _requestPick(role, actor) {
    if (!actor) {
      ui.notifications.warn("대상 액터를 찾을 수 없습니다. 마법전을 다시 개시하세요.");
      return;
    }
    // role("attack"/"defense")이 능력치 키와 일치 → 공격=공격력, 방어=방어력.
    const max = actor.system.abilities?.[role] ?? 0;
    // 집중 방어: 방어 역할 & 방어력 3 이상일 때만 0(집중) 허용.
    const allowFocus = role === "defense" && (actor.system.abilities?.defense ?? 0) >= 3;
    const prompt = `${actor.name} — ${role === "attack" ? "공격" : "방어"} 다이스`;
    const owner = this._ownerUser(actor);
    if (owner) {
      const reqId = foundry.utils.randomID();
      this.reqs[role] = reqId;
      requestPick({ reqId, userId: owner.id, actorId: actor.id, role, max, allowFocus, prompt });
    } else {
      this.reqs[role] = "local";
      new BattleDiceDialog({
        mode: role,
        max,
        allowFocus,
        prompt,
        onSubmit: (dice) => this._setPick(role, dice),
      }).render(true);
    }
  }

  _receivePick(msg) {
    for (const role of ["attack", "defense"]) {
      if (this.reqs[role] && this.reqs[role] === msg.reqId) {
        this._setPick(role, msg.dice);
        return;
      }
    }
  }

  _setPick(role, dice) {
    this.picks[role] = Array.isArray(dice) ? dice : [];
    this.render();
  }

  static #onRequestPick(_event, target) {
    const role = target.dataset.role;
    this._requestPick(role, role === "attack" ? this._attacker : this._defender);
  }

  static async #onReveal() {
    if (this.picks.attack === null || this.picks.defense === null) return;
    const attacker = this._attacker;
    const defender = this._defender;
    if (!attacker || !defender) {
      ui.notifications.warn("대상 액터를 찾을 수 없습니다. 마법전을 다시 개시하세요.");
      return;
    }
    await postBattleCard(attacker, defender, {
      round: this.round,
      exchange: this.exchange,
      attack: this.picks.attack,
      defense: this.picks.defense,
    });
    this.lastResult = resolveExchange(this.picks.attack, this.picks.defense);
    this.lastRoles = { attackerId: attacker.id, defenderId: defender.id };
    this.revealed = true;
    this.render();
  }

  static async #onNextExchange() {
    if (this.exchange === 1) {
      await this._beginExchange(2);
    } else {
      this.round += 1;
      await this._beginExchange(1);
    }
  }

  static async #onBoost(_event, target) {
    if (!this.lastResult || !this.lastRoles) return;
    const side = target.dataset.side; // "attack" | "defense"
    // 상대 잔여: 공격측 부스트→방어 leftover, 방어측 부스트→공격 surviving
    const struck =
      side === "attack"
        ? this.lastResult.defenseMarks.filter((m) => m.st === "leftover").map((m) => m.v)
        : [...this.lastResult.surviving];
    const actorId = side === "attack" ? this.lastRoles.attackerId : this.lastRoles.defenderId;
    const actor = game.actors.get(actorId);
    if (!actor) return;
    const owner = this._ownerUser(actor);
    if (owner) {
      const reqId = foundry.utils.randomID();
      this._boostCtx = { reqId, actorId, struck };
      requestBoost({
        reqId,
        userId: owner.id,
        side,
        max: 0, // 부스트는 상한 없음 — 다이얼로그 boost 모드의 n 스테퍼는 max 미사용
        prompt: `${actor.name} 부스트`,
      });
    } else {
      new BattleDiceDialog({
        mode: "boost",
        max: 0, // 부스트는 상한 없음 — 다이얼로그 boost 모드의 n 스테퍼는 max 미사용
        prompt: `${actor.name} 부스트`,
        onSubmit: async (dice, n) => {
          await postBoostCard(actor, { n: n ?? dice.length, dice, struck });
        },
      }).render(true);
    }
  }

  async _receiveBoost(msg) {
    const ctx = this._boostCtx;
    if (!ctx || ctx.reqId !== msg.reqId) return;
    const actor = game.actors.get(ctx.actorId);
    if (actor) await postBoostCard(actor, { n: msg.n, dice: msg.dice, struck: ctx.struck });
    this._boostCtx = null;
  }

  static async #onEnd() {
    this._reset();
    this.render();
  }
}
