# 장서/관계 Item화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캐릭터의 `system.spells`/`system.anchors` ArrayField를 Foundry embedded Item(`spell`/`anchor` 서브타입)으로 전환하고, 룰 충실성 교정(cost 구조화·anchor scar·encumbrance 네이밍)을 반영한다.

**Architecture:** 표준 Item 전환 + A안(액터 탭은 목록·빠른 토글, 본문 편집은 전용 item sheet). 기존 단일 `MagicalogiaItemSheet`가 `options.parts=[type]`로 타입별 템플릿을 라우팅하는 패턴을 그대로 확장한다. 마이그레이션 스크립트는 없음(개발 초기 — 기존 배열 데이터 폐기).

**Tech Stack:** Foundry VTT V13 ApplicationV2(`ActorSheetV2`/`ItemSheetV2`), DataModel(`TypeDataModel`), Handlebars, Vitest, Vite(SCSS 번들), prettier(pre-commit).

## Global Constraints

- 커밋 메시지: 영어 한 줄, co-author 없음(메모리 `commit-message-style`).
- 데이터 모델 필드는 `foundry.data.fields` 사용. config 상수는 `module/helpers/config.mjs`의 `MAGICALOGIA` 객체 단일 출처.
- 모델 단위테스트는 `globalThis.foundry` FakeField 목으로 `defineSchema()`를 검사(기존 `test/character-model.test.mjs` 패턴). 시트 액션은 무테스트(ApplicationV2 인프라 없음).
- Item 이름은 문서 최상위 `name` 사용 — system 스키마에 `name` 넣지 않음.
- 마이그레이션 없음: 기존 `system.spells`/`anchors` 잔존 데이터는 폐기.

---

## File Structure

- `module/helpers/config.mjs` (수정): `MAGICALOGIA.COST_AREAS` 추가.
- `module/data/items/spell.mjs` (신규): `SpellDataModel`.
- `module/data/items/anchor.mjs` (신규): `AnchorDataModel`.
- `module/data/actors/character.mjs` (수정): `spells`/`anchors` 제거.
- `module/magicalogia.mjs` (수정): `spell`/`anchor` dataModel 등록.
- `module/sheets/item-sheet.mjs` (수정): PARTS + 타입별 context.
- `module/sheets/actor-sheet.mjs` (수정): 아이템 기반 context·액션·렌더 훅.
- `templates/item/spell-sheet.hbs`·`templates/item/anchor-sheet.hbs` (신규).
- `templates/actor/parts/grimoire.hbs`·`relations.hbs` (수정): 아이템 순회 + `data-item-id`.
- `module/helpers/templates.mjs` (수정): 신규 템플릿 프리로드.
- `scss/component/_item-sheet.scss` (신규) + `scss/magicalogia.scss` (수정): item 폼 소규모 스타일.
- `test/spell-model.test.mjs`·`test/anchor-model.test.mjs` (신규), `test/character-model.test.mjs` (수정).

---

## Task 1: COST_AREAS 상수 + SpellDataModel

**Files:**

- Modify: `module/helpers/config.mjs`
- Create: `module/data/items/spell.mjs`
- Test: `test/spell-model.test.mjs`

**Interfaces:**

- Produces: `MAGICALOGIA.COST_AREAS` = `Array<{value,label}>`. `SpellDataModel.defineSchema()` → keys `description,type,skill,target,cost,charge,mod,active,recite,effect`. `cost` = SchemaField `{area:StringField, count:NumberField}`.

- [ ] **Step 1: COST_AREAS 상수 추가**

`module/helpers/config.mjs`의 `MAGICALOGIA.spellTypes` 줄 아래에 추가:

```js
// 코스트 영역(마소 속성) select 옵션. ""=미선택, all=全, none=없음.
MAGICALOGIA.COST_AREAS = [
  { value: "", label: "—" },
  { value: "star", label: "별" },
  { value: "beast", label: "짐승" },
  { value: "force", label: "힘" },
  { value: "song", label: "노래" },
  { value: "dream", label: "꿈" },
  { value: "dark", label: "어둠" },
  { value: "all", label: "전(全)" },
  { value: "none", label: "없음" },
];
```

- [ ] **Step 2: 실패 테스트 작성** — `test/spell-model.test.mjs`

