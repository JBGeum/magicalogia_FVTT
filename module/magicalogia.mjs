// SCSS는 Vite가 번들 시 magicalogia.css로 추출한다.
import "../scss/magicalogia.scss";

// Documents
import { MagicalogiaActor } from "./documents/actor.mjs";
import { MagicalogiaItem } from "./documents/item.mjs";
// DataModels
import { CharacterDataModel } from "./data/actors/character.mjs";
import { GenericItemDataModel } from "./data/items/generic.mjs";
// Helpers
import { MAGICALOGIA } from "./helpers/config.mjs";
import { preloadHandlebarsTemplates, registerHandlebarsHelpers } from "./helpers/templates.mjs";

Hooks.once("init", async function () {
  game.magicalogia = {
    MagicalogiaActor,
    MagicalogiaItem,
  };

  CONFIG.MAGICALOGIA = MAGICALOGIA;

  CONFIG.Actor.documentClass = MagicalogiaActor;
  CONFIG.Item.documentClass = MagicalogiaItem;

  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
  };
  CONFIG.Item.dataModels = {
    generic: GenericItemDataModel,
  };

  registerHandlebarsHelpers();
  return preloadHandlebarsTemplates();
});
