import { computeTable } from "../system/specialty-table.mjs";
import { rollSpecialty } from "../system/specialty-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class MagicalogiaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor", "theme-dark"],
    position: { width: 720, height: 920 },
    window: { resizable: true },
    form: {
      handler: MagicalogiaActorSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      toggleSkill: MagicalogiaActorSheet.#onToggleSkill,
      rollSpecialty: MagicalogiaActorSheet.#onRollSpecialty,
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
      scarDomains: sys.scarDomains,
      wrap: sys.horizontalWrap,
    });
    context.statuses = CONFIG.MAGICALOGIA.statuses.map((s) => ({
      ...s,
      active: Boolean(sys.statuses?.[s.key]),
    }));

    context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.biography,
      {
        secrets: this.actor.isOwner,
      },
    );
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

  static async #onRollSpecialty(_event, target) {
    await rollSpecialty(this.actor, target.dataset.col, Number(target.dataset.index));
  }

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