```js
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  class FakeField {
    constructor(opts = {}) {
      this.options = opts;
    }
  }
  globalThis.foundry = {
    data: {
      fields: {
        NumberField: FakeField,
        StringField: FakeField,
        BooleanField: FakeField,
        HTMLField: FakeField,
        SchemaField: class extends FakeField {
          constructor(schema, opts) {
            super(opts);
            this.fields = schema;
          }
        },
      },
    },
    abstract: {
      TypeDataModel: class {
        static migrateData(s) {
          return s;
        }
      },
    },
  };
});

describe("SpellDataModel", () => {
  it("핵심 필드를 포함한다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const s = SpellDataModel.defineSchema();
    for (const key of [
      "type",
      "skill",
      "target",
      "cost",
      "charge",
      "mod",
      "active",
      "recite",
      "effect",
    ]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("base 스키마(description)를 상속한다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    expect(Object.keys(SpellDataModel.defineSchema())).toContain("description");
  });
  it("cost는 area/count SchemaField다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const s = SpellDataModel.defineSchema();
    expect(Object.keys(s.cost.fields)).toEqual(["area", "count"]);
  });
  it("cost.area는 COST_AREAS 값 choices를 가진다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const { MAGICALOGIA } = await import("../module/helpers/config.mjs");
    const s = SpellDataModel.defineSchema();
    expect(s.cost.fields.area.options.choices).toEqual(MAGICALOGIA.COST_AREAS.map((a) => a.value));
  });
  it("charge 기본값은 0이다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const s = SpellDataModel.defineSchema();
    expect(s.charge.options.initial).toBe(0);
  });
  it("name 필드는 system에 두지 않는다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    expect(Object.keys(SpellDataModel.defineSchema())).not.toContain("name");
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- spell-model`
Expected: FAIL — `Cannot find module ../module/data/items/spell.mjs`

- [ ] **Step 4: SpellDataModel 구현** — `module/data/items/spell.mjs`

```js
import { BaseItemModel } from "../base-item.mjs";
import { MAGICALOGIA } from "../../helpers/config.mjs";

const fields = foundry.data.fields;

/**
 * 장서(마법) Item 데이터 모델. 이름은 Item.name 사용.
 * 액터 시트 장서 탭은 목록·빠른 토글만, 본문 편집은 이 item sheet에서.
 */
export class SpellDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new fields.StringField({
        initial: "",
        blank: true,
        choices: ["", ...MAGICALOGIA.spellTypes],
      }),
      skill: new fields.StringField({ initial: "" }),
      target: new fields.StringField({ initial: "" }),
      cost: new fields.SchemaField({
        // ""(미선택)을 허용해야 하므로 blank:true.
        area: new fields.StringField({
          initial: "",
          blank: true,
          choices: MAGICALOGIA.COST_AREAS.map((a) => a.value),
        }),
        count: new fields.NumberField({ initial: 0, min: 0, integer: true }),
      }),
      charge: new fields.NumberField({ initial: 0, min: 0, max: 6, integer: true }),
      mod: new fields.NumberField({ initial: 0, integer: true }),
      active: new fields.BooleanField({ initial: false }),
      recite: new fields.BooleanField({ initial: false }),
      effect: new fields.StringField({ initial: "" }),
    };
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- spell-model`
Expected: PASS (6 tests)

- [ ] **Step 6: 커밋**

```bash
git add module/helpers/config.mjs module/data/items/spell.mjs test/spell-model.test.mjs
git commit -m "feat: add SpellDataModel item type with structured cost"
```

---

## Task 2: AnchorDataModel

**Files:**

- Create: `module/data/items/anchor.mjs`
- Test: `test/anchor-model.test.mjs`

**Interfaces:**

- Produces: `AnchorDataModel.defineSchema()` → keys `description,fate,attr,encumbrance,scar`. `fate`=NumberField, `encumbrance`/`scar`=BooleanField.

- [ ] **Step 1: 실패 테스트 작성** — `test/anchor-model.test.mjs`

