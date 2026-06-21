/**
 * Handlebars 템플릿 preload. V13: loadTemplates는 foundry.applications.handlebars 네임스페이스.
 * @returns {Promise<Function[]>}
 */
export const preloadHandlebarsTemplates = async function () {
  const { loadTemplates } = foundry.applications.handlebars;
  return loadTemplates([
    "systems/magicalogia/templates/actor/character-sheet.hbs",
    "systems/magicalogia/templates/actor/parts/magic-chart.hbs",
    "systems/magicalogia/templates/actor/parts/mg-field.hbs",
    "systems/magicalogia/templates/actor/parts/mg-svg-pcorner.hbs",
    "systems/magicalogia/templates/actor/parts/mg-svg-rankflr.hbs",
    "systems/magicalogia/templates/actor/parts/mg-svg-chart-icon.hbs",
    "systems/magicalogia/templates/actor/parts/mg-svg-miniflr.hbs",
    "systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs",
    "systems/magicalogia/templates/actor/parts/grimoire.hbs",
    "systems/magicalogia/templates/actor/parts/relations.hbs",
    "systems/magicalogia/templates/item/generic-sheet.hbs",
    "systems/magicalogia/templates/item/spell-sheet.hbs",
    "systems/magicalogia/templates/item/anchor-sheet.hbs",
    "systems/magicalogia/templates/chat/specialty-roll.hbs",
    "systems/magicalogia/templates/chat/spell-card.hbs",
    "systems/magicalogia/templates/chat/charge-card.hbs",
    "systems/magicalogia/templates/apps/specialty-picker.hbs",
  ]);
};

/**
 * 공용 Handlebars 헬퍼 등록.
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("checked", (condition) => (condition ? "checked" : ""));
  Handlebars.registerHelper("selected", (condition) => (condition ? "selected" : ""));
  Handlebars.registerHelper("eq", (a, b) => a === b);
}
