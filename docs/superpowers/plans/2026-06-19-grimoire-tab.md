# 장서(Grimoire) 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캐릭터 시트에 Foundry V2 네이티브 탭을 도입하고, 시안 기반 장서(spells) 탭을 추가·편집 가능하게 만든다.

**Architecture:** 단일 PART(`character`) 구조를 유지한 채 `static TABS`로 탭 그룹(`primary`: `main`/`grimoire`)을 정의한다. 한 템플릿 안에 nav와 두 개의 `data-tab` 섹션을 두고, mixin의 `tab` 액션이 전환을 처리한다. 장서 행 CRUD는 기존 `#onToggleSkill`의 배열 deepClone→`actor.update` 패턴을 그대로 따른다.

**Tech Stack:** Foundry VTT v13, ApplicationV2 + HandlebarsApplicationMixin, Handlebars, SCSS(vite), vitest.

## Global Constraints

- Foundry 호환: minimum/verified **13** (`system.json`). V2 API만 사용(`activateListeners` 없음 — 비클릭 리스너는 `_onRender`).
- 배열 필드 갱신은 폼 인덱스 바인딩 대신 **`foundry.utils.deepClone` → 전체 배열 `actor.update`** 패턴(기존 `#onToggleSkill` 참고).
- 커밋 메시지: 영어 한 줄, co-author 라인 없음.
- SCSS는 `.magicalogia` 스코프 유지. 신규 partial은 `scss/magicalogia.scss`에 `@use` 등록.
- UI(탭/렌더/인터랙션)는 vitest로 검증 불가 → 각 UI Task는 `npm run build` 성공 + **Foundry 수동 검증 체크포인트**로 마무리. 데이터 모델 변경만 vitest TDD 대상.
- 작업 시작 시 working tree에 미커밋 scss 변경 4개(스크롤 픽스 + gap)가 있을 수 있다. 각 Task는 **자기 파일만 `git add`** 하여 섞이지 않게 한다.

---

### Task 1: 데이터 모델 — `spells`에 `active` 필드 추가

**Files:**

- Modify: `module/data/actors/character.mjs:73-85`
- Test: `test/character-model.test.mjs`

**Interfaces:**

- Produces: `system.spells[i].active: boolean` (initial `false`) — 장서 행 첫 칸 체크가 사용.

- [ ] **Step 1: Write the failing test**

`test/character-model.test.mjs`의 `describe("CharacterDataModel", ...)` 블록 안에 추가:

```javascript
it("spells 항목은 active boolean 필드를 가진다", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  const s = CharacterDataModel.defineSchema();
  const spellSchema = s.spells.element.fields;
  expect(Object.keys(spellSchema)).toContain("active");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/character-model.test.mjs`
Expected: FAIL — `expected [ ...keys... ] to include 'active'` (active 미존재)

- [ ] **Step 3: Add the field**

`module/data/actors/character.mjs`의 `spells` SchemaField에 `active`를 추가(기존 `recite` 위, 의미상 첫 칸이므로 `name` 앞에 두어도 무방하나 diff 최소화를 위해 `recite` 앞에 삽입):

```javascript
      // 장서(spell)
      spells: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ initial: "" }),
          type: new fields.StringField({ initial: "" }),
          skill: new fields.StringField({ initial: "" }),
          target: new fields.StringField({ initial: "" }),
          cost: new fields.StringField({ initial: "" }),
          charge: new fields.NumberField({ initial: 0, integer: true }),
          mod: new fields.NumberField({ initial: 0, integer: true }),
          active: new fields.BooleanField({ initial: false }),
          recite: new fields.BooleanField({ initial: false }),
          effect: new fields.StringField({ initial: "" }),
        }),
      ),
```

