import { applyTheme } from "../helpers/theme.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** 원형(archetype) 시트 — 읽기 중심 단순 표시. */
export class MagicalogiaArchetypeSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor", "archetype"],
    position: { width: 430, height: "auto" },
    window: { resizable: true },
    actions: {
      editImg: MagicalogiaArchetypeSheet.#onEditImg,
      "toggle-block": MagicalogiaArchetypeSheet.#onToggleBlock,
    },
    form: {
      handler: MagicalogiaArchetypeSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    archetype: {
      template: "systems/magicalogia/templates/actor/archetype-sheet.hbs",
    },
  };

  get title() {
    return this.actor.name;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["archetype"];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    context.actor = this.actor;
    context.system = sys;
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    context.attributes = CONFIG.MAGICALOGIA.attributes;
    context.enrichedFeatures = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.features,
      { secrets: this.actor.isOwner },
    );
    return context;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
  }

  /** 블록 보유(hasBlock) 토글 — 시안 mg-check 체크박스. */
  static async #onToggleBlock() {
    if (!this.isEditable) return; // 잠긴 컴펜디움 등 편집 불가 시 차단.
    await this.actor.update({ "system.hasBlock": !this.actor.system.hasBlock });
  }

  /** 초상화 클릭 → FilePicker로 원형 이미지 교체. */
  static async #onEditImg() {
    if (!this.isEditable) return; // 잠긴 컴펜디움 등 편집 불가 시 차단.
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: this.actor.img,
      callback: (path) => this.actor.update({ img: path }),
    });
    return fp.browse();
  }

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