```js
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  class FakeField {
    constructor(opts = {}) {
      this.options = opts;
    }
  }
  globalThis.foundry = {
    data: {
      fields: {
        NumberField: FakeField,
        StringField: FakeField,
        BooleanField: FakeField,
        HTMLField: FakeField,
      },
    },
    abstract: {
      TypeDataModel: class {
        static migrateData(s) {
          return s;
        }
      },
    },
  };
});

describe("AnchorDataModel", () => {
  it("핵심 필드를 포함한다", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    const s = AnchorDataModel.defineSchema();
    for (const key of ["fate", "attr", "encumbrance", "scar"]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("base 스키마(description)를 상속한다 — 설정은 description 사용", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    expect(Object.keys(AnchorDataModel.defineSchema())).toContain("description");
  });
  it("별도 setting 필드는 두지 않는다", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    expect(Object.keys(AnchorDataModel.defineSchema())).not.toContain("setting");
  });
  it("fate는 운명점 — NumberField에 정수 기본 0", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    const s = AnchorDataModel.defineSchema();
    expect(s.fate).toBeInstanceOf(foundry.data.fields.NumberField);
    expect(s.fate.options.initial).toBe(0);
  });
  it("encumbrance/scar는 BooleanField 기본 false", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    const s = AnchorDataModel.defineSchema();
    expect(s.encumbrance.options.initial).toBe(false);
    expect(s.scar.options.initial).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- anchor-model`
Expected: FAIL — `Cannot find module ../module/data/items/anchor.mjs`

- [ ] **Step 3: AnchorDataModel 구현** — `module/data/items/anchor.mjs`

