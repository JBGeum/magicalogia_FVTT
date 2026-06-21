import { specialtyGrid } from "../system/specialty-table.mjs";
import { applyTheme } from "../helpers/theme.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * 지정특기 선택 다이얼로그. 6열(영역)×11행(출목) 마법표 그리드에서
 * 셀(특기명) 클릭 시 onPick(name) 호출 후 닫힌다.
 * 옵션: { current:string(현재 skill), onPick:(name)=>void }
 */
export class SpecialtyPickerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "specialty-picker"],
    window: { title: "지정특기 선택" },
    position: { width: 540, height: "auto" },
    actions: {
      pick: SpecialtyPickerApp.#onPick,
    },
  };

  static PARTS = {
    picker: {
      template: "systems/magicalogia/templates/apps/specialty-picker.hbs",
    },
  };

  constructor(options = {}) {
    super(options);
    this.current = options.current ?? "";
    this.onPick = options.onPick ?? null;
  }

  async _prepareContext(_options) {
    return {
      columns: CONFIG.MAGICALOGIA.attributes,
      rows: specialtyGrid(),
      current: this.current,
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
  }

  /** 셀 클릭 → onPick(특기명) 후 닫기. */
  static #onPick(_event, target) {
    this.onPick?.(target.dataset.skill);
    this.close();
  }
}
