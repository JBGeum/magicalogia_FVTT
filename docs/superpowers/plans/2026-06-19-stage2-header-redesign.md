# 스테이지 ② 헤더 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mg-headband`(초상화·식별그리드·statrail)를 새 시안(`docs/design/magilogi_2.html` 다크 프레임)에 맞춰 재구성한다 — 식별 필드 재배치(datalist/select/체크/강조), portcol 레이아웃, key/muted 강조 위계.

**Architecture:** Foundry ApplicationV2 시트(`submitOnChange`로 input/select 자동 저장). 마크업은 하이브리드 — 단순 텍스트 필드는 `mg-field.hbs` partial 재사용, 변형 큰 필드는 인라인. SCSS는 시안 다크 토큰 기준 값으로 기존 컴포넌트 옆에 추가. 진정한모습 체크만 클릭 액션(`toggleTrueForm`).

**Tech Stack:** Foundry VTT v13, Handlebars 템플릿, SCSS(`@use`), vitest(회귀용).

## Global Constraints

- 커밋 메시지: **영어 한 줄, co-author/trailer 없음**.
- 주석: **한국어**, 기존 코드 스타일.
- 입력 저장은 `submitOnChange`(폼 name 바인딩). 추가 액션은 `trueFormRevealed` 토글뿐.
- SCSS 값은 시안 `magilogi_2.html` 다크 기준. border-radius는 기존 변수 `$mg-radius-sm` 사용.
- ①에서 제거된 `genderAge` 템플릿 바인딩을 제거한다.
- 표현 계층 작업이라 신규 단위테스트는 없다. 각 태스크 검증 = `npm run build` 성공 + `npm test`(기존 38개) 회귀 없음. 최종 시각 확인은 Foundry 실렌더(사용자).
- 시안 미사용 클래스(`mg-statbar*`)는 만들지 않는다.
- `example.html` 동기화는 본 plan 범위 밖(magilogi_2.html이 이미 미러를 제공 — ④ 후 일괄).

## File Structure

- `templates/actor/parts/mg-field.hbs` — partial에 `fieldClass`/`valueClass` 선택 파라미터 추가.
- `templates/actor/character-sheet.hbs` — 식별그리드(34-48행) 및 헤드밴드/statrail(23-74행) 재구성.
- `module/sheets/actor-sheet.mjs` — `_prepareContext`에 옵션 전달, `toggleTrueForm` 액션.
- `scss/component/_components.scss` — `mg-field--lg/--box`, `mg-ident-select`, stat/gauge/counter modifier.
- `scss/sheet/_layout.scss` — `mg-headband`/`mg-identity-grid`/`mg-statrail` 값, `mg-portcol`.

---

## Task 1: mg-field.hbs partial에 class 파라미터 추가

**Files:**

- Modify: `templates/actor/parts/mg-field.hbs`

**Interfaces:**

- Produces: partial이 선택적 `fieldClass`(label 요소 class), `valueClass`(input 요소 class)를 받는다. 미전달 시 기존과 동일 렌더(공백만 삽입).

- [ ] **Step 1: partial 교체**

`templates/actor/parts/mg-field.hbs` 전체를 아래로 교체:

```hbs
{{!-- 라벨+밑줄 값 필드. usage: {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="마법명" name="system.magicName" value=system.magicName}}
      선택: fieldClass(label에 추가 class), valueClass(input에 추가 class) --}}
<label class="mg-field {{fieldClass}}">
  <span class="mg-field__mark">❖</span>
  <span class="mg-field__label">{{label}}</span>
  <input
    class="mg-field__value {{valueClass}} {{#unless value}}mg-field__value--empty{{/unless}}"
    type="text"
    name="{{name}}"
    value="{{value}}"
    placeholder="—"
  />
</label>
```

- [ ] **Step 2: 빌드 + 회귀 확인**

Run: `npm run build && npm test`
Expected: 빌드 성공, 38 tests passing(기존 호출부 무영향 — fieldClass/valueClass 미전달 시 공백만 추가).

