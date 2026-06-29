import { applyTheme } from "../helpers/theme.mjs";
import { SpecialtyPickerApp } from "../apps/specialty-picker.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MagicalogiaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "item"],
    position: { width: 576, height: "auto" },
    window: { resizable: true },
    form: {
      handler: MagicalogiaItemSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      "toggle-field": MagicalogiaItemSheet.#onToggleField,
      "pick-specialty": MagicalogiaItemSheet.#onPickSpecialty,
      "toggle-variable": MagicalogiaItemSheet.#onToggleVariable,
    },
  };

  static PARTS = {
    generic: {
      template: "systems/magicalogia/templates/item/generic-sheet.hbs",
    },
    spell: {
      template: "systems/magicalogia/templates/item/spell-sheet.hbs",
    },
    anchor: {
      template: "systems/magicalogia/templates/item/anchor-sheet.hbs",
    },
  };

  get title() {
    return this.item.name;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = [this.document.type];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const itemData = this.item.toObject(false);
    context.item = this.item;
    context.system = itemData.system;
    context.editable = this.isEditable;
    context.owner = this.item.isOwner;
    context.cssClass = this.item.type;
    context.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.item.system.description,
        { secrets: this.item.isOwner },
      );
    if (this.item.type === "spell") {
      context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
      context.costAreas = CONFIG.MAGICALOGIA.COST_AREAS;
      context.summonAttrs = CONFIG.MAGICALOGIA.attributes;
      context.isVariable = itemData.system.skill === "가변";
    } else if (this.item.type === "anchor") {
      context.fateAttr = CONFIG.MAGICALOGIA.fateAttr;
      context.attributes = CONFIG.MAGICALOGIA.attributes;
    }
    return context;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
  }

  static async #onSubmit(_event, _form, formData) {
    await this.item.update(formData.object);
  }

  /** 불리언 필드 토글(.mg-check 클릭) — data-field 경로의 boolean 반전. */
  static async #onToggleField(_event, target) {
    const field = target.dataset.field;
    await this.item.update({ [field]: !foundry.utils.getProperty(this.item, field) });
  }

  /** 「표에서 선택」 → 특기표 picker 다이얼로그를 열고 선택 시 system.skill 갱신. */
  static async #onPickSpecialty() {
    new SpecialtyPickerApp({
      current: this.item.system.skill,
      onPick: (name) => this.item.update({ "system.skill": name }),
    }).render(true);
  }

  /** 「가변」 토글 → skill을 "가변"(가변 소환 트리거)과 "" 사이에서 전환. */
  static async #onToggleVariable() {
    const next = this.item.system.skill === "가변" ? "" : "가변";
    await this.item.update({ "system.skill": next });
  }
}
