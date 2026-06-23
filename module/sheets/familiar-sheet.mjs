import { applyTheme } from "../helpers/theme.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** 원형(familiar) 시트 — 읽기 중심 단순 표시. */
export class MagicalogiaFamiliarSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor", "familiar"],
    position: { width: 420, height: "auto" },
    window: { resizable: true },
    form: {
      handler: MagicalogiaFamiliarSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    familiar: {
      template: "systems/magicalogia/templates/actor/familiar-sheet.hbs",
    },
  };

  get title() {
    return this.actor.name;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["familiar"];
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

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
