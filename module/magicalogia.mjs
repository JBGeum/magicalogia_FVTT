// SCSS는 Vite가 번들 시 magicalogia.css로 추출한다.
import "../scss/magicalogia.scss";

// Documents
import { MagicalogiaActor } from "./documents/actor.mjs";
import { MagicalogiaItem } from "./documents/item.mjs";
// DataModels
import { CharacterDataModel } from "./data/actors/character.mjs";
import { GenericItemDataModel } from "./data/items/generic.mjs";
import { SpellDataModel } from "./data/items/spell.mjs";
import { AnchorDataModel } from "./data/items/anchor.mjs";
// Sheets
import { MagicalogiaActorSheet } from "./sheets/actor-sheet.mjs";
import { MagicalogiaItemSheet } from "./sheets/item-sheet.mjs";
// Helpers
import { MAGICALOGIA } from "./helpers/config.mjs";
import { preloadHandlebarsTemplates, registerHandlebarsHelpers } from "./helpers/templates.mjs";
import { registerThemeSetting } from "./helpers/theme.mjs";

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
    spell: SpellDataModel,
    anchor: AnchorDataModel,
  };

  // V13: 시트 컬렉션은 foundry.documents.collections 네임스페이스.
  const ActorsCls = foundry.documents.collections.Actors;
  const ItemsCls = foundry.documents.collections.Items;

  ActorsCls.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  ActorsCls.registerSheet("magicalogia", MagicalogiaActorSheet, { makeDefault: true });
  ItemsCls.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  ItemsCls.registerSheet("magicalogia", MagicalogiaItemSheet, { makeDefault: true });

  registerThemeSetting();
  registerHandlebarsHelpers();
  return preloadHandlebarsTemplates();
});
