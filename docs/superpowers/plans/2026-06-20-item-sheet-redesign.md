# 아이템 시트 재디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이템 시트(장서·앵커·일반)를 새 핸드오프(`06201857`)의 `.mg-item` 그리모어풍 디자인으로 재작성한다(타이틀바 + sigil + 정돈된 폼 + 골드 배너 + prose-mirror).

**Architecture:** 데이터 모델은 변경하지 않고(공통 결정) 시안 예시 경로를 현재 모델로 재바인딩한다. `_item-sheet.scss`를 새 `magicalogia-item.css`의 `.mg-item*` 규칙으로 전면 재작성(토큰 블록 제외 — 우리 `_tokens.scss` 재사용), `item-sheet.mjs`에 `.mg-check` 토글용 `toggle-field` 액션을 신설, 세 템플릿을 새 구조로 재작성한다. 리치 에디터는 이미 도입된 V13 `<prose-mirror>` element를 쓴다.

**Tech Stack:** Foundry VTT V13 ApplicationV2(`ItemSheetV2`), Handlebars, SCSS(Vite), vitest(`npm test`).

## Global Constraints

- 데이터 모델·마이그레이션 변경 금지. 시안 예시 경로 → 현재 모델 재바인딩.
- 데이터 매핑(시안 → 현재): `costType`+`cost`→`cost.area`+`cost.count`; `equip`/`juju`→`active`/`recite`; `junga`/`suka`→`encumbrance`/`scar`; 앵커 `setting`→`description`; 나머지(type/skill/target/charge/mod/effect/fate/attr/name/description) 동일.
- 토큰·`.theme-*` 블록 이식 금지(우리 `_tokens.scss` 재사용). 새 CSS에선 `.mg-item*` 컴포넌트 규칙만 이식.
- V1→V2: `<form>` 래퍼 → `<div class="{{cssClass}}">`; `data-toggle` → `data-action="toggle-field" data-field="…"`; `.mg-prose__box` → `<prose-mirror>` element.
- select는 기존 `{{#each}}` + `selected` helper 유지(시안 `selectOptions` 미사용).
- 시트 `classes`는 `["magicalogia","sheet","item"]` 유지.
- 커밋 메시지: 영어 한 줄, co-author 없음. lint-staged(prettier/eslint) 자동 정렬 정상.
- 검증: 시트 UI 단위테스트 인프라 없음 → 각 task의 test cycle은 `npm run build` 성공 + `npm test` 52개 무회귀 + 육안. 단위테스트 미추가가 플랜 제약(결함 아님).
- **중간 상태 주의**: Task 1(SCSS 재작성)으로 기존 `.mg-item-form` 등이 사라지므로 Task 3(템플릿 교체) 완료 전까지 아이템 시트가 무스타일로 보일 수 있다. 최종(Task 3) 후 정상 렌더. 이는 SCSS↔템플릿 결합 재디자인의 불가피한 중간 상태다.

---

## File Structure

- **Rewrite** `scss/component/_item-sheet.scss` — 새 `.mg-item*` 컴포넌트 스타일. (Task 1)
- **Modify** `module/sheets/item-sheet.mjs` — `DEFAULT_OPTIONS.actions`에 `toggle-field` + `#onToggleField` 핸들러. (Task 2)
- **Rewrite** `templates/item/spell-sheet.hbs` / `anchor-sheet.hbs` / `generic-sheet.hbs` — 새 `.mg-item` 구조. (Task 3)

소스(시각·구조 기준, gitignore): `docs/design/06201857/styles/magicalogia-item.css`, `docs/design/06201857/templates/item-{spell,anchor}-sheet.hbs`.

---

## Task 1: `_item-sheet.scss` 전면 재작성

**Files:**

- Rewrite: `scss/component/_item-sheet.scss`

**Interfaces:**