- [ ] **Step 3: 커밋**

```bash
git add templates/actor/parts/mg-field.hbs
git commit -m "feat: add fieldClass/valueClass params to mg-field partial"
```

---

## Task 2: 식별그리드 재구성 (마크업 + 컨텍스트 + 액션 + SCSS)

**Files:**

- Modify: `templates/actor/character-sheet.hbs` (식별그리드 34-48행)
- Modify: `module/sheets/actor-sheet.mjs` (`_prepareContext`; `actions`; 새 메서드)
- Modify: `scss/component/_components.scss` (mg-field 영역, mg-ident-select)
- Modify: `scss/sheet/_layout.scss` (mg-identity-grid 값)

**Interfaces:**

- Consumes: `mg-field.hbs`의 `fieldClass`/`valueClass`(Task 1); `MAGICALOGIA.CAREER_OPTIONS`/`ORG_OPTIONS`/`EFFECT_TYPES`(스테이지 ①).
- Produces: `context.careerOptions: string[]`, `context.orgOptions: string[]`, `context.effectTypes: {value,selected}[]`; 액션 `toggleTrueForm`.

- [ ] **Step 1: \_prepareContext에 옵션 전달**

`module/sheets/actor-sheet.mjs`의 `_prepareContext`에서 `context.statuses = ...` 블록 바로 뒤(78행 다음)에 추가:

```js
// 식별그리드 입력 옵션(datalist 추천목록 + 효과종류 select).
context.careerOptions = CONFIG.MAGICALOGIA.CAREER_OPTIONS;
context.orgOptions = CONFIG.MAGICALOGIA.ORG_OPTIONS;
context.effectTypes = CONFIG.MAGICALOGIA.EFFECT_TYPES.map((t) => ({
  value: t,
  selected: t === sys.effectType,
}));
```

- [ ] **Step 2: toggleTrueForm 액션 등록 + 메서드 추가**

`actions` 객체에 한 줄 추가(`toggleStatus` 줄 아래, 24행 근처):

```js
      toggleTrueForm: MagicalogiaActorSheet.#onToggleTrueForm,
```

`#onToggleStatus` 메서드 바로 뒤(202행 근처)에 추가:

```js
  /** 진정한 모습 공개 여부(trueFormRevealed) 토글. */
  static async #onToggleTrueForm() {
    await this.actor.update({
      "system.trueFormRevealed": !this.actor.system.trueFormRevealed,
    });
  }
```

- [ ] **Step 3: 식별그리드 마크업 교체**

`templates/actor/character-sheet.hbs`의 `<div class="mg-identity-grid"> … </div>`(34-48행) 전체를 아래로 교체. `player`/`socialStatus`/`genderAge`/기존 효과 인라인을 제거하고 시안 순서로 재구성:

```hbs
          <div class="mg-identity-grid">
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="임시 이름" name="system.tempName" value=system.tempName fieldClass="mg-field--wide mg-field--lg"}}
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="마법명" name="system.magicName" value=system.magicName fieldClass="mg-field--wide mg-field--lg"}}

            <label class="mg-field">
              <span class="mg-field__mark">❖</span>
              <span class="mg-field__label">경력</span>
              <input class="mg-field__value {{#unless system.career}}mg-field__value--empty{{/unless}}" type="text" name="system.career" value="{{system.career}}" list="mg-career-list" placeholder="—" />
              <datalist id="mg-career-list">{{#each careerOptions}}<option value="{{this}}"></option>{{/each}}</datalist>
            </label>

            <label class="mg-field">
              <span class="mg-field__mark">❖</span>
              <span class="mg-field__label">기관</span>
              <input class="mg-field__value {{#unless system.organization}}mg-field__value--empty{{/unless}}" type="text" name="system.organization" value="{{system.organization}}" list="mg-org-list" placeholder="—" />
              <datalist id="mg-org-list">{{#each orgOptions}}<option value="{{this}}"></option>{{/each}}</datalist>
            </label>

            <label class="mg-field mg-field--wide">
              <span class="mg-field__mark">❖</span>
              <span class="mg-check {{#if system.trueFormRevealed}}is-on{{/if}}" data-action="toggleTrueForm">{{#if system.trueFormRevealed}}✓{{/if}}</span>
              <span class="mg-field__label">진정한 모습</span>
              <input class="mg-field__value {{#unless system.trueForm}}mg-field__value--empty{{/unless}}" type="text" name="system.trueForm" value="{{system.trueForm}}" placeholder="—" />
            </label>

            <label class="mg-field mg-field--wide mg-field--box">
              <span class="mg-field__mark">❖</span>
              <span class="mg-field__label">효과</span>
              <input class="mg-field__value {{#unless system.effect}}mg-field__value--empty{{/unless}}" type="text" name="system.effect" value="{{system.effect}}" placeholder="—" />
              <select class="mg-ident-select mg-ident-select--wide" name="system.effectType">
                {{#each effectTypes}}<option value="{{value}}" {{#if selected}}selected{{/if}}>{{value}}</option>{{/each}}
              </select>
            </label>

            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="혼의 특기" name="system.soulSkill" value=system.soulSkill fieldClass="mg-field--wide" valueClass="mg-field__value--accent"}}
          </div>
```

