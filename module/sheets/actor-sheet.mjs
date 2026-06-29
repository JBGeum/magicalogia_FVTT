import { computeTable } from "../system/specialty-table.mjs";
import { rollSpecialty, rollSoulSkill, rollVariableSkill } from "../system/specialty-roll.mjs";
import { castSpell } from "../system/spell-cast.mjs";
import { summonArchetype, resolveSummonSkill } from "../system/archetype-summon.mjs";
import { postChargeCard } from "../system/spell-charge.mjs";
import { postTableCard } from "../system/table-card.mjs";
import { applyTheme } from "../helpers/theme.mjs";
import { formatCost, isCharged, chargeCostOf } from "../helpers/config.mjs";
import { adjustStatValue } from "../system/stat-adjust.mjs";
import { postStatCard } from "../system/stat-card.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

// 장서 충전 슬롯(마름모) 개수. charge 0..CHARGE_SLOTS.
const CHARGE_SLOTS = 6;

export class MagicalogiaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor"],
    position: { width: 864, height: 920 },
    window: { resizable: true },
    form: {
      handler: MagicalogiaActorSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      "toggle-misfortune": MagicalogiaActorSheet.#onToggleMisfortune,
      "toggle-skill-edit": MagicalogiaActorSheet.#onToggleSkillEdit,
      rollSpecialty: MagicalogiaActorSheet.#onRollSpecialty,
      "roll-soul": MagicalogiaActorSheet.#onRollSoul,
      "roll-variable": MagicalogiaActorSheet.#onRollVariable,
      editImg: MagicalogiaActorSheet.#onEditImg,
      toggleStatus: MagicalogiaActorSheet.#onToggleStatus,
      toggleTrueForm: MagicalogiaActorSheet.#onToggleTrueForm,
      "toggle-wrap": MagicalogiaActorSheet.#onToggleWrap,
      "roll-table": MagicalogiaActorSheet.#onRollTable,
      "add-spell": MagicalogiaActorSheet.#onAddSpell,
      "toggle-spell-flag": MagicalogiaActorSheet.#onToggleSpellFlag,
      "set-charge": MagicalogiaActorSheet.#onSetCharge,
      "add-anchor": MagicalogiaActorSheet.#onAddAnchor,
      "toggle-anchor": MagicalogiaActorSheet.#onToggleAnchor,
      "toggle-scar": MagicalogiaActorSheet.#onToggleScar,
      "toggle-accordion": MagicalogiaActorSheet.#onToggleAccordion,
      "cast-spell": MagicalogiaActorSheet.#onCastSpell,
      "adjust-stat": MagicalogiaActorSheet.#onAdjustStat,
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
    const anchorItems = this.actor.itemTypes.anchor;
    const scarAttrs = anchorItems
      .filter((it) => it.system.scar && it.system.scarAttr)
      .map((it) => it.system.scarAttr);
    context.chart = computeTable({
      owned: sys.skills,
      misfortune: sys.misfortune,
      scarAttrs,
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

    // 장서 — spell 아이템 + 충전 슬롯(rings)/코스트 라벨 표시 데이터.
    context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
    context.spells = this.actor.itemTypes.spell.map((it) => {
      const charge = it.system.charge ?? 0;
      const costAmt = chargeCostOf(it.system.cost);
      const ready = isCharged(it.system.cost, charge); // 충전≥코스트 & 코스트>0
      return {
        id: it.id,
        name: it.name,
        system: it.system,
        costLabel: formatCost(it.system.cost),
        ready, // 장비/유효(충전 충족) — 링 그룹 title용.
        rings: Array.from({ length: CHARGE_SLOTS }, (_, r) => {
          const n = r + 1;
          // 활성화 시 코스트만큼의 링만 활성화 색, 초과 충전은 기존 마소색 유지.
          return { n, on: n <= charge, active: ready && n <= costAmt };
        }),
      };
    });

    // 관계 — anchor 아이템.
    context.anchors = anchorItems.map((it) => ({
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

  /** mg-check 클릭 → 특기 불운 마킹 토글. ArrayField라 배열 전체 갱신. */
  static async #onToggleMisfortune(_event, target) {
    const col = target.dataset.col;
    const index = Number(target.dataset.index);
    const arr = foundry.utils.deepClone(this.actor.system.misfortune[col] ?? []);
    while (arr.length < 11) arr.push(false);
    arr[index] = !arr[index];
    await this.actor.update({ [`system.misfortune.${col}`]: arr });
  }

  /** 습득 편집 모드 토글 — 휘발성(저장 안 함). 리렌더 없이 DOM 클래스만 토글. */
  static #onToggleSkillEdit(_event, target) {
    this._skillEdit = !this._skillEdit;
    this.element.querySelector(".mg-chart")?.classList.toggle("is-editing", this._skillEdit);
    target.classList.toggle("is-on", this._skillEdit);
    const icon = target.querySelector("i");
    if (icon) icon.className = this._skillEdit ? "fa-solid fa-lock-open" : "fa-solid fa-lock";
  }

  /** 장서 추가 — spell 아이템 생성 후 시트를 연다. */
  static async #onAddSpell() {
    const [item] = await this.actor.createEmbeddedDocuments("Item", [
      { type: "spell", name: "새 마법" },
    ]);
    item?.sheet.render(true);
  }

  /** 장서 sealed/recite boolean 토글. */
  static async #onToggleSpellFlag(_event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const flag = target.dataset.flag; // "sealed" | "recite"
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

  /** 특기명 클릭 → 평소 2d6 판정. 습득 편집 모드 ON이면 대신 습득(owned) 토글. */
  static async #onRollSpecialty(_event, target) {
    const col = target.dataset.col;
    const index = Number(target.dataset.index);
    if (this._skillEdit) {
      const arr = foundry.utils.deepClone(this.actor.system.skills[col] ?? []);
      while (arr.length < 11) arr.push(false);
      arr[index] = !arr[index];
      await this.actor.update({ [`system.skills.${col}`]: arr });
      return;
    }
    await rollSpecialty(this.actor, col, index);
  }

  /** 혼의 특기 클릭 → 목표치 6 고정의 2d6 판정. */
  static async #onRollSoul() {
    await rollSoulSkill(this.actor);
  }

  /** 가변특기 라벨 클릭 → 선택 영역에서 굴려 특기 결정·채팅 표시(판정은 별도). */
  static async #onRollVariable() {
    await rollVariableSkill(this.actor);
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

  /** 헤더 hover 오버레이의 −/+ 클릭 → 해당 수치를 ±1(하한 0)로 갱신. */
  static async #onAdjustStat(_event, target) {
    const field = target.dataset.field;
    const delta = Number(target.dataset.delta);
    const before = foundry.utils.getProperty(this.actor, field);
    const next = adjustStatValue(before, delta);
    // 시트 전체 리렌더는 hover 오버레이를 깜빡이게 한다. 해당 input만 DOM에서 직접 갱신하고
    // 저장은 render:false로 처리한다(다른 표시에 영향 없는 독립 수치).
    const input = target.closest(".mg-stat, .mg-gauge")?.querySelector(`input[name="${field}"]`);
    if (input) input.value = next;
    await this.actor.update({ [field]: next }, { render: false });
    this.#queueStatCard(field, before);
  }

  /** 마력/임시마력 증감을 0.8초 디바운스로 모아 카드 1장 발행(연타 합산). */
  #queueStatCard(field, before) {
    if (field !== "system.mp.value" && field !== "system.tempMp") return;
    this._statCardPending ??= {};
    const pending = (this._statCardPending[field] ??= { before });
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      const after = foundry.utils.getProperty(this.actor, field);
      delete this._statCardPending[field];
      if (after !== pending.before) postStatCard(this.actor, field, pending.before, after);
    }, 800);
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

  /** 마법표 가로순환(어둠↔별 인접) 토글. */
  static async #onToggleWrap() {
    await this.actor.update({
      "system.horizontalWrap": !this.actor.system.horizontalWrap,
    });
  }

  /** 표 버튼(⚙) — world에서 동명 RollTable 검색 → 없으면 compendium fallback → 굴림. */
  static async #onRollTable(_event, target) {
    const name = target.dataset.table;
    let table = game.tables.getName(name);
    if (!table) {
      for (const pack of game.packs) {
        if (pack.documentName !== "RollTable") continue;
        const entry = pack.index.find((e) => e.name === name);
        if (entry) {
          table = await pack.getDocument(entry._id);
          break;
        }
      }
    }
    if (!table) {
      ui.notifications.warn(`'${name}' 표를 찾을 수 없습니다.`);
      return;
    }
    // 네이티브 카드 대신 시스템 .mg-card 양식으로 발행.
    const { roll, results } = await table.draw({ displayChat: false });
    await postTableCard(table, roll, results, this.actor);
  }

  /**
   * 장서/관계 아코디언 펼침 토글. 리렌더 없이 DOM 클래스만 직접 토글해 스크롤 위치를
   * 보존한다. 펼침 상태는 인스턴스 멤버에 보관해, submitOnChange 등으로 시트가 리렌더될
   * 때 _onRender가 복원한다(저장 안 함).
   */
  static #onToggleAccordion(_event, target) {
    const key = target.dataset.acc; // "library" | "relations"
    this._accOpen ??= { library: false, relations: false };
    this._accOpen[key] = !this._accOpen[key];
    target.closest(".mg-accordion")?.classList.toggle("is-open", this._accOpen[key]);
  }

  /** 장서 행 ✦ 클릭 → 시전 카드(항상). 소환 장서는 판정 성공 시에만 원형 소환. */
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

    const editOn = !!this._skillEdit;
    this.element.querySelector(".mg-chart")?.classList.toggle("is-editing", editOn);
    const editBtn = this.element.querySelector('[data-action="toggle-skill-edit"]');
    if (editBtn) {
      editBtn.classList.toggle("is-on", editOn);
      const icon = editBtn.querySelector("i");
      if (icon) icon.className = editOn ? "fa-solid fa-lock-open" : "fa-solid fa-lock";
    }

    const open = (el) => this.actor.items.get(el.dataset.itemId)?.sheet.render(true);
    const del = (el) => this.actor.items.get(el.dataset.itemId)?.delete();
    for (const sel of [".mg-library .mg-table__row", ".mg-relations .mg-table__row"]) {
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
    this._accOpen ??= { library: false, relations: false };
    for (const key of ["library", "relations"]) {
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

  _onClose(options) {
    this._skillEdit = false;
    for (const k in this._statCardPending) clearTimeout(this._statCardPending[k].timer);
    this._statCardPending = {};
    return super._onClose?.(options);
  }

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