(주석의 "필드만" 표현은 UI가 생기므로 `// 장서(spell)`로 갱신.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/character-model.test.mjs`
Expected: PASS (전체 케이스 통과)

- [ ] **Step 5: Run full suite (회귀 확인)**

Run: `npm test`
Expected: 전체 통과 (기존 29 + 신규 1 = 30)

- [ ] **Step 6: Commit**

```bash
git add module/data/actors/character.mjs test/character-model.test.mjs
git commit -m "feat: add active flag to spell schema"
```

---

### Task 2: V2 탭 전환 골격 (캐릭터/장서, 장서는 빈 placeholder)

**Files:**

- Modify: `module/sheets/actor-sheet.mjs:8-38`
- Modify: `templates/actor/character-sheet.hbs:12-22` (nav), `:20-122` (콘텐츠 래핑)
- Modify: `scss/sheet/_sheet.scss` (탭 표시/숨김)

**Interfaces:**

- Consumes: 없음.
- Produces: `context.tabs.{main,grimoire}` = `{ id, group:"primary", label, active:boolean }`. 템플릿이 `tabs.<id>.active`로 활성 클래스를 판단. `this.tabGroups.primary`가 현재 활성 탭 id.

- [ ] **Step 1: `static TABS` + 탭 컨텍스트 추가**

`module/sheets/actor-sheet.mjs`의 `static DEFAULT_OPTIONS` 다음(=PARTS 위)에 추가:

```javascript
  static TABS = {
    primary: {
      tabs: [
        { id: "main", label: "캐릭터 시트" },
        { id: "grimoire", label: "장서" },
      ],
      initial: "main",
    },
  };
```

`_prepareContext`의 `return context;` 직전에 추가:

```javascript
const activeTab = this.tabGroups.primary ?? "main";
context.tabs = {
  main: { id: "main", group: "primary", label: "캐릭터 시트", active: activeTab === "main" },
  grimoire: { id: "grimoire", group: "primary", label: "장서", active: activeTab === "grimoire" },
};
```

> 참고: v13에서 `static TABS` 정의 시 `tabGroups`가 `initial`로 자동 초기화되고 `data-action="tab"` 핸들러(`changeTab`)가 자동 등록된다. Step 4 검증에서 전환이 안 되면, `DEFAULT_OPTIONS.actions`에 다음을 추가한다:
>
> ```javascript
> tab: function (event, target) { this.changeTab(target.dataset.tab, target.dataset.group); },
> ```

- [ ] **Step 2: nav 탭에 액션 부여**

`templates/actor/character-sheet.hbs`의 `<nav class="mg-tabs">` 블록을 교체:

```hbs
    <nav class="mg-tabs">
      <a class="mg-tab {{#if tabs.main.active}}is-active{{/if}}" data-action="tab" data-group="primary" data-tab="main">캐릭터 시트</a>
      <a class="mg-tab {{#if tabs.grimoire.active}}is-active{{/if}}" data-action="tab" data-group="primary" data-tab="grimoire">장서</a>
      <a class="mg-tab is-disabled" title="준비 중">관계</a>
      <a class="mg-tab is-disabled" title="준비 중">개요·정보</a>
      <a class="mg-tab is-disabled" title="준비 중">속성·능력</a>
    </nav>
```

- [ ] **Step 3: 콘텐츠를 탭 섹션으로 분리**

`templates/actor/character-sheet.hbs`의 `<section class="mg-tab-content">` 내부를 다음 구조로 감싼다. 기존 `<div class="tab mg-main mg-panel-body" data-tab="main">…</div>` 를 그대로 두되 클래스/속성을 보강하고, 그 뒤에 빈 grimoire 섹션을 추가:

```hbs
    <section class="mg-tab-content">
      <div class="tab mg-main mg-panel-body {{#if tabs.main.active}}active{{/if}}" data-tab="main" data-group="primary">
        {{!-- 기존 main 탭 내용 그대로 유지 --}}
        ...
      </div>

      <div class="tab mg-panel-body {{#if tabs.grimoire.active}}active{{/if}}" data-tab="grimoire" data-group="primary">
        {{!-- Task 4에서 장서 테이블 partial 삽입 --}}
      </div>
    </section>
```

(`...` 자리는 기존 `mg-headband`/`mg-status`/`mg-shared` 마크업을 **변경 없이** 유지. 바깥 div의 클래스에 `{{#if tabs.main.active}}active{{/if}}`와 `data-group="primary"`만 추가.)

- [ ] **Step 4: 탭 표시/숨김 스타일**

`scss/sheet/_sheet.scss`의 `.magicalogia.sheet { … }` 안에 추가:

```scss
// 탭 패널 — active 한 탭만 표시(코어 규칙 보강).
.mg-tab-content > .tab {
  display: none;
}
.mg-tab-content > .tab.active {
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ built`, 에러 없음.

- [ ] **Step 6: Foundry 수동 검증 (체크포인트)**

Foundry에서 캐릭터 시트를 열고 확인:

1. 초기에 "캐릭터 시트" 탭이 활성(밑줄 골드)이고 기존 내용이 보인다.
2. "장서" 탭 클릭 → 캐릭터 내용이 숨고 빈 패널로 전환된다.
3. "캐릭터 시트" 재클릭 → 원래 내용 복귀.
4. 관계/개요·정보/속성·능력은 클릭해도 반응 없음(disabled).

전환이 안 되면 Step 1의 참고대로 `tab` 액션을 수동 등록하고 재빌드.

- [ ] **Step 7: Commit**

```bash
git add module/sheets/actor-sheet.mjs templates/actor/character-sheet.hbs scss/sheet/_sheet.scss
git commit -m "feat: add tab navigation to character sheet"
```

---

### Task 3: 장서 테이블 스타일 이식

**Files:**

- Create: `scss/component/_grimoire.scss`
- Modify: `scss/magicalogia.scss:6`

**Interfaces:**

- Produces: `.mg-table`, `.mg-table--grimoire`, 그리고 `.mg-table .mg-check` 클래스의 시각 스타일. Task 4 템플릿이 이 클래스들을 사용.

- [ ] **Step 1: 신규 SCSS partial 작성**

`scss/component/_grimoire.scss` 생성 (시안 `docs/design/styles/_components.scss`의 데이터 테이블 블록 이식, `.mg-check`는 `.mg-table` 내부로 스코프해 특기표용과 분리):

```scss
@use "../theme/vars" as *;

// 데이터 테이블 (장서 / 관계) — 출처: docs/design/styles/_components.scss
.magicalogia {
  .mg-table {
    border: 1px solid var(--mg-gold);
    border-radius: $mg-radius;
    overflow: hidden;

    &__head,
    &__row {
      display: grid;
      align-items: center;
    }
    &__head {
      background: var(--mg-bar);
      font-size: 10.5px;
      font-weight: 700;
      color: var(--mg-bar-ink);
    }
    &__head > * {
      padding: 6px 4px;
      text-align: center;
    }
    &__head > .col-name {
      text-align: left;
      padding-left: 8px;
    }
    &__row {
      background: var(--mg-panel);
      border-top: 1px solid var(--mg-line);
    }
    &__row > * {
      padding: 5px 4px;
      font-size: 11.5px;
      text-align: center;
      color: var(--mg-soft);
      border-left: 1px solid var(--mg-line);
    }
    &__row > .col-check {
      border-left: 0;
    }
    &__row .col-name {
      text-align: left;
      padding-left: 8px;
      color: var(--mg-field-ink);
      font-size: 12.5px;
    }
    &__row .col-empty {
      color: var(--mg-faint);
    }
    &__note {
      padding: 4px 10px 7px 32px;
      background: var(--mg-panel);
      border-top: 1px dotted var(--mg-line);
    }
    &__add {
      padding: 7px;
      text-align: center;
      font-size: 16px;
      color: var(--mg-gold);
      background: var(--mg-panel-2);
      border-top: 1px solid var(--mg-line);
      cursor: pointer;
    }

    // 행 입력칸은 셀 안에서 투명 배경으로 가득 채운다.
    input {
      width: 100%;
      background: transparent;
      border: 0;
      color: inherit;
      font: inherit;
      text-align: inherit;
    }
    &__note input {
      font-size: 11px;
      font-style: italic;
      color: var(--mg-faint);
    }

    // 커스텀 체크박스(시안 .mg-check) — 테이블 스코프
    .mg-check {
      width: 13px;
      height: 13px;
      flex: none;
      border-radius: $mg-radius-sm;
      border: 1px solid var(--mg-line);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      &.is-on {
        background: var(--mg-check);
        border-color: var(--mg-check);
        color: var(--mg-panel);
        font-size: 8px;
      }
    }
  }

  // 컬럼 템플릿
  .mg-table--grimoire .mg-table__head,
  .mg-table--grimoire .mg-table__row {
    grid-template-columns: 24px 2.4fr 1fr 1.1fr 0.9fr 0.8fr 0.7fr 0.8fr 24px;
  }
}
```

- [ ] **Step 2: 엔트리에 `@use` 등록**

`scss/magicalogia.scss`의 `@use "component/magic-chart";` 다음 줄에 추가:

```scss
@use "component/grimoire";
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built`. 그리고 규칙 반영 확인:
Run: `grep -o "mg-table--grimoire[^{]*{[^}]*}" dist/magicalogia.css | head -1`
Expected: grid-template-columns 규칙 출력.

- [ ] **Step 4: Commit**

```bash
git add scss/component/_grimoire.scss scss/magicalogia.scss
git commit -m "style: add grimoire table styles from design"
```

---

### Task 4: 장서 테이블 콘텐츠 렌더

**Files:**

- Create: `templates/actor/parts/grimoire.hbs`
- Modify: `templates/actor/character-sheet.hbs` (grimoire 섹션에 partial 삽입)

**Interfaces:**

- Consumes: `system.spells` 배열, Task 3 스타일.
- Produces: 각 행 `.mg-table__row[data-index]`, 체크 `[data-action="toggle-spell-flag"][data-flag][data-index]`, 추가 `[data-action="add-spell"]` — Task 5/6 액션이 사용.

- [ ] **Step 1: 장서 partial 작성**

`templates/actor/parts/grimoire.hbs` 생성:

```hbs
<div class="mg-table mg-table--grimoire mg-grimoire">
  <div class="mg-table__head">
    <span>□</span><span class="col-name">마법 이름</span><span>타입</span><span>지정특기</span>
    <span>목표</span><span>코스트</span><span>충전</span><span>수정치</span><span>낭독</span>
  </div>
  {{#each system.spells}}
  <div>
    <div class="mg-table__row" data-index="{{@index}}">
      <span class="col-check">
        <span class="mg-check {{#if this.active}}is-on{{/if}}" data-action="toggle-spell-flag" data-flag="active" data-index="{{@index}}">{{#if this.active}}✓{{/if}}</span>
      </span>
      <span class="col-name {{#unless this.name}}col-empty{{/unless}}"><input type="text" name="system.spells.{{@index}}.name" value="{{this.name}}" placeholder="—" /></span>
      <span><input type="text" name="system.spells.{{@index}}.type" value="{{this.type}}" /></span>
      <span><input type="text" name="system.spells.{{@index}}.skill" value="{{this.skill}}" /></span>
      <span><input type="text" name="system.spells.{{@index}}.target" value="{{this.target}}" /></span>
      <span><input type="text" name="system.spells.{{@index}}.cost" value="{{this.cost}}" /></span>
      <span><input type="text" name="system.spells.{{@index}}.charge" value="{{this.charge}}" /></span>
      <span><input type="text" name="system.spells.{{@index}}.mod" value="{{this.mod}}" /></span>
      <span class="col-check">
        <span class="mg-check {{#if this.recite}}is-on{{/if}}" data-action="toggle-spell-flag" data-flag="recite" data-index="{{@index}}">{{#if this.recite}}✓{{/if}}</span>
      </span>
    </div>
    <div class="mg-table__note">
      <input type="text" name="system.spells.{{@index}}.effect" value="{{this.effect}}" placeholder="마법 효과 · 주구 ……" />
    </div>
  </div>
  {{/each}}
  <div class="mg-table__add" data-action="add-spell">＋</div>
</div>
```

- [ ] **Step 2: 섹션에 partial 삽입**

`templates/actor/character-sheet.hbs`의 grimoire 섹션(Task 2 Step 3에서 만든 빈 div) 내부를 교체:

```hbs
      <div class="tab mg-panel-body {{#if tabs.grimoire.active}}active{{/if}}" data-tab="grimoire" data-group="primary">
        {{> "systems/magicalogia/templates/actor/parts/grimoire.hbs"}}
      </div>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Foundry 수동 검증 (체크포인트)**

장서 탭 전환 후 확인:

1. 헤더 9칸(□/마법 이름/타입/지정특기/목표/코스트/충전/수정치/낭독)이 정렬돼 보인다.
2. 기존 `spells` 데이터가 없으면 행은 없고 `＋`만 보인다(다음 Task에서 추가 동작).
3. 텍스트 칸에 값을 입력하면 저장된다(시트 닫았다 열어 유지 확인).

- [ ] **Step 5: Commit**

```bash
git add templates/actor/parts/grimoire.hbs templates/actor/character-sheet.hbs
git commit -m "feat: render grimoire spell table"
```

---

### Task 5: 행 추가 / 체크 토글 액션

**Files:**

- Modify: `module/sheets/actor-sheet.mjs` (actions 등록 + 핸들러 2개)

**Interfaces:**

- Consumes: Task 4의 `data-action`/`data-flag`/`data-index` 마크업, Task 1의 `active` 필드.
- Produces: 없음(터미널 동작).

- [ ] **Step 1: actions 등록**

`static DEFAULT_OPTIONS.actions` 객체에 추가:

```javascript
      "add-spell": MagicalogiaActorSheet.#onAddSpell,
      "toggle-spell-flag": MagicalogiaActorSheet.#onToggleSpellFlag,
```

- [ ] **Step 2: 핸들러 구현**

`#onToggleSkill` 정의 아래에 추가:

```javascript
  /** 장서 행 추가 — 빈 항목을 배열 끝에 push. */
  static async #onAddSpell() {
    const arr = foundry.utils.deepClone(this.actor.system.spells ?? []);
    arr.push({
      name: "", type: "", skill: "", target: "", cost: "",
      charge: 0, mod: 0, active: false, recite: false, effect: "",
    });
    await this.actor.update({ "system.spells": arr });
  }

  /** 장서 행의 active/recite boolean 토글. */
  static async #onToggleSpellFlag(_event, target) {
    const index = Number(target.dataset.index);
    const flag = target.dataset.flag; // "active" | "recite"
    const arr = foundry.utils.deepClone(this.actor.system.spells ?? []);
    if (!arr[index]) return;
    arr[index][flag] = !arr[index][flag];
    await this.actor.update({ "system.spells": arr });
  }
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Foundry 수동 검증 (체크포인트)**

1. `＋` 클릭 → 빈 행이 추가된다.
2. 첫 칸 □ 클릭 → 체크 토글(✓ 표시/해제), 시트 재오픈 후 유지.
3. 낭독 칸 클릭 → 동일하게 토글.
4. 텍스트/숫자 칸 입력값 유지.

- [ ] **Step 5: Commit**

```bash
git add module/sheets/actor-sheet.mjs
git commit -m "feat: add spell row add and check toggle actions"
```

---

### Task 6: 우클릭 행 삭제 (ContextMenu)

**Files:**

- Modify: `module/sheets/actor-sheet.mjs` (`_onRender` + 삭제 핸들러)

**Interfaces:**

- Consumes: Task 4의 `.mg-table__row[data-index]`.
- Produces: 없음.

- [ ] **Step 1: `_onRender`에서 ContextMenu 생성 + 삭제 핸들러**

클래스에 추가 (private 필드 + `_onRender` + 삭제 메서드):

```javascript
  /** 장서 행 우클릭 컨텍스트 메뉴(1회 생성, element에 위임). */
  _onRender(context, options) {
    super._onRender?.(context, options);
    new foundry.applications.ux.ContextMenu(
      this.element,
      ".mg-grimoire .mg-table__row",
      [
        {
          name: "삭제",
          icon: '<i class="fa-solid fa-trash"></i>',
          callback: (target) => this.#deleteSpell(Number(target.dataset.index)),
        },
      ],
      { jQuery: false },
    );
  }

  /** 장서 행 삭제 — 해당 index 제거 후 배열 갱신. */
  async #deleteSpell(index) {
    if (Number.isNaN(index)) return;
    const arr = foundry.utils.deepClone(this.actor.system.spells ?? []);
    arr.splice(index, 1);
    await this.actor.update({ "system.spells": arr });
  }
```

> 참고: v13 `ContextMenu` 생성자는 `(container, selector, menuItems, options)`. `jQuery:false`이면 `callback`은 우클릭된 DOM 요소(HTMLElement)를 받는다. Step 3 검증에서 메뉴가 안 뜨거나 `callback` 인자가 jQuery 객체면, `target`을 `target[0] ?? target`으로 정규화하고 `{ jQuery: false }` 전달 여부를 재확인한다.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Foundry 수동 검증 (체크포인트)**

1. 장서 행을 우클릭 → "삭제" 메뉴가 뜬다.
2. 삭제 클릭 → 해당 행만 제거되고 나머지 행/인덱스가 정상 유지된다.
3. 여러 행 중 가운데 행 삭제 시 아래 행들의 입력값이 올바르게 따라온다(인덱스 밀림 확인).

- [ ] **Step 4: Commit**

```bash
git add module/sheets/actor-sheet.mjs
git commit -m "feat: add right-click delete for spell rows"
```

---

## 완료 기준

- `npm test` 전체 통과(데이터 모델 신규 테스트 포함).
- `npm run build` 성공.
- Foundry에서: 캐릭터/장서 탭 전환, 장서 행 추가·편집·체크 토글·우클릭 삭제가 모두 동작.
- 관계/개요·정보/속성·능력 탭은 `is-disabled` 유지(범위 밖).