- Consumes: `--mg-*` 토큰(`_tokens.scss`), `$mg-radius-sm`/`$mg-font-body`(`_vars.scss`, `@use`).
- Produces: CSS 클래스 `.mg-item`, `.mg-item__bar`/`__sigil`/`__name`, `.mg-item__body`, `.mg-iform`, `.mg-irow`, `.mg-ifield`/`--full`/`__label`/`__label--wide`, `.mg-input`/`--name`/`.mg-num`, `.mg-select`, `.mg-area`, `.mg-cost`, `.mg-checkrow`, `.mg-check`(아이템용), `.mg-idiv`/`__rule--l`/`__rule--r`/`__label`. Task 3 템플릿이 사용.

- [ ] **Step 1: 새 CSS의 `.mg-item*` 규칙을 SCSS로 이식**

`scss/component/_item-sheet.scss`의 **전체 내용을 교체**한다. 이식 원칙:

1. 소스 = `docs/design/06201857/styles/magicalogia-item.css`의 **L16 이후 `.mg-item*` 규칙 전부**. (L1-14의 `@import` 폰트와 `.magicalogia`/`.theme-dark`/`.theme-light` 토큰 블록은 **이식하지 않는다** — 우리 `_tokens.scss`가 토큰을 제공.)
2. 파일 상단에 기존 컴포넌트 SCSS와 동일하게 `@use "../theme/vars" as *;`를 둔다.
3. 새 CSS의 `.magicalogia .mg-item …` 선택자를 `.magicalogia { .mg-item { … } }` 중첩 SCSS로 감싼다(`_components.scss` 패턴과 동일). 색·수치·그라데이션·data-URI 캐럿은 **CSS 원본 그대로**(모두 `--mg-*` 토큰 기반이라 다크/라이트 자동 대응). `border-radius` 등 px 리터럴은 그대로 두되 기존 코드가 `$mg-radius-sm`를 쓰면 일관되게 사용.
4. `.mg-select`의 라이트 캐럿 오버라이드는 새 CSS의 `.magicalogia.theme-light .mg-select`(있으면) 규칙을 `.magicalogia.theme-light { .mg-select { … } }`로 이식한다.
5. 기존 `.mg-item-form`/`.mg-item-grid`/`.mg-ifield`(구버전)/`.mg-icheck` 규칙은 모두 제거(새 클래스로 대체).

> 완전한 값은 소스 CSS에 있다. 임의 수정·생략 없이 1:1 이식하되, 셀렉터만 `.magicalogia {}` 중첩으로 재구성한다.

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: 성공, SCSS 에러 없음, `dist/magicalogia.css`에 `.mg-item*` 컴파일. (이 시점엔 기존 템플릿이 구 클래스를 참조하므로 아이템 시트는 무스타일 — 정상. Task 3에서 템플릿 교체.)

- [ ] **Step 3: 커밋**

```bash
git add scss/component/_item-sheet.scss
git commit -m "style: rewrite item sheet styles to mg-item design"
```

---

## Task 2: `item-sheet.mjs` — `toggle-field` 액션 신설

**Files:**

- Modify: `module/sheets/item-sheet.mjs` (`DEFAULT_OPTIONS`에 `actions` 추가, 핸들러 메서드 추가)

**Interfaces:**

- Consumes: `this.item`(ItemSheetV2).
- Produces: 액션 `toggle-field` — `data-field` 경로의 boolean을 반전. Task 3 템플릿의 `.mg-check`가 `data-action="toggle-field" data-field="system.…"`로 호출.

- [ ] **Step 1: `DEFAULT_OPTIONS`에 actions 추가**

`module/sheets/item-sheet.mjs`의 `DEFAULT_OPTIONS`에서 `form` 블록 뒤(닫는 `}` 앞)에 추가:

```js
    actions: {
      "toggle-field": MagicalogiaItemSheet.#onToggleField,
    },
```

최종 형태(참고):

```js
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "item"],
    position: { width: 480, height: "auto" },
    window: { resizable: true },
    form: {
      handler: MagicalogiaItemSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      "toggle-field": MagicalogiaItemSheet.#onToggleField,
    },
  };
```

- [ ] **Step 2: 핸들러 메서드 추가**

