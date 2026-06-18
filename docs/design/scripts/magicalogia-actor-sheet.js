/* =============================================================
 *  Reference ActorSheet skeleton (Foundry VTT v11+/v12 ApplicationV1 style).
 *  This is a GUIDE, not drop-in code — adapt to your system id,
 *  data model, and Foundry version (e.g. ApplicationV2/HandlebarsApplicationMixin).
 * ============================================================= */
import { MAGICALOGIA } from "./magicalogia-config.js";

export class MagicalogiaActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["magicalogia", "sheet", "actor"], // ".magicalogia" scopes the SCSS
      template: "systems/magicalogia/templates/actor-sheet.hbs",
      width: 720,                                  // layout C — vertical scroll
      height: 920,
      tabs: [{ navSelector: ".mg-tabs", contentSelector: ".mg-tab-content", initial: "main" }]
    });
  }

  /** Theme class is appended from a flag so users can switch dark/light. */
  get themeClass() {
    const t = this.actor.getFlag("magicalogia", "theme") ?? "dark";
    return MAGICALOGIA.themes[t] ?? MAGICALOGIA.themes.dark;
  }

  async _render(force, options) {
    await super._render(force, options);
    // ensure exactly one theme class on the application root
    this.element?.[0]?.classList.remove(...Object.values(MAGICALOGIA.themes));
    this.element?.[0]?.classList.add(this.themeClass);
  }

  getData(options) {
    const ctx = super.getData(options);
    ctx.system   = this.actor.system;
    ctx.config   = MAGICALOGIA;

    // Pre-compute the chart with per-cell "active" state for {{#each}} in the template.
    // Stored flags example: system.skills["song.5"] === true  (column.key + "." + 출목)
    const skills = ctx.system.skills ?? {};
    ctx.chart = MAGICALOGIA.chart.map(col => ({
      ...col,
      active: !!(ctx.system.attributes?.[col.key]?.active),
      rows: col.cells.map((cell, i) => ({
        ...cell,
        value: MAGICALOGIA.chartIndex[i],
        on: !!skills[`${col.key}.${MAGICALOGIA.chartIndex[i]}`]
      }))
    }));
    ctx.chartIndex = MAGICALOGIA.chartIndex;
    ctx.statuses   = MAGICALOGIA.statuses.map(s => ({ ...s, active: !!ctx.system.statuses?.[s.key] }));
    ctx.spells     = ctx.system.spells ?? [];
    ctx.anchors    = ctx.system.anchors ?? [];
    return ctx;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // toggle a magic-chart skill
    html.on("click", ".mg-chart__cell .mg-check", ev => {
      const cell = ev.currentTarget.closest(".mg-chart__cell");
      const key  = cell.dataset.skill;               // e.g. "song.5"
      this.actor.update({ [`system.skills.${key}`]: !foundry.utils.getProperty(this.actor, `system.skills.${key}`) });
    });

    // toggle a status ailment
    html.on("click", ".mg-status__chip", ev => {
      const key = ev.currentTarget.dataset.status;
      this.actor.update({ [`system.statuses.${key}`]: !this.actor.system.statuses?.[key] });
    });

    // add a grimoire spell / anchor row
    html.on("click", "[data-action='add-spell']",  () => this._addArrayItem("spells",  { name:"", type:"", skill:"", target:"", cost:"", charge:0, mod:0, recite:false, effect:"" }));
    html.on("click", "[data-action='add-anchor']", () => this._addArrayItem("anchors", { name:"", fate:0, attr:"", checked:false }));
  }

  _addArrayItem(path, blank) {
    const arr = foundry.utils.deepClone(this.actor.system[path] ?? []);
    arr.push(blank);
    return this.actor.update({ [`system.${path}`]: arr });
  }
}
