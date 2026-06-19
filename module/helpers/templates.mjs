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
    "systems/magicalogia/templates/actor/parts/grimoire.hbs",
    "systems/magicalogia/templates/actor/parts/relations.hbs",
    "systems/magicalogia/templates/item/generic-sheet.hbs",
    "systems/magicalogia/templates/chat/specialty-roll.hbs",
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
