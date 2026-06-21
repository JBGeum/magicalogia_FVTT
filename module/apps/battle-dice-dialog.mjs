import { applyTheme } from "../helpers/theme.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * 마법전 다이스 선택/부스트 다이얼로그. 본인 화면에만 표시(타인 숨김).
 * 옵션: { mode:"attack"|"defense"|"boost", max, prompt, onSubmit }
 *   - attack/defense: 눈 1~6을 최대 max개 선택 → onSubmit(dice[])
 *   - boost: nD6 개수 선택 → 굴림 → onSubmit(rolledDice[], n)
 */
export class BattleDiceDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "battle-dice-dialog"],
    window: { title: "마법전 — 다이스" },
    position: { width: 340, height: "auto" },
    actions: {
      addDie: BattleDiceDialog.#onAddDie,
      removeDie: BattleDiceDialog.#onRemoveDie,
      incN: BattleDiceDialog.#onIncN,
      decN: BattleDiceDialog.#onDecN,
      submit: BattleDiceDialog.#onSubmit,
    },
  };

  static PARTS = {
    dialog: { template: "systems/magicalogia/templates/apps/battle-dice-dialog.hbs" },
  };

  constructor(options = {}) {
    super(options);
    this.mode = options.mode ?? "attack";
    this.max = options.max ?? 0;
    this.prompt = options.prompt ?? "";
    this.onSubmit = options.onSubmit ?? null;
    this.dice = [];
    this.n = 1;
  }

  get isBoost() {
    return this.mode === "boost";
  }

  get label() {
    if (this.isBoost) return "부스트 — 추가 다이스";
    return `${this.mode === "attack" ? "공격" : "방어"} 다이스 선택 (최대 ${this.max})`;
  }

  async _prepareContext() {
    return {
      isBoost: this.isBoost,
      label: this.label,
      prompt: this.prompt,
      faces: [1, 2, 3, 4, 5, 6],
      dice: this.dice,
      count: this.dice.length,
      max: this.max,
      atMax: !this.isBoost && this.dice.length >= this.max,
      n: this.n,
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
  }

  static #onAddDie(_event, target) {
    if (!this.isBoost && this.dice.length >= this.max) return;
    this.dice.push(Number(target.dataset.value));
    this.render();
  }

  static #onRemoveDie(_event, target) {
    this.dice.splice(Number(target.dataset.index), 1);
    this.render();
  }

  static #onIncN() {
    this.n += 1;
    this.render();
  }

  static #onDecN() {
    if (this.n > 1) this.n -= 1;
    this.render();
  }

  static async #onSubmit() {
    let result, n;
    if (this.isBoost) {
      n = this.n;
      const roll = await new Roll(`${n}d6`).evaluate();
      result = roll.dice[0]?.results.map((r) => r.result) ?? [];
    } else {
      result = this.dice;
    }
    await this.onSubmit?.(result, n);
    this.close();
  }
}