`#onSubmit` 정적 메서드 옆(클래스 본문)에 추가:

```js
  /** 불리언 필드 토글(.mg-check 클릭) — data-field 경로의 boolean 반전. */
  static async #onToggleField(_event, target) {
    const field = target.dataset.field;
    await this.item.update({ [field]: !foundry.utils.getProperty(this.item, field) });
  }
```

- [ ] **Step 3: 빌드·테스트 검증**

Run: `npm run build`
Expected: 성공.

Run: `npm test`
Expected: 52개 통과(무회귀).

- [ ] **Step 4: 커밋**

```bash
git add module/sheets/item-sheet.mjs
git commit -m "feat: add toggle-field action to item sheet"
```

---

## Task 3: 아이템 시트 템플릿 3종 재작성

**Files:**

- Rewrite: `templates/item/spell-sheet.hbs`
- Rewrite: `templates/item/anchor-sheet.hbs`
- Rewrite: `templates/item/generic-sheet.hbs`

**Interfaces:**

- Consumes: Task 1의 `.mg-item*` 클래스, Task 2의 `toggle-field` 액션. context(`item-sheet.mjs` 기존 제공): `item`, `system`, `editable`, `enrichedDescription`, `spellTypes`, `costAreas`, `anchorAttrs`.
- Produces: 최종 렌더 가능한 세 아이템 시트.

- [ ] **Step 1: `spell-sheet.hbs` 재작성**

전체 교체:

```hbs
<div class="{{cssClass}}">
  <div class="mg-item">
    <div class="mg-item__bar">
      <span class="mg-item__sigil"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M8 3.6C6.6 2.6 3.7 2.6 2.2 3.1v9.3c1.5-.5 4.4-.5 5.8.5 1.4-1 4.3-1 5.8-.5V3.1C12.3 2.6 9.4 2.6 8 3.6z"/><path d="M8 3.6v9.3"/></svg></span>
      <span class="mg-item__name">{{item.name}}</span>
    </div>
    <div class="mg-item__body">
      <div class="mg-iform">
        <div class="mg-ifield mg-ifield--full">
          <span class="mg-ifield__label">이름</span>
          <input class="mg-input mg-input--name" type="text" name="name" value="{{item.name}}" placeholder="마법 이름" />
        </div>
        <div class="mg-irow">
          <div class="mg-ifield"><span class="mg-ifield__label">타입</span>
            <select class="mg-select" name="system.type">
              <option value="" {{selected (eq system.type "")}}>—</option>
              {{#each spellTypes}}<option value="{{this}}" {{selected (eq ../system.type this)}}>{{this}}</option>{{/each}}
            </select>
          </div>
          <div class="mg-ifield"><span class="mg-ifield__label">지정특기</span>
            <input class="mg-input" type="text" name="system.skill" value="{{system.skill}}" placeholder="—" />
          </div>
          <div class="mg-ifield"><span class="mg-ifield__label">목표</span>
            <input class="mg-input" type="text" name="system.target" value="{{system.target}}" placeholder="—" />
          </div>
          <div class="mg-ifield"><span class="mg-ifield__label">코스트</span>
            <div class="mg-cost">
              <select class="mg-select" name="system.cost.area">
                {{#each costAreas}}<option value="{{this.value}}" {{selected (eq ../system.cost.area this.value)}}>{{this.label}}</option>{{/each}}
              </select>
              <input class="mg-input mg-num" type="number" name="system.cost.count" value="{{system.cost.count}}" min="0" />
            </div>
          </div>
          <div class="mg-ifield"><span class="mg-ifield__label">충전</span>
            <input class="mg-input mg-num" type="number" name="system.charge" value="{{system.charge}}" min="0" max="6" />
          </div>
          <div class="mg-ifield"><span class="mg-ifield__label">수정</span>
            <input class="mg-input mg-num" type="number" name="system.mod" value="{{system.mod}}" />
          </div>
        </div>
        <div class="mg-irow">
          <label class="mg-checkrow"><span class="mg-check {{#if system.active}}is-on{{/if}}" data-action="toggle-field" data-field="system.active">{{#if system.active}}✓{{/if}}</span>장비/유효</label>
          <label class="mg-checkrow"><span class="mg-check {{#if system.recite}}is-on{{/if}}" data-action="toggle-field" data-field="system.recite">{{#if system.recite}}✓{{/if}}</span>주구</label>
        </div>
        <div class="mg-ifield mg-ifield--full" style="align-items: flex-start">
          <span class="mg-ifield__label" style="margin-top: 6px">효과</span>
          <textarea class="mg-area" name="system.effect" placeholder="마법 효과 ……">{{system.effect}}</textarea>
        </div>
      </div>
      <div class="mg-idiv"><span class="mg-idiv__rule mg-idiv__rule--l"></span><span class="mg-idiv__label">서 술</span><span class="mg-idiv__rule mg-idiv__rule--r"></span></div>
      {{#if editable}}
        <prose-mirror name="system.description" button="true" editable="{{editable}}" toggled="false" value="{{system.description}}">{{{enrichedDescription}}}</prose-mirror>
      {{else}}
        {{{enrichedDescription}}}
      {{/if}}
    </div>
  </div>
</div>
```

