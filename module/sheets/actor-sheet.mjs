import { computeTable } from "../system/specialty-table.mjs";
import { rollSpecialty, rollSoulSkill } from "../system/specialty-roll.mjs";
import { castSpell } from "../system/spell-cast.mjs";
import { summonArchetype, resolveSummonSkill } from "../system/archetype-summon.mjs";
import { postChargeCard } from "../system/spell-charge.mjs";
import { applyTheme } from "../helpers/theme.mjs";
import { formatCost } from "../helpers/config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

// 장서 충전 슬롯(마름모) 개수. charge 0..CHARGE_SLOTS.
const CHARGE_SLOTS = 6;

export class MagicalogiaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor"],
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
      "roll-soul": MagicalogiaActorSheet.#onRollSoul,
      editImg: MagicalogiaActorSheet.#onEditImg,
      toggleStatus: MagicalogiaActorSheet.#onToggleStatus,
      toggleTrueForm: MagicalogiaActorSheet.#onToggleTrueForm,
      "add-spell": MagicalogiaActorSheet.#onAddSpell,
      "toggle-spell-flag": MagicalogiaActorSheet.#onToggleSpellFlag,
      "set-charge": MagicalogiaActorSheet.#onSetCharge,
      "add-anchor": MagicalogiaActorSheet.#onAddAnchor,
      "toggle-anchor": MagicalogiaActorSheet.#onToggleAnchor,
      "toggle-scar": MagicalogiaActorSheet.#onToggleScar,
      "toggle-accordion": MagicalogiaActorSheet.#onToggleAccordion,
      "cast-spell": MagicalogiaActorSheet.#onCastSpell,
    },
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", label: "캐릭터 시트" },
        { id: "info", label: "정보" },
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
    context.organonOptions = CONFIG.MAGICALOGIA.ORGANON_OPTIONS;
    // 계제 등급명(범위 밖이면 빈 문자열). "ko (kana)" 형식.
    const st = CONFIG.MAGICALOGIA.stageTitles[Number(sys.stage)];
    context.stageTitle = st ? `${st.ko} (${st.kana})` : "";
    context.effectTypes = CONFIG.MAGICALOGIA.EFFECT_TYPES.map((t) => ({
      value: t,
      selected: t === sys.effectType,
    }));

    // 장서 — spell 아이템 + 충전 슬롯(rings)/코스트 라벨 표시 데이터.
    context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
    context.spells = this.actor.itemTypes.spell.map((it) => {
      return {
        id: it.id,
        name: it.name,
        system: it.system,
        costLabel: formatCost(it.system.cost),
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
      info: { id: "info", group: "primary", label: "정보", active: activeTab === "info" },
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

  /** 장서 충전 슬롯 클릭 — 별점식 증감(현재 값과 같은 칸 클릭 시 -1). 변동 시 채팅 카드 발행. */
  static async #onSetCharge(_event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const ring = Number(target.dataset.ring);
    const before = item.system.charge ?? 0;
    const after = item.system.charge === ring ? ring - 1 : ring;
    if (after === before) return;
    await item.update({ "system.charge": after });
    await postChargeCard(this.actor, item, before, after, CHARGE_SLOTS);
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

  /** 혼의 특기 클릭 → 목표치 6 고정의 2d6 판정. */
  static async #onRollSoul() {
    await rollSoulSkill(this.actor);
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

  /**
   * 장서/관계 아코디언 펼침 토글. 리렌더 없이 DOM 클래스만 직접 토글해 스크롤 위치를
   * 보존한다. 펼침 상태는 인스턴스 멤버에 보관해, submitOnChange 등으로 시트가 리렌더될
   * 때 _onRender가 복원한다(저장 안 함).
   */
  static #onToggleAccordion(_event, target) {
    const key = target.dataset.acc; // "grimoire" | "relations"
    this._accOpen ??= { grimoire: false, relations: false };
    this._accOpen[key] = !this._accOpen[key];
    target.closest(".mg-accordion")?.classList.toggle("is-open", this._accOpen[key]);
  }

  /** 그리모어 행 ✦ 클릭 → 시전 카드(항상). 소환 장서는 판정 성공 시에만 원형 소환. */
  static async #onCastSpell(_event, target) {
    const spell = this.actor.items.get(target.dataset.itemId);
    if (!spell) return;
    // 가변 소환: 영역(고정/1d6)+행(2d6)으로 특기를 확정한 뒤 그 특기로 판정.
    let skillOverride;
    const summonRolls = [];
    if (spell.system.skill === "가변") {
      let attrDie;
      if (!spell.system.archetypeVarAttr) {
        const ar = await new Roll("1d6").evaluate();
        summonRolls.push(ar);
        attrDie = ar.total;
      }
      const sr = await new Roll("2d6").evaluate();
      summonRolls.push(sr);
      skillOverride = resolveSummonSkill(spell, { attrDie, skillSum: sr.total });
    }
    const result = await castSpell(this.actor, target.dataset.itemId, { skillOverride });
    if (result?.success && (spell.system.archetypeUuid ?? "").trim()) {
      await summonArchetype(this.actor, spell, { skill: skillOverride, rolls: summonRolls });
    }
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
    this._accOpen ??= { grimoire: false, relations: false };
    for (const key of ["grimoire", "relations"]) {
      this.element
        .querySelector(`[data-acc="${key}"]`)
        ?.closest(".mg-accordion")
        ?.classList.toggle("is-open", this._accOpen[key]);
    }

    // 스크롤 위치 보존: 충전 변경/submitOnChange 등으로 재렌더되면 part 루트(스크롤 컨테이너
    // .window-content > div)가 새 DOM으로 교체되어 scrollTop이 0이 된다. Foundry의 part
    // scrollable 옵션이 이 빌드에서 동작하지 않아, 직접 직전 위치를 복원하고 이후 스크롤을
    // 추적해 둔다(요소가 매 렌더 교체되므로 리스너 누수 없음).
    this._scrollTop ??= 0;
    const scroller = this.element.querySelector(".window-content > div");
    if (scroller) {
      if (this._scrollTop) scroller.scrollTop = this._scrollTop;
      scroller.addEventListener("scroll", () => (this._scrollTop = scroller.scrollTop), {
        passive: true,
      });
    }

    applyTheme(this.element);
  }

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
