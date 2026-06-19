import { computeTable } from "../system/specialty-table.mjs";
import { rollSpecialty } from "../system/specialty-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

// 장서 충전 슬롯(동그라미) 개수. charge 0..CHARGE_SLOTS.
const CHARGE_SLOTS = 6;

export class MagicalogiaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor", "theme-dark"],
    position: { width: 860, height: 920 },
    window: { resizable: true },
    form: {
      handler: MagicalogiaActorSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      toggleSkill: MagicalogiaActorSheet.#onToggleSkill,
      rollSpecialty: MagicalogiaActorSheet.#onRollSpecialty,
      editImg: MagicalogiaActorSheet.#onEditImg,
      toggleStatus: MagicalogiaActorSheet.#onToggleStatus,
      "add-spell": MagicalogiaActorSheet.#onAddSpell,
      "toggle-spell-flag": MagicalogiaActorSheet.#onToggleSpellFlag,
      "set-charge": MagicalogiaActorSheet.#onSetCharge,
    },
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", label: "캐릭터 시트" },
        { id: "grimoire", label: "장서" },
      ],
      initial: "main",
    },
  };

  static PARTS = {
    character: {
      template: "systems/magicalogia/templates/actor/character-sheet.hbs",
    },
  };

  get title() {
    return this.actor.name;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = [this.document.type];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    context.actor = this.actor;
    context.system = sys;
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    context.cssClass = this.actor.type;

    context.attributes = CONFIG.MAGICALOGIA.attributes;
    context.chartRows = CONFIG.MAGICALOGIA.rows;
    context.chart = computeTable({
      owned: sys.skills,
      domain: sys.domain || null,
      wrap: sys.horizontalWrap,
    });
    context.statuses = CONFIG.MAGICALOGIA.statuses.map((s) => ({
      ...s,
      active: Boolean(sys.statuses?.[s.key]),
    }));

    // 장서 — 원본 인덱스와 충전 슬롯(rings) 표시 데이터를 미리 만든다.
    context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
    context.spells = (sys.spells ?? []).map((sp, i) => ({
      ...sp,
      index: i,
      rings: Array.from({ length: CHARGE_SLOTS }, (_, r) => ({
        n: r + 1,
        on: r + 1 <= (sp.charge ?? 0),
      })),
    }));

    context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.biography,
      {
        secrets: this.actor.isOwner,
      },
    );

    const activeTab = this.tabGroups.primary ?? "main";
    context.tabs = {
      main: { id: "main", group: "primary", label: "캐릭터 시트", active: activeTab === "main" },
      grimoire: {
        id: "grimoire",
        group: "primary",
        label: "장서",
        active: activeTab === "grimoire",
      },
    };
    return context;
  }

  /** 특기 보유 토글 — ArrayField라 배열 전체를 갱신(폼 인덱스 바인딩 회피). */
  static async #onToggleSkill(_event, target) {
    const col = target.dataset.col;
    const index = Number(target.dataset.index);
    const arr = foundry.utils.deepClone(this.actor.system.skills[col] ?? []);
    while (arr.length < 11) arr.push(false);
    arr[index] = !arr[index];
    await this.actor.update({ [`system.skills.${col}`]: arr });
  }

  /** 장서 행 추가 — 빈 항목을 배열 끝에 push. */
  static async #onAddSpell() {
    const arr = foundry.utils.deepClone(this.actor.system.spells ?? []);
    arr.push({
      name: "",
      type: "",
      skill: "",
      target: "",
      cost: "",
      charge: 0,
      mod: 0,
      active: false,
      recite: false,
      effect: "",
    });
    await this.actor.update({ "system.spells": arr });
  }

  /** 장서 행의 active/recite boolean 토글. */
  static async #onToggleSpellFlag(_event, target) {
    const index = Number(target.dataset.index);
    const flag = target.dataset.flag; // "active" | "recite"
    const arr = foundry.utils.deepClone(this.actor.system.spells ?? []);
    if (!arr[index]) return;
    arr[index][flag] = !arr[index][flag];
    await this.actor.update({ "system.spells": arr });
  }

  /** 장서 충전 슬롯 클릭 — 별점식 증감(현재 값과 같으면 -1, 아니면 클릭한 칸 수). */
  static async #onSetCharge(_event, target) {
    const i = Number(target.dataset.spell);
    const ring = Number(target.dataset.ring);
    const arr = foundry.utils.deepClone(this.actor.system.spells ?? []);
    if (!arr[i]) return;
    arr[i].charge = arr[i].charge === ring ? ring - 1 : ring;
    await this.actor.update({ "system.spells": arr });
  }

  static async #onRollSpecialty(_event, target) {
    await rollSpecialty(this.actor, target.dataset.col, Number(target.dataset.index));
  }

  /** 초상화 클릭 → FilePicker로 액터 이미지 교체. */
  static async #onEditImg() {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: this.actor.img,
      callback: (path) => this.actor.update({ img: path }),
    });
    return fp.browse();
  }

  /** 상태이상 칩 클릭 → 해당 status boolean 토글. */
  static async #onToggleStatus(_event, target) {
    const key = target.dataset.status;
    await this.actor.update({ [`system.statuses.${key}`]: !this.actor.system.statuses?.[key] });
  }

  /** 장서 행 우클릭 컨텍스트 메뉴(렌더 후 element에 위임). */
  _onRender(context, options) {
    super._onRender?.(context, options);
    new foundry.applications.ux.ContextMenu(
      this.element,
      ".mg-grimoire .mg-table__row",
      [
        {
          name: "삭제",
          icon: '<i class="fa-solid fa-trash"></i>',
          callback: (target) => this.#deleteSpell(Number(target.dataset.index)),
        },
      ],
      { jQuery: false },
    );
  }

  /** 장서 행 삭제 — 해당 index 제거 후 배열 갱신. */
  async #deleteSpell(index) {
    if (Number.isNaN(index)) return;
    const arr = foundry.utils.deepClone(this.actor.system.spells ?? []);
    arr.splice(index, 1);
    await this.actor.update({ "system.spells": arr });
  }

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