- [ ] **Step 2: `anchor-sheet.hbs` 재작성**

전체 교체:

```hbs
<div class="{{cssClass}}">
  <div class="mg-item">
    <div class="mg-item__bar">
      <span class="mg-item__sigil"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="3" r="1.7"/><path d="M8 4.7V14"/><path d="M4.3 8h7.4"/><path d="M2.8 9.6c0 2.7 2.4 4.2 5.2 4.2s5.2-1.5 5.2-4.2"/></svg></span>
      <span class="mg-item__name">{{item.name}}</span>
    </div>
    <div class="mg-item__body">
      <div class="mg-iform">
        <div class="mg-ifield mg-ifield--full">
          <span class="mg-ifield__label">이름</span>
          <input class="mg-input mg-input--name" type="text" name="name" value="{{item.name}}" placeholder="앵커 이름" />
        </div>
        <div class="mg-irow">
          <div class="mg-ifield"><span class="mg-ifield__label mg-ifield__label--wide">운명점</span>
            <input class="mg-input mg-num" type="number" name="system.fate" value="{{system.fate}}" />
          </div>
          <div class="mg-ifield"><span class="mg-ifield__label">속성</span>
            <select class="mg-select" name="system.attr">
              <option value="" {{selected (eq system.attr "")}}>—</option>
              {{#each anchorAttrs}}<option value="{{this}}" {{selected (eq ../system.attr this)}}>{{this}}</option>{{/each}}
            </select>
          </div>
        </div>
        <div class="mg-irow">
          <label class="mg-checkrow"><span class="mg-check {{#if system.encumbrance}}is-on{{/if}}" data-action="toggle-field" data-field="system.encumbrance">{{#if system.encumbrance}}✓{{/if}}</span>중하<span class="han">(重荷)</span></label>
          <label class="mg-checkrow"><span class="mg-check {{#if system.scar}}is-on{{/if}}" data-action="toggle-field" data-field="system.scar">{{#if system.scar}}✓{{/if}}</span>스카<span class="han">(疵)</span></label>
        </div>
      </div>
      <div class="mg-idiv"><span class="mg-idiv__rule mg-idiv__rule--l"></span><span class="mg-idiv__label">설 정</span><span class="mg-idiv__rule mg-idiv__rule--r"></span></div>
      {{#if editable}}
        <prose-mirror name="system.description" button="true" editable="{{editable}}" toggled="false" value="{{system.description}}">{{{enrichedDescription}}}</prose-mirror>
      {{else}}
        {{{enrichedDescription}}}
      {{/if}}
    </div>
  </div>
</div>
```

- [ ] **Step 3: `generic-sheet.hbs` 재작성**

전체 교체(필드 그리드 없이 이름 + 설명만, sigil은 범용 ❖):

