import { applyTheme } from "../helpers/theme.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * 마법전 다이스 선택/부스트 다이얼로그. 본인 화면에만 표시(타인 숨김).
 * 옵션: { mode:"attack"|"defense"|"boost", max, prompt, onSubmit, allowFocus }
 *   - attack/defense: 눈 1~6을 최대 max개 선택 → onSubmit(dice[])
 *   - boost: nD6 개수 선택 → 굴림 → onSubmit(rolledDice[], n)
 *   - allowFocus(방어·방어력≥3): 0 버튼으로 집중 방어 → [0, X]만 선택(눈 X 전부 상쇄)
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
    this.allowFocus = options.allowFocus ?? false;
    this.dice = [];
    this.n = 1;
  }

  get isBoost() {
    return this.mode === "boost";
  }

  /** 집중 방어 모드(0 마커 선택됨). */
  get isFocus() {
    return this.dice[0] === 0;
  }

  get label() {
    if (this.isBoost) return "부스트 — 추가 다이스";
    if (this.isFocus) return "집중 방어 — 상쇄할 눈 1개 선택";
    return `${this.mode === "attack" ? "공격" : "방어"} 다이스 선택 (최대 ${this.max})`;
  }

  async _prepareContext() {
    return {
      isBoost: this.isBoost,
      isFocus: this.isFocus,
      allowFocus: this.allowFocus,
      label: this.label,
      prompt: this.prompt,
      faces: [1, 2, 3, 4, 5, 6],
      dice: this.dice,
      count: this.dice.length,
      max: this.max,
      atMax: !this.isBoost && !this.isFocus && this.dice.length >= this.max,
      n: this.n,
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
  }

  static #onAddDie(_event, target) {
    const v = Number(target.dataset.value);
    if (v === 0) {
      // 집중 방어 토글: 켜면 [0](대상 눈 대기), 끄면 [].
      this.dice = this.isFocus ? [] : [0];
      this.render();
      return;
    }
    if (this.isFocus) {
      // 집중 방어: 상쇄할 눈 1개만(교체).
      this.dice = [0, v];
      this.render();
      return;
    }
    if (!this.isBoost && this.dice.length >= this.max) return;
    this.dice.push(v);
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
    if (this.isFocus && this.dice.length < 2) {
      ui.notifications.warn("집중 방어: 상쇄할 눈을 1개 선택하세요.");
      return;
    }
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
