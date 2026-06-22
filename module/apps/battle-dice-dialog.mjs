import { applyTheme } from "../helpers/theme.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * 마법전 다이스 선택/부스트/입회 다이얼로그. 본인 화면에만(타인 숨김).
 * 옵션: { mode, max, prompt, onSubmit, allowFocus }
 *   - attack/defense: 눈 0~max개 → onSubmit(dice[])
 *     · allowFocus(방어·방어력≥3): 집중 토글 시 눈 최대 2개 → onSubmit([v1,(v2),0])
 *   - boost: nD6 개수 → 굴림 → onSubmit(rolledDice[], n)
 *   - witness: 측 토글(기본 방어) + 눈 0~2개 → onSubmit(dice[], { side })
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
      setSide: BattleDiceDialog.#onSetSide,
      submit: BattleDiceDialog.#onSubmit,
      randomSubmit: BattleDiceDialog.#onRandomSubmit,
      addRandomDie: BattleDiceDialog.#onAddRandomDie,
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
    this.dice = []; // 일반/입회: 선택 눈; 집중: 대상 눈(0 마커 제외)
    this.hidden = []; // this.dice와 인덱스 동기: true=랜덤(값 숨김)
    this.n = 1;
    this.focusMode = false;
    this.side = "defense"; // witness 기본
    this.actors = options.actors ?? null; // GM 입회: 선택 후보 [{id,name}]
    this.witnessActorId = this.actors?.[0]?.id ?? null;
  }

  get isBoost() {
    return this.mode === "boost";
  }
  get isWitness() {
    return this.mode === "witness";
  }
  get cap() {
    return this.focusMode || this.isWitness ? 2 : this.max;
  }
  get showRandomSubmit() {
    return this.mode === "attack" || this.mode === "defense";
  }
  get randomDisabled() {
    return this.showRandomSubmit && this.max <= 0;
  }
  get showRandomAdd() {
    return this.isWitness;
  }

  get showActorSelect() {
    return this.isWitness && Array.isArray(this.actors) && this.actors.length > 0;
  }

  get label() {
    if (this.isBoost) return "부스트 — 추가 다이스";
    if (this.isWitness) return "입회 — 가산 다이스 (최대 2)";
    if (this.focusMode) return "집중 방어 — 상쇄할 눈 최대 2개";
    return `${this.mode === "attack" ? "공격" : "방어"} 다이스 선택 (최대 ${this.max})`;
  }

  async _prepareContext() {
    return {
      isBoost: this.isBoost,
      isWitness: this.isWitness,
      isFocus: this.focusMode,
      allowFocus: this.allowFocus,
      side: this.side,
      label: this.label,
      prompt: this.prompt,
      faces: [1, 2, 3, 4, 5, 6],
      dice: (() => {
        let order = 0;
        return this.dice.map((v, i) => {
          const hidden = this.hidden[i] ?? false;
          return { v, hidden, order: hidden ? (order += 1) : 0 };
        });
      })(),
      showRandomAdd: this.showRandomAdd,
      count: this.dice.length,
      max: this.max,
      atMax: !this.isBoost && this.dice.length >= this.cap,
      n: this.n,
      showRandomSubmit: this.showRandomSubmit,
      randomDisabled: this.randomDisabled,
      showActorSelect: this.showActorSelect,
      actors: this.actors,
      witnessActorId: this.witnessActorId,
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
    // <select> change는 ApplicationV2 click-action으로 안 잡혀 직접 바인딩.
    const sel = this.element.querySelector("select[data-witness-actor]");
    if (sel) sel.addEventListener("change", (e) => (this.witnessActorId = e.target.value));
  }

  static #onAddDie(_event, target) {
    const v = Number(target.dataset.value);
    if (v === 0) {
      // 집중 방어 토글
      this.focusMode = !this.focusMode;
      this.dice = [];
      this.hidden = [];
      this.render();
      return;
    }
    if (this.focusMode) {
      // 집중 대상 눈 최대 2개(중복 토글 제거)
      if (this.dice.includes(v)) this.dice = this.dice.filter((x) => x !== v);
      else if (this.dice.length < 2) this.dice.push(v);
      this.render();
      return;
    }
    if (this.isBoost) return;
    if (this.dice.length >= this.cap) return;
    this.dice.push(v);
    this.hidden.push(false);
    this.render();
  }

  static async #onAddRandomDie() {
    if (this.dice.length >= this.cap) return; // witness cap=2
    const roll = await new Roll("1d6").evaluate();
    const v = roll.dice[0]?.results[0]?.result ?? 1;
    this.dice.push(v);
    this.hidden.push(true); // 값 숨김
    this.render();
  }

  static #onRemoveDie(_event, target) {
    const i = Number(target.dataset.index);
    this.dice.splice(i, 1);
    this.hidden.splice(i, 1);
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

  static #onSetSide(_event, target) {
    this.side = target.dataset.side === "attack" ? "attack" : "defense";
    this.render();
  }

  static async #onSubmit() {
    if (this.focusMode && this.dice.length < 1) {
      ui.notifications.warn("집중 방어: 상쇄할 눈을 1~2개 선택하세요.");
      return;
    }
    let result, extra;
    if (this.isBoost) {
      extra = this.n;
      const roll = await new Roll(`${this.n}d6`).evaluate();
      result = roll.dice[0]?.results.map((r) => r.result) ?? [];
    } else if (this.isWitness) {
      result = this.dice;
      extra = { side: this.side, actorId: this.witnessActorId };
    } else if (this.focusMode) {
      result = [...this.dice, 0]; // [v1,(v2),0]
    } else {
      result = this.dice;
    }
    await this.onSubmit?.(result, extra);
    this.close();
  }

  static async #onRandomSubmit() {
    const n = this.max; // attack/defense 전용
    if (n <= 0) return; // 능력치 0 이중 가드(버튼도 비활성)
    const roll = await new Roll(`${n}d6`).evaluate();
    const dice = roll.dice[0]?.results.map((r) => r.result) ?? [];
    await this.onSubmit?.(dice); // focus 인코딩 없음, 순수 눈 배열
    this.close();
  }
}