```hbs
<div class="{{cssClass}}">
  <div class="mg-item">
    <div class="mg-item__bar">
      <span class="mg-item__sigil">❖</span>
      <span class="mg-item__name">{{item.name}}</span>
    </div>
    <div class="mg-item__body">
      <div class="mg-iform">
        <div class="mg-ifield mg-ifield--full">
          <span class="mg-ifield__label">이름</span>
          <input
            class="mg-input mg-input--name"
            type="text"
            name="name"
            value="{{item.name}}"
            placeholder="아이템 이름"
          />
        </div>
      </div>
      <div class="mg-idiv"><span class="mg-idiv__rule mg-idiv__rule--l"></span><span
          class="mg-idiv__label"
        >{{localize "MAGICALOGIA.item.description"}}</span><span
          class="mg-idiv__rule mg-idiv__rule--r"
        ></span></div>
      {{#if editable}}
        <prose-mirror
          name="system.description"
          button="true"
          editable="{{editable}}"
          toggled="false"
          value="{{system.description}}"
        >{{{enrichedDescription}}}</prose-mirror>
      {{else}}
        {{{enrichedDescription}}}
      {{/if}}
    </div>
  </div>
</div>
```

- [ ] **Step 4: 빌드·테스트 검증**

Run: `npm run build`
Expected: 성공.

Run: `npm test`
Expected: 52개 통과(무회귀).

- [ ] **Step 5: 커밋**

```bash
git add templates/item/spell-sheet.hbs templates/item/anchor-sheet.hbs templates/item/generic-sheet.hbs
git commit -m "feat: rewrite item sheet templates to mg-item design"
```

**육안 검증(F5 — 아이템 시트, 서버 재시작 불필요):**

- 장서·앵커·일반 시트가 골드 프레임 + 타이틀바(sigil + 이름)로 렌더(다크/라이트 양쪽).
- 장서: 이름·타입·지정특기·목표·코스트(영역+개수)·충전·수정 입력, 장비/주구 체크 클릭 토글(`.is-on` 골드), 효과 textarea, 서술 prose-mirror 편집.
- 앵커: 이름·운명점·속성, 중하/스카 체크 토글, 설정 prose-mirror.
- 일반: 이름 + 설명 prose-mirror.
- 모든 값 저장·재로드 유지. 캐릭터 시트 장서/관계 행에 이름·값 반영.

---

## Self-Review

**1. Spec coverage:**

- ① SCSS 전면 재작성(토큰 제외) → Task 1. ✓
- ② spell 템플릿 → Task 3 Step 1. ✓
- ③ anchor 템플릿(setting→description) → Task 3 Step 2. ✓
- ④ generic 템플릿(❖) → Task 3 Step 3. ✓
- ⑤ item-sheet.mjs toggle-field → Task 2. ✓
- 데이터 매핑(cost.area/count, active/recite, encumbrance/scar) → Task 3 템플릿에 반영. ✓
- V2 변환(div, data-action, prose-mirror) → Task 3 전반. ✓
- 모델 변경 없음·classes 유지·select #each → Global Constraints + Task 3. ✓

**2. Placeholder scan:** SCSS는 소스 CSS 1:1 이식 지시(구체 파일/라인/제외 명시 — placeholder 아님). 템플릿·JS는 완전 코드. TBD/TODO 없음. ✓

**3. Type consistency:**

- `toggle-field` 액션명 — Task 2 등록과 Task 3 `data-action` 일치. ✓
- `data-field` 경로(`system.active`/`recite`/`encumbrance`/`scar`) — 모델 필드와 일치. ✓
- context 키(`item`/`system`/`editable`/`enrichedDescription`/`spellTypes`/`costAreas`/`anchorAttrs`) — `item-sheet.mjs` `_prepareContext` 제공분과 일치. ✓
- `system.cost.area`/`system.cost.count` — spell 모델 SchemaField와 일치. ✓
- prose-mirror 패턴 — 이미 도입된 형태와 동일(`name`/`value`/`toggled`/`editable`). ✓