- [ ] **Step 4: SCSS — mg-field 변형 + mg-ident-select**

`scss/component/_components.scss`의 `.mg-field` 블록 마지막 `}`(현재 52행, `&__value--strong` 닫힘 직후 `.mg-field` 닫는 중괄호) **앞**에 변형 추가. 즉 `.mg-field { … }` 내부 끝에:

```scss
// 강조 텍스트 필드(임시이름/마법명).
&--lg .mg-field__label {
  font-size: 13.5px;
}
&--lg .mg-field__value {
  font-size: 15px;
}
// 효과: 값 위에 종류 select가 붙는 박스형(상단 정렬·줄바꿈 허용).
&--box {
  align-items: flex-start;
}
&--box .mg-field__value {
  white-space: normal;
  min-height: 36px;
  line-height: 1.4;
}
```

그리고 `.mg-field { … }` 블록 **뒤**(닫는 `}` 다음)에 식별 select 컴포넌트 추가:

```scss
// 식별그리드 드롭다운(경력/기관/효과종류).
.mg-ident-select {
  margin-left: auto;
  padding: 2px 6px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--mg-gold);
  background: var(--mg-field);
  border: 1px solid var(--mg-line);
  border-radius: $mg-radius-sm;
  cursor: pointer;

  &--wide {
    min-width: 4em;
    text-align: center;
  }
  option {
    color: var(--mg-ink);
    background: var(--mg-panel);
    font-weight: 400;
  }
}
```

- [ ] **Step 5: SCSS — identity-grid 값 + 효과 정렬 규칙 갱신**

`scss/sheet/_layout.scss`의 `.mg-identity-grid { … }`(17-29행)를 아래로 교체(시안 gap, 기존 `--effect` 규칙 제거 — 효과는 이제 `--box`):

```scss
.mg-identity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px 12px;
  align-content: start;

  // 2열 그리드에서 전체폭을 차지하는 행(진정한모습/효과/혼의특기 등).
  .mg-field--wide {
    grid-column: 1 / -1;
  }
}
```

- [ ] **Step 6: 빌드 + 회귀 확인**

Run: `npm run build && npm test`
Expected: 빌드 성공, 38 tests passing.

- [ ] **Step 7: 커밋**

```bash
git add templates/actor/character-sheet.hbs module/sheets/actor-sheet.mjs scss/component/_components.scss scss/sheet/_layout.scss
git commit -m "feat: rebuild identity grid with datalist, effect select and true-form toggle"
```

---

## Task 3: portcol 레이아웃 + statrail 강조 위계

**Files:**

- Modify: `templates/actor/character-sheet.hbs` (헤드밴드 23-74행)
- Modify: `scss/component/_components.scss` (stat/gauge/counter modifier)
- Modify: `scss/sheet/_layout.scss` (mg-headband, mg-portcol, mg-statrail)