```js
import { BaseItemModel } from "../base-item.mjs";

const fields = foundry.data.fields;

/**
 * 관계(앵커) Item 데이터 모델. 이름은 Item.name, 설정은 상속 description 사용.
 * fate=운명점(숫자), encumbrance=중하(重荷), scar=스카(疵).
 */
export class AnchorDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      fate: new fields.NumberField({ initial: 0, integer: true }),
      attr: new fields.StringField({ initial: "" }),
      encumbrance: new fields.BooleanField({ initial: false }),
      scar: new fields.BooleanField({ initial: false }),
    };
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- anchor-model`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add module/data/items/anchor.mjs test/anchor-model.test.mjs
git commit -m "feat: add AnchorDataModel item type with scar/encumbrance"
```

---

## Task 3: Item 타입 등록 + 캐릭터 ArrayField 제거

**Files:**

- Modify: `module/magicalogia.mjs`
- Modify: `module/data/actors/character.mjs`
- Test: `test/character-model.test.mjs:40-117`

**Interfaces:**

- Consumes: `SpellDataModel`(Task 1), `AnchorDataModel`(Task 2).
- Produces: `CONFIG.Item.dataModels` = `{generic, spell, anchor}`. `CharacterDataModel`에 `spells`/`anchors` 없음.

- [ ] **Step 1: 캐릭터 테스트에서 spells/anchors 단언 정리** — `test/character-model.test.mjs`

(1) 첫 테스트 키 배열에서 `"spells"`, `"anchors"` 제거:

```js
for (const key of ["skills", "domain", "horizontalWrap", "soulSkill", "abilities", "statuses"]) {
  expect(Object.keys(s)).toContain(key);
}
```

(2) 다음 두 테스트 블록을 **삭제**:

```js
it("spells 항목은 active boolean 필드를 가진다", async () => { ... });
it("anchors 항목은 setting 필드를 가진다", async () => { ... });
```

(3) 회귀 가드 테스트 1개 **추가**(파일 끝 `})` 직전):

```js
it("spells/anchors는 더 이상 액터 스키마에 없다(Item으로 이관)", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  const keys = Object.keys(CharacterDataModel.defineSchema());
  expect(keys).not.toContain("spells");
  expect(keys).not.toContain("anchors");
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- character-model`
Expected: FAIL — 새 가드 테스트가 `spells`를 키에서 발견(아직 제거 전)

- [ ] **Step 3: 캐릭터 모델에서 ArrayField 제거** — `module/data/actors/character.mjs`

`// 장서(spell)` 주석부터 `anchors` ArrayField 닫는 `),`까지(현재 77–102행) **블록 전체 삭제**. `mission`/`collection`은 유지. 결과(해당 구역):

```js
      // 상태이상
      statuses: new fields.SchemaField(
        Object.fromEntries(
          ["seal", "burn", "weak", "plague", "block", "misfortune", "death", "vanish"].map((k) => [
            k,
            new fields.BooleanField({ initial: false }),
          ]),
        ),
      ),

      mission: new fields.StringField({ initial: "" }),
      collection: new fields.StringField({ initial: "" }),
    };
  }
```

- [ ] **Step 4: 캐릭터 테스트 통과 확인**

Run: `npm test -- character-model`
Expected: PASS

- [ ] **Step 5: Item dataModel 등록** — `module/magicalogia.mjs`

import 블록(`GenericItemDataModel` 줄 아래)에 추가:

```js
import { SpellDataModel } from "./data/items/spell.mjs";
import { AnchorDataModel } from "./data/items/anchor.mjs";
```

`CONFIG.Item.dataModels` 교체:

```js
CONFIG.Item.dataModels = {
  generic: GenericItemDataModel,
  spell: SpellDataModel,
  anchor: AnchorDataModel,
};
```

- [ ] **Step 6: system.json에 Item 타입 등록**

`system.json`의 `documentTypes.Item` 객체(현재 `{ "generic": {} }`)에 `spell`/`anchor` 추가:

```json
    "Item": {
      "generic": {},
      "spell": {},
      "anchor": {}
    }
```

Run: `grep -n -A4 '"Item"' system.json`
Expected: `generic`, `spell`, `anchor` 세 키 모두 존재.

- [ ] **Step 7: 전체 테스트 통과 확인**

Run: `npm test`
Expected: PASS (기존 38 + 신규 11 = 49개 내외, 모두 통과)

- [ ] **Step 8: 커밋**

```bash
git add module/magicalogia.mjs module/data/actors/character.mjs test/character-model.test.mjs system.json
git commit -m "feat: register spell/anchor item types, drop array fields from character"
```

---

## Task 4: Item 시트 (PARTS·context·템플릿·스타일)

**Files:**

- Modify: `module/sheets/item-sheet.mjs`
- Create: `templates/item/spell-sheet.hbs`, `templates/item/anchor-sheet.hbs`
- Modify: `module/helpers/templates.mjs`
- Create: `scss/component/_item-sheet.scss`
- Modify: `scss/magicalogia.scss`

**Interfaces:**

- Consumes: `MAGICALOGIA.spellTypes`, `MAGICALOGIA.COST_AREAS`, `MAGICALOGIA.anchorAttrs`, `MAGICALOGIA.themes`(없음 — 무시).
- Produces: item sheet가 `spell`/`anchor` 타입 렌더. context에 `spellTypes`/`costAreas`(spell), `anchorAttrs`(anchor) 노출.

- [ ] **Step 1: PARTS·context 분기 추가** — `module/sheets/item-sheet.mjs`

`PARTS` 교체:

```js
  static PARTS = {
    generic: {
      template: "systems/magicalogia/templates/item/generic-sheet.hbs",
    },
    spell: {
      template: "systems/magicalogia/templates/item/spell-sheet.hbs",
    },
    anchor: {
      template: "systems/magicalogia/templates/item/anchor-sheet.hbs",
    },
  };
```

`_prepareContext`의 `return context;` 직전에 추가:

```js
if (this.item.type === "spell") {
  context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
  context.costAreas = CONFIG.MAGICALOGIA.COST_AREAS;
} else if (this.item.type === "anchor") {
  context.anchorAttrs = CONFIG.MAGICALOGIA.anchorAttrs;
}
```

- [ ] **Step 2: spell 시트 템플릿** — `templates/item/spell-sheet.hbs`

```hbs
<div class="{{cssClass}}">
  <section class="sheet-body mg-item-form">
    <div class="mg-item-grid">
      <label class="mg-ifield"><span>타입</span>
        <select name="system.type">
          <option value="" {{selected (eq system.type "")}}>—</option>
          {{#each spellTypes}}<option value="{{this}}" {{selected (eq ../system.type this)}}>{{this}}</option>{{/each}}
        </select>
      </label>
      <label class="mg-ifield"><span>지정특기</span>
        <input type="text" name="system.skill" value="{{system.skill}}" />
      </label>
      <label class="mg-ifield"><span>목표</span>
        <input type="text" name="system.target" value="{{system.target}}" />
      </label>
      <div class="mg-ifield mg-ifield--cost"><span>코스트</span>
        <select name="system.cost.area">
          {{#each costAreas}}<option value="{{this.value}}" {{selected (eq ../system.cost.area this.value)}}>{{this.label}}</option>{{/each}}
        </select>
        <input type="number" name="system.cost.count" value="{{system.cost.count}}" min="0" />
      </div>
      <label class="mg-ifield"><span>충전</span>
        <input type="number" name="system.charge" value="{{system.charge}}" min="0" max="6" />
      </label>
      <label class="mg-ifield"><span>수정</span>
        <input type="number" name="system.mod" value="{{system.mod}}" />
      </label>
      <label class="mg-icheck"><input type="checkbox" name="system.active" {{checked system.active}} /><span>장비/유효</span></label>
      <label class="mg-icheck"><input type="checkbox" name="system.recite" {{checked system.recite}} /><span>주구</span></label>
      <label class="mg-ifield mg-ifield--wide"><span>효과</span>
        <input type="text" name="system.effect" value="{{system.effect}}" />
      </label>
    </div>
    <div class="description">
      <label>서술</label>
      {{editor enrichedDescription target="system.description" button=true editable=editable}}
    </div>
  </section>
</div>
```

- [ ] **Step 3: anchor 시트 템플릿** — `templates/item/anchor-sheet.hbs`

```hbs
<div class="{{cssClass}}">
  <section class="sheet-body mg-item-form">
    <div class="mg-item-grid">
      <label class="mg-ifield"><span>운명점</span>
        <input type="number" name="system.fate" value="{{system.fate}}" />
      </label>
      <label class="mg-ifield"><span>속성</span>
        <select name="system.attr">
          <option value="" {{selected (eq system.attr "")}}>—</option>
          {{#each anchorAttrs}}<option value="{{this}}" {{selected (eq ../system.attr this)}}>{{this}}</option>{{/each}}
        </select>
      </label>
      <label class="mg-icheck"><input type="checkbox" name="system.encumbrance" {{checked system.encumbrance}} /><span>중하(重荷)</span></label>
      <label class="mg-icheck"><input type="checkbox" name="system.scar" {{checked system.scar}} /><span>스카(疵)</span></label>
    </div>
    <div class="description">
      <label>설정</label>
      {{editor enrichedDescription target="system.description" button=true editable=editable}}
    </div>
  </section>
</div>
```

- [ ] **Step 4: 템플릿 프리로드 등록** — `module/helpers/templates.mjs`

`loadTemplates([...])` 배열의 `generic-sheet.hbs` 줄 아래에 추가:

```js
    "systems/magicalogia/templates/item/spell-sheet.hbs",
    "systems/magicalogia/templates/item/anchor-sheet.hbs",
```

- [ ] **Step 5: item 폼 스타일** — `scss/component/_item-sheet.scss`

```scss
// item 시트(spell/anchor) 폼 — 2열 그리드 + cost(영역 select + 개수).
.mg-item-form {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mg-item-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
}
.mg-ifield {
  display: flex;
  align-items: center;
  gap: 6px;

  > span {
    flex: 0 0 64px;
    font-size: 12px;
    opacity: 0.8;
  }
  input,
  select {
    flex: 1 1 auto;
    min-width: 0;
  }
  &--wide {
    grid-column: 1 / -1;
  }
  &--cost {
    select {
      flex: 0 0 84px;
    }
    input {
      flex: 0 0 56px;
    }
  }
}
.mg-icheck {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
```

- [ ] **Step 6: SCSS 엔트리에 등록** — `scss/magicalogia.scss`

`@use "component/grimoire";` 줄 아래에 추가:

```scss
@use "component/item-sheet";
```

- [ ] **Step 7: 빌드 검증**

Run: `npm run build`
Expected: 성공(`dist/magicalogia.css` 생성, SCSS 에러 없음). 테스트도 회귀 없음 확인: `npm test` → PASS.

- [ ] **Step 8: 커밋**

```bash
git add module/sheets/item-sheet.mjs templates/item/spell-sheet.hbs templates/item/anchor-sheet.hbs module/helpers/templates.mjs scss/component/_item-sheet.scss scss/magicalogia.scss
git commit -m "feat: add spell/anchor item sheets and styles"
```

---

## Task 5: 액터 시트 Item 통합 (context·액션·템플릿)

**Files:**

- Modify: `module/sheets/actor-sheet.mjs`
- Modify: `templates/actor/parts/grimoire.hbs`
- Modify: `templates/actor/parts/relations.hbs`

**Interfaces:**

- Consumes: `actor.itemTypes.spell`/`.anchor`, `MAGICALOGIA.COST_AREAS`.
- Produces: 액터 탭이 아이템 목록 렌더. 액션 `add-spell`/`add-anchor`(생성+sheet 오픈), `toggle-spell-flag`/`toggle-anchor`/`toggle-scar`/`set-charge`(item.update), 행 더블클릭(sheet 오픈), 우클릭 삭제(item.delete).

- [ ] **Step 1: actions 목록 교체** — `module/sheets/actor-sheet.mjs` `DEFAULT_OPTIONS.actions`

```js
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
```

- [ ] **Step 2: context를 아이템 기반으로 교체** — `_prepareContext`

기존 `// 장서 — …` 블록부터 `context.anchors = …` 줄까지(현재 89–101행)를 아래로 교체:

```js
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
```

- [ ] **Step 3: ArrayField 액션을 Item 액션으로 교체**

기존 `#onAddSpell`/`#onToggleSpellFlag`/`#onSetCharge`/`#onAddAnchor`/`#onToggleAnchor` 다섯 메서드(현재 139–191행)를 아래로 교체:

```js
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
```

- [ ] **Step 4: `_onRender` 컨텍스트 메뉴/더블클릭 교체**

기존 `_onRender`와 `#deleteSpell`/`#deleteAnchor`(현재 220–263행)를 아래로 교체:

```js
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
```

- [ ] **Step 5: grimoire 템플릿 교체** — `templates/actor/parts/grimoire.hbs`

```hbs
<div class="mg-table mg-table--grimoire mg-grimoire">
  <div class="mg-table__head">
    <span>□</span><span class="col-name">마법 이름</span><span>타입</span><span>지정특기</span>
    <span>코스트</span><span>충전</span><span>주구</span>
  </div>
  {{#each spells}}
  <div>
    <div class="mg-table__row" data-item-id="{{this.id}}">
      <span class="col-check">
        <span class="mg-check {{#if this.system.active}}is-on{{/if}}" data-action="toggle-spell-flag" data-flag="active" data-item-id="{{this.id}}">{{#if this.system.active}}✓{{/if}}</span>
      </span>
      <span class="col-name {{#unless this.name}}col-empty{{/unless}}">{{#if this.name}}{{this.name}}{{else}}—{{/if}}</span>
      <span class="col-faint">{{this.system.type}}</span>
      <span>{{this.system.skill}}</span>
      <span>{{this.costLabel}}</span>
      <span>
        <span class="mg-rings">
          {{#each this.rings}}
          <span class="mg-ring {{#if this.on}}is-on{{/if}}" data-action="set-charge" data-item-id="{{../id}}" data-ring="{{this.n}}"></span>
          {{/each}}
        </span>
      </span>
      <span class="col-check">
        <span class="mg-check {{#if this.system.recite}}is-on{{/if}}" data-action="toggle-spell-flag" data-flag="recite" data-item-id="{{this.id}}">{{#if this.system.recite}}✓{{/if}}</span>
      </span>
    </div>
    <div class="mg-table__note">{{#if this.system.effect}}{{this.system.effect}}{{else}}—{{/if}}</div>
  </div>
  {{/each}}
  <div class="mg-table__add" data-action="add-spell">＋</div>
</div>
```

- [ ] **Step 6: relations 템플릿 교체** — `templates/actor/parts/relations.hbs`

```hbs
<div class="mg-table mg-table--relations mg-relations">
  <div class="mg-table__head">
    <span>□</span><span class="col-name">앵커 이름</span><span>운명점</span><span>속성</span><span>疵</span>
  </div>
  {{#each anchors}}
  <div class="mg-table__row" data-item-id="{{this.id}}">
    <span class="col-check">
      <span class="mg-check {{#if this.system.encumbrance}}is-on{{/if}}" data-action="toggle-anchor" data-item-id="{{this.id}}">{{#if this.system.encumbrance}}✓{{/if}}</span>
    </span>
    <span class="col-name {{#unless this.name}}col-empty{{/unless}}">{{#if this.name}}{{this.name}}{{else}}—{{/if}}</span>
    <span>{{this.system.fate}}</span>
    <span>{{this.system.attr}}</span>
    <span class="col-check">
      <span class="mg-check {{#if this.system.scar}}is-on{{/if}}" data-action="toggle-scar" data-item-id="{{this.id}}">{{#if this.system.scar}}✓{{/if}}</span>
    </span>
  </div>
  {{/each}}
  <div class="mg-table__add" data-action="add-anchor">＋</div>
</div>

<label class="mg-field mg-field--wide">
  <span class="mg-field__mark">❖</span>
  <span class="mg-field__label">의무</span>
  <input class="mg-field__value" type="text" name="system.mission" value="{{system.mission}}" placeholder="—" />
</label>
```

- [ ] **Step 7: 빌드·테스트 검증**

Run: `npm run build && npm test`
Expected: 빌드 성공, 전체 테스트 PASS(시트 자체는 무테스트 — 회귀만 확인).

- [ ] **Step 8: 커밋**

```bash
git add module/sheets/actor-sheet.mjs templates/actor/parts/grimoire.hbs templates/actor/parts/relations.hbs
git commit -m "feat: render grimoire/relations from embedded items"
```

---

## Task 6: 마무리 — 수동 검증·메모리 갱신

**Files:**

- Modify: `C:\Users\jbg\.claude\projects\C--Users-jbg-WebstormProjects-magicalogia-FVTT\memory\grimoire-item-migration.md`
- Modify: `C:\Users\jbg\.claude\projects\C--Users-jbg-WebstormProjects-magicalogia-FVTT\memory\next-work-order.md`

- [ ] **Step 1: 전체 회귀 확인**

Run: `npm test && npm run build`
Expected: 전 테스트 PASS, 빌드 성공.

- [ ] **Step 2: Foundry 수동 검증 체크리스트(사용자 진행)**

다음을 사용자에게 안내(자동화 불가):

1. 캐릭터 액터 열기 → 장서 탭 ＋ → spell 아이템 생성·시트 오픈 확인.
2. item sheet에서 타입/지정특기/코스트(영역+개수)/충전 입력 → 액터 탭 행에 반영(코스트 라벨, 충전 링) 확인.
3. 행의 active/주구 토글, 충전 링 클릭 증감, 우클릭 삭제 확인.
4. 관계 탭 ＋ → anchor 생성, 중하·疵 토글, 운명점/속성 반영 확인.
5. 행 더블클릭 → 해당 item sheet 재오픈 확인.

- [ ] **Step 3: 메모리 `grimoire-item-migration` 갱신**

본문을 "전환 완료" 상태로 갱신: ArrayField→Item(`spell`/`anchor`) 전환 완료, A안(목록+item sheet), 마이그레이션 생략, 드래그앤드롭/컴펜디움/ActiveEffect는 후속. `description`는 본문(앵커 설정 포함). [[next-work-order]] 링크 유지.

- [ ] **Step 4: 메모리 `next-work-order` 갱신**

"다음 작업: 장서/관계 Item화"를 완료로 옮기고, 다음 후보(드래그앤드롭·컴펜디움 마법 라이브러리, 마법 발동 채팅카드/마소 자동차감, 디자인 재확정 후 ③④)를 기록.

- [ ] **Step 5: 핸드오프/정리**

`docs/feature` 미커밋 처리 여부는 사용자에게 확인(룰 참조 문서로 커밋 vs 보류). 커밋은 사용자 지시 시에만.

---

## Self-Review 메모

- **Spec 커버리지**: §①(Task 3·4) §②(Task 1·2) §③(Task 3) §④(Task 5) §⑤(Task 4) §⑥(Task 1·2·3) 모두 태스크에 매핑됨. 룰 교정표(cost/fate/scar) → Task 1·2 반영.
- **타입 일관성**: 액션 키(`toggle-scar` 등)·필드명(`encumbrance`/`scar`/`cost.area`/`cost.count`)·메서드명(`#onToggleScar`)이 템플릿·시트·모델 간 일치.
- **마이그레이션 없음** 결정에 따라 마이그레이션 태스크 없음(의도).
- **system.json** Item 타입 등록은 Task 3 Step 6에서 확인(누락 시 추가).
