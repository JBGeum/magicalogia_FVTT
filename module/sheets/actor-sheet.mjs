import { computeTable } from "../system/specialty-table.mjs";
import { rollSpecialty } from "../system/specialty-roll.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

// 장서 충전 슬롯(동그라미) 개수. charge 0..CHARGE_SLOTS.
const CHARGE_SLOTS = 6;

export class MagicalogiaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor", "theme-dark"],
    position: { width: 860, height: 920 },
    window: { resizable: true },
    form: {
      handler: MagicalogiaActorSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      toggleSkill: MagicalogiaActorSheet.#onToggleSkill,
      rollSpecialty: MagicalogiaActorSheet.#onRollSpecialty,
      editImg: MagicalogiaActorSheet.#onEditImg,
      toggleStatus: MagicalogiaActorSheet.#onToggleStatus,
      toggleTrueForm: MagicalogiaActorSheet.#onToggleTrueForm,
      "add-spell": MagicalogiaActorSheet.#onAddSpell,
      "toggle-spell-flag": MagicalogiaActorSheet.#onToggleSpellFlag,
      "set-charge": MagicalogiaActorSheet.#onSetCharge,
      "add-anchor": MagicalogiaActorSheet.#onAddAnchor,
      "toggle-anchor": MagicalogiaActorSheet.#onToggleAnchor,
      "toggle-scar": MagicalogiaActorSheet.#onToggleScar,
    },
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", label: "캐릭터 시트" },
        { id: "grimoire", label: "장서" },
        { id: "relations", label: "관계" },
      ],
      initial: "main",
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
      wrap: sys.horizontalWrap,
    });
    context.statuses = CONFIG.MAGICALOGIA.statuses.map((s) => ({
      ...s,
      active: Boolean(sys.statuses?.[s.key]),
    }));

    // 식별그리드 입력 옵션(datalist 추천목록 + 효과종류 select).
    context.careerOptions = CONFIG.MAGICALOGIA.CAREER_OPTIONS;
    context.orgOptions = CONFIG.MAGICALOGIA.ORG_OPTIONS;
    context.effectTypes = CONFIG.MAGICALOGIA.EFFECT_TYPES.map((t) => ({
      value: t,
      selected: t === sys.effectType,
    }));

    // 장서 — spell 아이템 + 충전 슬롯(rings)/코스트 라벨 표시 데이터.
    const costAreaLabels = Object.fromEntries(
      CONFIG.MAGICALOGIA.COST_AREAS.map((a) => [a.value, a.label]),
    );
    context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
    context.spells = this.actor.itemTypes.spell.map((it) => {
      const area = it.system.cost?.area ?? "";
      const count = it.system.cost?.count ?? 0;
      return {
        id: it.id,
        name: it.name,
        system: it.system,
        costLabel: area ? `${costAreaLabels[area] ?? area}${count ? "×" + count : ""}` : "—",
        rings: Array.from({ length: CHARGE_SLOTS }, (_, r) => ({
          n: r + 1,
          on: r + 1 <= (it.system.charge ?? 0),
        })),
      };
    });

    // 관계 — anchor 아이템.
    context.anchors = this.actor.itemTypes.anchor.map((it) => ({
      id: it.id,
      name: it.name,
      system: it.system,
    }));

    context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.biography,
      {
        secrets: this.actor.isOwner,
      },
    );

    const activeTab = this.tabGroups.primary ?? "main";
    context.tabs = {
      main: { id: "main", group: "primary", label: "캐릭터 시트", active: activeTab === "main" },
      grimoire: {
        id: "grimoire",
        group: "primary",
        label: "장서",
        active: activeTab === "grimoire",
      },
      relations: {
        id: "relations",
        group: "primary",
        label: "관계",
        active: activeTab === "relations",
      },
    };
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

  /** 장서 추가 — spell 아이템 생성 후 시트를 연다. */
  static async #onAddSpell() {
    const [item] = await this.actor.createEmbeddedDocuments("Item", [
      { type: "spell", name: "새 마법" },
    ]);
    item?.sheet.render(true);
  }

  /** 장서 active/recite boolean 토글. */
  static async #onToggleSpellFlag(_event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const flag = target.dataset.flag; // "active" | "recite"
    await item.update({ [`system.${flag}`]: !item.system[flag] });
  }

  /** 장서 충전 슬롯 클릭 — 별점식 증감(현재 값과 같은 칸 클릭 시 -1). */
  static async #onSetCharge(_event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const ring = Number(target.dataset.ring);
    const charge = item.system.charge === ring ? ring - 1 : ring;
    await item.update({ "system.charge": charge });
  }

  /** 관계 추가 — anchor 아이템 생성 후 시트를 연다. */
  static async #onAddAnchor() {
    const [item] = await this.actor.createEmbeddedDocuments("Item", [
      { type: "anchor", name: "새 앵커" },
    ]);
    item?.sheet.render(true);
  }

  /** 관계 중하(encumbrance) 토글. */
  static async #onToggleAnchor(_event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ "system.encumbrance": !item.system.encumbrance });
  }

  /** 관계 스카(scar) 토글. */
  static async #onToggleScar(_event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ "system.scar": !item.system.scar });
  }

  static async #onRollSpecialty(_event, target) {
    await rollSpecialty(this.actor, target.dataset.col, Number(target.dataset.index));
  }

  /** 초상화 클릭 → FilePicker로 액터 이미지 교체. */
  static async #onEditImg() {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: this.actor.img,
      callback: (path) => this.actor.update({ img: path }),
    });
    return fp.browse();
  }

  /** 상태이상 칩 클릭 → 해당 status boolean 토글. */
  static async #onToggleStatus(_event, target) {
    const key = target.dataset.status;
    await this.actor.update({ [`system.statuses.${key}`]: !this.actor.system.statuses?.[key] });
  }

  /** 진정한 모습 공개 여부(trueFormRevealed) 토글. */
  static async #onToggleTrueForm() {
    await this.actor.update({
      "system.trueFormRevealed": !this.actor.system.trueFormRevealed,
    });
  }

  /** 렌더 후: 장서/관계 행 더블클릭→시트 열기, 우클릭→삭제. */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const open = (el) => this.actor.items.get(el.dataset.itemId)?.sheet.render(true);
    const del = (el) => this.actor.items.get(el.dataset.itemId)?.delete();
    for (const sel of [".mg-grimoire .mg-table__row", ".mg-relations .mg-table__row"]) {
      this.element.querySelectorAll(sel).forEach((row) => {
        row.addEventListener("dblclick", () => open(row));
      });
      new foundry.applications.ux.ContextMenu(
        this.element,
        sel,
        [{ name: "삭제", icon: '<i class="fa-solid fa-trash"></i>', callback: del }],
        { jQuery: false },
      );
    }
  }

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