**Interfaces:**

- Consumes: 없음(표현 계층).
- Produces: `mg-portcol` 래퍼, stat/gauge/counter의 `--key`/`--muted` modifier.

- [ ] **Step 1: 헤드밴드 마크업 재구성**

`templates/actor/character-sheet.hbs`에서 `<div class="mg-headband">` 안의 초상화 블록과 statrail 블록을 재구성한다. 초상화를 `mg-portcol`로 감싸고 카운터행을 그 안으로 옮기며, statrail에 강조 클래스를 부여하고 순서를 바꾼다.

`<div class="mg-portrait" data-action="editImg"> … </div>`(24-32행)을 아래로 교체(초상화를 portcol로 감싸고 카운터행 포함):

```hbs
<div class="mg-portcol">
  <div class="mg-portrait" data-action="editImg">
    {{#if actor.img}}
      <img src="{{actor.img}}" alt="portrait" />
    {{else}}
      <span class="mg-corner mg-corner--tl"></span><span class="mg-corner mg-corner--tr"></span>
      <span class="mg-corner mg-corner--bl"></span><span class="mg-corner mg-corner--br"></span>
      <span class="mg-portrait__glyph">✶</span><span class="mg-portrait__hint">초상화</span>
    {{/if}}
  </div>
  <div class="mg-counter-row">
    <label class="mg-counter mg-counter--muted"><span class="mg-counter__label">공적점</span><input
        class="mg-counter__value"
        name="system.achievement"
        value="{{system.achievement}}"
      /></label>
    <label class="mg-counter mg-counter--muted"><span class="mg-counter__label">마화</span><input
        class="mg-counter__value"
        name="system.mabloom"
        value="{{system.mabloom}}"
      /></label>
  </div>
</div>
```

그리고 `<div class="mg-statrail"> … </div>`(50-73행) 전체를 아래로 교체(강조 클래스 + 순서: 능력치 → 마력 → 일시마력 → 계제, 카운터행은 portcol로 이동했으므로 제거):

```hbs
<div class="mg-statrail">
  <div class="mg-stat-row">
    <label class="mg-stat mg-stat--key"><span class="mg-stat__label">공격</span><input
        class="mg-stat__value"
        name="system.abilities.attack"
        value="{{system.abilities.attack}}"
      /></label>
    <label class="mg-stat mg-stat--key"><span class="mg-stat__label">방어</span><input
        class="mg-stat__value"
        name="system.abilities.defense"
        value="{{system.abilities.defense}}"
      /></label>
    <label class="mg-stat mg-stat--key"><span class="mg-stat__label">근원</span><input
        class="mg-stat__value"
        name="system.abilities.source"
        value="{{system.abilities.source}}"
      /></label>
  </div>
  <div class="mg-gauge mg-gauge--key">
    <span class="mg-gauge__icon">◈</span><span class="mg-gauge__label">마력</span>
    <input class="mg-gauge__value" name="system.mp.value" value="{{system.mp.value}}" />
    <span class="mg-gauge__sep">/</span>
    <input class="mg-gauge__max" name="system.mp.max" value="{{system.mp.max}}" />
  </div>
  <div class="mg-gauge mg-gauge--muted">
    <span class="mg-gauge__icon">◇</span><span class="mg-gauge__label">일시 마력</span>
    <input class="mg-gauge__value" name="system.tempMp" value="{{system.tempMp}}" />
  </div>
  <div class="mg-stat-row">
    <label class="mg-stat mg-stat--rank mg-stat--muted"><span
        class="mg-stat__label"
      >계제</span><input
        class="mg-stat__value"
        name="system.rank"
        value="{{system.rank}}"
      /></label>
  </div>
</div>
```

- [ ] **Step 2: SCSS — stat/gauge/counter modifier**

`scss/component/_components.scss`에서:

`.mg-stat { … }` 블록 내부, `&--rank .mg-stat__value { … }` 뒤에 추가:

