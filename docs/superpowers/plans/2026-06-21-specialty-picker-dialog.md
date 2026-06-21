# 지정특기 특기표 picker 다이얼로그 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 장서 시트 지정특기 옆 「표에서 선택」 버튼으로 6×11 마법표 그리드 다이얼로그(`SpecialtyPickerApp`)를 띄워 셀 클릭으로 `system.skill`을 선택하고, 긴 datalist를 폐기한다.

**Architecture:** 차트를 행 우선으로 전치하는 순수 헬퍼 `specialtyGrid()`(테스트)를 만들고, 소형 ApplicationV2 `SpecialtyPickerApp`이 그 그리드를 렌더한다. 셀 클릭 시 `onPick(name)` 콜백으로 `item.update({"system.skill": name})`. 자유텍스트 input은 유지(커스텀 특기 → 하이브리드 TN 폴백). 데이터 모델 변경 없음.

**Tech Stack:** Foundry VTT V13 ApplicationV2(`foundry.applications.api.ApplicationV2` + `HandlebarsApplicationMixin`), Handlebars, SCSS(sass), Vite, Vitest.

## Global Constraints

- **데이터 모델 변경 없음**: picker는 기존 `system.skill`(자유 StringField)을 set. 하이브리드 TN(`resolveSpecialtyTn`)·`tn` 폴백 불변.
- **새 `--mg-*` 토큰 없음**: picker/버튼은 기존 마법표 토큰만 사용(다크/라이트 자동).
- **테마**: picker 루트 `class="magicalogia"`(DEFAULT_OPTIONS.classes) + `applyTheme(this.element)`(\_onRender).
- **템플릿 경로는 따옴표 전체 경로**; 신규 템플릿은 `loadTemplates` 프리로드 등록.
- **커밋 메시지**: 영어 한 줄 conventional, co-author 없음. lint-staged(prettier/eslint)가 커밋 시 자동 정렬(정상).
- **검증**: `npm run build`(SCSS 컴파일 + 번들) + `npm test`(현재 70 + 신규).
- `eq` Handlebars 헬퍼는 이미 전역 등록됨.

---

### Task 1: `specialtyGrid()` 전치 헬퍼

**Files:**

- Modify: `module/system/specialty-table.mjs` (헬퍼 추가)
- Test: `test/specialty-table.test.mjs` (describe 블록 추가)

**Interfaces:**

- Produces: `specialtyGrid() → Array<{num:number, cells:Array<{col:string, name:string}>}>` (11행 × 6셀, 행 우선). Task 2(picker 앱)가 사용.

- [ ] **Step 1: 실패 테스트 작성**

`test/specialty-table.test.mjs`의 `specialty-table.mjs` import에 `specialtyGrid`를 추가한다(기존 import 목록에 이름 하나 추가). 그리고 파일 끝에 describe 블록 추가:

```js
describe("specialtyGrid 전치", () => {
  it("11행 × 각 6셀, 출목 라벨 2..12", () => {
    const g = specialtyGrid();
    expect(g).toHaveLength(11);
    expect(g[0].num).toBe(2);
    expect(g[10].num).toBe(12);
    for (const row of g) expect(row.cells).toHaveLength(6);
  });
  it("셀 위치가 차트와 일치 (이야기=row0 song, 죽음=row10 dark)", () => {
    const g = specialtyGrid();
    expect(g[0].cells[3]).toEqual({ col: "song", name: "이야기" });
    expect(g[10].cells[5]).toEqual({ col: "dark", name: "죽음" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/specialty-table.test.mjs`
Expected: FAIL — `specialtyGrid is not a function` (미export).

- [ ] **Step 3: 헬퍼 구현**

`module/system/specialty-table.mjs`의 `SPECIALTY_NAMES` export 줄 다음(파일 끝)에 추가:

```js
/** picker용: 열 우선 chart를 11행×6열(행 우선)로 전치. */
export function specialtyGrid() {
  return MAGICALOGIA.rows.map((num, i) => ({
    num,
    cells: MAGICALOGIA.attributes.map((a) => ({ col: a.key, name: MAGICALOGIA.chart[a.key][i] })),
  }));
}
```

(`MAGICALOGIA`는 이 파일 상단에서 이미 import됨.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/specialty-table.test.mjs`
Expected: PASS (기존 + 신규 2개).

- [ ] **Step 5: 전체 테스트**

Run: `npm test`
Expected: 72 PASS (70 + 2).

- [ ] **Step 6: 커밋**

```bash
git add module/system/specialty-table.mjs test/specialty-table.test.mjs
git commit -m "feat: add specialtyGrid helper for picker"
```

---

### Task 2: `SpecialtyPickerApp` + 템플릿 + 스타일 + 프리로드

**Files:**

- Create: `module/apps/specialty-picker.mjs`
- Create: `templates/apps/specialty-picker.hbs`
- Create: `scss/component/_specialty-picker.scss`
- Modify: `scss/magicalogia.scss` (`@use` 추가)
- Modify: `module/helpers/templates.mjs` (프리로드 등록)

**Interfaces:**

- Consumes: `specialtyGrid()`(Task 1) from `specialty-table.mjs`; `applyTheme` from `helpers/theme.mjs`.
- Produces: `class SpecialtyPickerApp` with constructor option `{ current:string, onPick:(name:string)=>void }`; `new SpecialtyPickerApp({current, onPick}).render(true)` opens it. Task 3이 사용. 셀에 `class="mg-pick-btn"`(시트 버튼)·`.mg-picker__cell` 스타일 제공.

- [ ] **Step 1: Picker 앱 생성**

`module/apps/specialty-picker.mjs` 전체:

```js
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
```

- [ ] **Step 2: Picker 템플릿 생성**

`templates/apps/specialty-picker.hbs` 전체:

```hbs
<div class="mg-picker">
  <div class="mg-picker__row mg-picker__row--head">
    <span class="mg-picker__num"></span>
    {{#each columns}}<span class="mg-picker__col">{{this.title}}</span>{{/each}}
  </div>
  {{#each rows}}
  <div class="mg-picker__row">
    <span class="mg-picker__num">{{this.num}}</span>
    {{#each this.cells}}
    <button type="button" class="mg-picker__cell{{#if (eq this.name ../../current)}} is-selected{{/if}}" data-action="pick" data-skill="{{this.name}}">{{this.name}}</button>
    {{/each}}
  </div>
  {{/each}}
</div>
```

- [ ] **Step 3: Picker SCSS 생성**

`scss/component/_specialty-picker.scss` 전체:

```scss
@use "../theme/vars" as *;

.magicalogia .mg-picker {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  background: var(--mg-paper);

  &__row {
    display: grid;
    grid-template-columns: 28px repeat(6, 1fr);
    gap: 2px;
  }
  &__col {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    background: var(--mg-head-bg);
    color: var(--mg-head-ink);
    font-size: 12px;
    font-weight: 800;
    border-radius: 2px;
  }
  &__num {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--mg-soft);
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  &__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 3px 6px;
    background: var(--mg-field);
    color: var(--mg-ink);
    border: 1px solid var(--mg-line);
    border-radius: 2px;
    font-size: 11.5px;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background 0.1s,
      border-color 0.1s;

    &:hover {
      background: var(--mg-hi);
      border-color: var(--mg-gold);
    }
    &.is-selected {
      background: var(--mg-hi);
      border-color: var(--mg-gold);
      color: var(--mg-gold);
      font-weight: 800;
      box-shadow: inset 0 0 0 1px var(--mg-gold);
    }
  }
}

// 장서 시트 「표에서 선택」 버튼
.magicalogia .mg-pick-btn {
  flex: none;
  margin-left: 4px;
  padding: 0 7px;
  background: var(--mg-panel-2);
  color: var(--mg-gold);
  border: 1px solid var(--mg-gold);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.7;

  &:hover {
    background: var(--mg-hi);
  }
}
```

- [ ] **Step 4: SCSS `@use` 등록**

`scss/magicalogia.scss`의 `@use "component/chat-card";` 줄 다음에 추가:

```scss
@use "component/chat-card";
@use "component/specialty-picker";
```

- [ ] **Step 5: 템플릿 프리로드 등록**

`module/helpers/templates.mjs`의 `loadTemplates` 배열에서 `chat/spell-card.hbs` 줄 다음에 추가:

```js
    "systems/magicalogia/templates/chat/spell-card.hbs",
    "systems/magicalogia/templates/apps/specialty-picker.hbs",
  ]);
```

(끝 두 줄은 위치 식별용 — `apps/specialty-picker.hbs` 한 줄만 신규.)

- [ ] **Step 6: 빌드·테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공(SCSS 컴파일 OK — `_specialty-picker.scss`의 모든 토큰은 기존 정의), 72 PASS. (이 시점엔 앱이 번들에 import되지 않아 vite가 앱 코드를 포함하지 않을 수 있음 — Task 3에서 import되면 검증됨. SCSS/테스트만 게이트.)

- [ ] **Step 7: 커밋**

```bash
git add module/apps/specialty-picker.mjs templates/apps/specialty-picker.hbs scss/component/_specialty-picker.scss scss/magicalogia.scss module/helpers/templates.mjs
git commit -m "feat: add specialty picker app and styles"
```

---

### Task 3: 장서 시트 배선 (버튼 + 액션, datalist 제거)

**Files:**

- Modify: `module/sheets/item-sheet.mjs` (import 교체 + pick-specialty 액션/핸들러 + specialtyNames 컨텍스트 제거)
- Modify: `templates/item/spell-sheet.hbs` (「표」 버튼 추가, `list` 속성 + datalist 제거)

**Interfaces:**

- Consumes: `SpecialtyPickerApp`(Task 2).

- [ ] **Step 1: item-sheet — import 교체**

`module/sheets/item-sheet.mjs` 상단. 현재:

```js
import { applyTheme } from "../helpers/theme.mjs";
import { SPECIALTY_NAMES } from "../system/specialty-table.mjs";
```

→ (datalist 폐기로 SPECIALTY_NAMES 불필요 → picker 앱 import로 교체)

```js
import { applyTheme } from "../helpers/theme.mjs";
import { SpecialtyPickerApp } from "../apps/specialty-picker.mjs";
```

- [ ] **Step 2: item-sheet — pick-specialty 액션 등록 + specialtyNames 제거**

`DEFAULT_OPTIONS.actions`를 교체. 현재:

```js
    actions: {
      "toggle-field": MagicalogiaItemSheet.#onToggleField,
    },
```

→

```js
    actions: {
      "toggle-field": MagicalogiaItemSheet.#onToggleField,
      "pick-specialty": MagicalogiaItemSheet.#onPickSpecialty,
    },
```

`_prepareContext`의 spell 분기에서 `specialtyNames` 줄 삭제. 현재:

```js
    if (this.item.type === "spell") {
      context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
      context.costAreas = CONFIG.MAGICALOGIA.COST_AREAS;
      context.specialtyNames = SPECIALTY_NAMES;
    } else if (this.item.type === "anchor") {
```

→

```js
    if (this.item.type === "spell") {
      context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
      context.costAreas = CONFIG.MAGICALOGIA.COST_AREAS;
    } else if (this.item.type === "anchor") {
```

- [ ] **Step 3: item-sheet — `#onPickSpecialty` 핸들러 추가**

`#onToggleField` 정적 메서드 다음(클래스 닫는 `}` 직전)에 추가:

```js
  /** 「표에서 선택」 → 특기표 picker 다이얼로그를 열고 선택 시 system.skill 갱신. */
  static async #onPickSpecialty() {
    new SpecialtyPickerApp({
      current: this.item.system.skill,
      onPick: (name) => this.item.update({ "system.skill": name }),
    }).render(true);
  }
```

- [ ] **Step 4: spell-sheet — 「표」 버튼 + datalist 제거**

`templates/item/spell-sheet.hbs`의 지정특기 필드. 현재:

```hbs
<div class="mg-ifield"><span class="mg-ifield__label">지정특기</span>
  <input
    class="mg-input"
    type="text"
    name="system.skill"
    value="{{system.skill}}"
    placeholder="—"
    list="mg-specialties"
  />
</div>
```

→ (`list` 제거, 버튼 추가)

```hbs
<div class="mg-ifield"><span class="mg-ifield__label">지정특기</span>
  <input
    class="mg-input"
    type="text"
    name="system.skill"
    value="{{system.skill}}"
    placeholder="—"
  />
  <button
    type="button"
    class="mg-pick-btn"
    data-action="pick-specialty"
    title="표에서 선택"
  >⊞</button>
</div>
```

그리고 effect textarea 다음의 datalist 줄을 **삭제**. 현재:

```hbs
<datalist id="mg-specialties">{{#each specialtyNames}}<option
      value="{{this}}"
    ></option>{{/each}}</datalist>
```

(이 한 줄 제거.)

- [ ] **Step 5: 빌드·테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공(이제 `item-sheet.mjs`가 `SpecialtyPickerApp`을 import → vite 번들이 앱 코드 포함 → 앱 구문/import 검증됨), 72 PASS. eslint가 미사용 import(SPECIALTY_NAMES 제거됨)나 미정의 참조 없음을 확인.

- [ ] **Step 6: 커밋**

```bash
git add module/sheets/item-sheet.mjs templates/item/spell-sheet.hbs
git commit -m "feat: open specialty picker from spell sheet"
```

---

## 최종 육안 검증 (F5, 전체 완료 후)

1. 장서 아이템 시트 열기 → 지정특기 칸 옆 **⊞ 버튼** 표시(자유 입력란도 그대로).
2. ⊞ 클릭 → **「지정특기 선택」 다이얼로그**: 상단 영역 헤더(별/짐승/힘/노래/꿈/어둠) + 좌측 출목(2~12) + 6×11 특기명 셀.
3. 현재 지정특기와 같은 셀은 **골드 강조**(is-selected).
4. 셀 클릭 → 다이얼로그 닫힘 + 지정특기 input에 해당 특기명 반영.
5. 자유 입력(차트에 없는 커스텀 특기 타이핑)도 여전히 가능.
6. `/config` 라이트 테마에서도 다이얼로그·버튼 정상(토큰 상속).
7. (연계 확인) 차트 특기 선택 후 그리모어 ✦ 시전 → 라이브 TN; 커스텀 입력 시 수동 목표값.

## Self-Review 결과(작성자 점검)

- **Spec 커버리지**: §4.1→T1(specialtyGrid), §4.2→T2(앱), §4.3→T2(템플릿), §4.4→T2(SCSS+@use), §4.5→T3(시트 배선·datalist 제거·specialtyNames 제거), §4.6→T2(프리로드). 누락 없음. §3 제약(모델/토큰 불변, 테마, 프리로드) 반영.
- **Placeholder 스캔**: 코드 블록 전부 실제 내용. "TBD/적절히" 없음.
- **타입/이름 일관성**: `specialtyGrid()`(→`{num,cells:[{col,name}]}`), `SpecialtyPickerApp({current,onPick})`, `data-action="pick"`/`pick-specialty`, 클래스 `.mg-picker`/`.mg-picker__cell`/`.mg-pick-btn`, 템플릿 경로가 Task 간 일치. `eq` 헬퍼 등록 확인. `SPECIALTY_NAMES`는 specialty-table에 존속(uniqueness 테스트 가드), item-sheet에서만 import 제거.
