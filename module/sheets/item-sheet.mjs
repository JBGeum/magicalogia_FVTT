const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MagicalogiaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "item"],
    position: { width: 480, height: "auto" },
    window: { resizable: true },
    form: {
      handler: MagicalogiaItemSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
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
    } else if (this.item.type === "anchor") {
      context.anchorAttrs = CONFIG.MAGICALOGIA.anchorAttrs;
    }
    return context;
  }

  static async #onSubmit(_event, _form, formData) {
    await this.item.update(formData.object);
  }
}