```scss
// 강조(공격/방어/근원): 금테 + 큰 값.
&--key {
  border-color: var(--mg-gold);
}
&--key .mg-stat__label {
  color: var(--mg-bar-ink);
}
&--key .mg-stat__value {
  font-size: 22px;
}
// 약화(계제 등): 흐리게 + 작은 값.
&--muted {
  opacity: 0.7;
}
&--muted .mg-stat__value {
  font-size: 14px;
  color: var(--mg-soft);
}
```

`.mg-gauge { … }` 블록 내부, `&__max { … }` 뒤에 추가:

```scss
// 강조(마력): 금테 + 큰 값.
&--key {
  border-color: var(--mg-gold);
}
&--key .mg-gauge__icon,
&--key .mg-gauge__label {
  color: var(--mg-bar-ink);
}
&--key .mg-gauge__value,
&--key .mg-gauge__max {
  font-size: 21px;
}
// 약화(일시 마력).
&--muted {
  opacity: 0.7;
}
&--muted .mg-gauge__value {
  color: var(--mg-soft);
}
```

`.mg-counter { … }` 블록 내부, `&__value { … }` 뒤에 추가:

```scss
// 약화(공적점/마화).
&--muted {
  opacity: 0.7;
}
&--muted .mg-counter__value {
  color: var(--mg-soft);
}
```

- [ ] **Step 3: SCSS — headband/portcol/statrail 레이아웃**

`scss/sheet/_layout.scss`에서 `.mg-headband { … }`(10-15행)를 시안 컬럼 폭으로 교체:

```scss
.mg-headband {
  display: grid;
  grid-template-columns: 150px 1fr 170px;
  gap: 11px;
  align-items: stretch;
}

// 초상화 + 카운터행 묶음(좌측 컬럼).
.mg-portcol {
  display: flex;
  flex-direction: column;
  gap: 7px;

  .mg-portrait {
    aspect-ratio: 1 / 1;
    flex: none;
  }
  .mg-counter-row {
    flex: 1;
  }
  .mg-counter {
    justify-content: center;
  }
}
```

그리고 `.mg-statrail { … }`(31-35행)를 시안 값으로 교체(행들이 높이를 균등 분할):

```scss
.mg-statrail {
  display: flex;
  flex-direction: column;
  gap: 7px;

  > .mg-stat-row,
  > .mg-gauge {
    flex: 1;
  }
  .mg-stat {
    padding: 6px 0;
  }
  .mg-gauge {
    align-items: center;
  }
}
```

- [ ] **Step 4: 빌드 + 회귀 확인**

Run: `npm run build && npm test`
Expected: 빌드 성공, 38 tests passing.

- [ ] **Step 5: 커밋**

```bash
git add templates/actor/character-sheet.hbs scss/component/_components.scss scss/sheet/_layout.scss
git commit -m "feat: add portcol layout and key/muted stat hierarchy to header"
```

---

## Self-Review

- **Spec 커버리지**: 식별그리드 7필드 재배치(Task 2), datalist/effect select/진정한모습 체크(Task 2), 혼의특기 accent(Task 2), portcol+카운터 이동(Task 3), statrail key/muted+순서(Task 3), 신규 SCSS 전부(mg-field--lg/--box·mg-ident-select Task 2; mg-portcol·stat/gauge/counter modifier Task 3), `_prepareContext` 옵션 + toggleTrueForm(Task 2), genderAge 제거(Task 2 식별그리드 교체로 해당 줄 삭제), mg-field partial 확장(Task 1). example.html 동기화는 명시적으로 범위 밖.
- **Placeholder 스캔**: 없음. 모든 SCSS/마크업/JS 코드가 완전.
- **타입 일관성**: `context.effectTypes`는 `{value,selected}[]`로 정의(Task 2 Step1)하고 템플릿에서 `value`/`selected` 사용(Step3) — 일치. `careerOptions`/`orgOptions`는 문자열 배열, datalist `<option value>`로 사용 — 일치. `toggleTrueForm` 액션명이 등록(Step2)과 마크업 `data-action`(Step3)에서 동일.
