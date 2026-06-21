# 상태이상 영역 재구성 + 라벨 장식 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 새 디자인 핸드오프 `06210400`의 잔여(상태이상 영역 toolbar 재구성, 메모 정보탭 이동, 스탯/카운터/계제 라벨 장식, 마법표 워터마크)를 현재 시트에 반영한다.

**Architecture:** 데이터 모델 변경 없는 순수 **템플릿 + SCSS + 정적 partial + 정적 에셋** 포트. 새 `--mg-*` 토큰을 추가하지 않고 기존 토큰만 읽는 `.magicalogia` 중첩 SCSS로 작성해 라이트/다크 테마가 자동 적용되게 한다. 이미 구현된 헤더밴드(§1~§5b)는 건드리지 않는다.

**Tech Stack:** Foundry VTT V13 ApplicationV2(`ActorSheetV2`+`HandlebarsApplicationMixin`), Handlebars, SCSS(sass), Vite(빌드/`viteStaticCopy`로 `assets/` 복사), Vitest.

## Global Constraints

- **데이터 모델/`_prepareContext` 변경 금지.** 시안의 `system.*` 경로는 예시 — 현재 모델 경로 유지(`system.abilities.attack/defense/source`, `system.achievement`, `system.mabloom`, `system.variableSkill`, `system.biography`, `system.statuses`, `system.rank`).
- **새 `--mg-*` 토큰 추가 금지.** 새 규칙은 기존 토큰만 사용.
- **partial 참조는 따옴표로 감싼 전체 경로만**(`{{> "systems/magicalogia/templates/..."}}`) — `test/template-partials.test.mjs`가 짧은 이름·미존재 파일을 차단.
- **커밋 메시지**: 영어 한 줄 conventional, co-author 없음(저장소 컨벤션).
- **검증 명령**: 빌드 `npm run build`, 테스트 `npm test`(현재 56개 통과 유지). lint-staged가 커밋 시 hbs/scss/md를 prettier 정렬(정상).
- **이월된 미커밋 변경**: 워킹트리의 `templates/actor/character-sheet.hbs`에 "일시 마력→일시적 마력"(◇ 제거) 한 줄이 이미 있음. Task 2가 같은 파일을 커밋하므로 자연히 함께 포함된다(핸드오프 지시대로).

---

### Task 1: 에셋 복사 + `mg-svg-fleur` partial 생성·등록

**Files:**

- Create: `assets/flourish-line.png`, `assets/flourish.png`, `assets/chart-watermark.png` (docs에서 복사)
- Create: `templates/actor/parts/mg-svg-fleur.hbs`
- Modify: `module/helpers/templates.mjs:7-21` (preload 목록에 1줄 추가)
- Test: `test/template-partials.test.mjs` (기존 — 파일 존재 검증)

**Interfaces:**

- Produces: 정적 에셋 `systems/magicalogia/assets/{flourish-line,flourish,chart-watermark}.png` (Task 2·4가 `<img src>`로 참조), partial `systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs` (Task 3이 `{{> "...mg-svg-fleur.hbs"}}`로 참조).

- [ ] **Step 1: 에셋 3개 복사**

Git Bash에서:

```bash
cp docs/design/06210400/assets/flourish-line.png assets/flourish-line.png
cp docs/design/06210400/assets/flourish.png assets/flourish.png
cp docs/design/06210400/assets/chart-watermark.png assets/chart-watermark.png
ls -1 assets/
```

Expected: `assets/`에 `chart-watermark.png  divider.png  flourish-line.png  flourish.png` 표시.

- [ ] **Step 2: `mg-svg-fleur.hbs` partial 생성**

`templates/actor/parts/mg-svg-fleur.hbs` 전체 내용(`docs/design/06210400/templates/partials/mg-svg-fleur.hbs`와 동일):

```hbs
{{! partial: mg-svg-fleur — 라벨 양옆 작은 플로리시 (example.html FLEUR 상수와 동일)
     계제 / 공적점 / 마화 라벨 좌우에 사용. 오른쪽은 .mg-lbl-fl--r 로 좌우 반전. }}
<svg
  viewBox="0 0 28 12"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  aria-hidden="true"
><path d="M3 6 h12" /><path d="M15 6 c4 -5 9 -5 11 -1 c1.4 2.8 -1.6 4.6 -3 1.8" /><circle
    cx="3"
    cy="6"
    r="1.3"
    fill="currentColor"
    stroke="none"
  /></svg>
```

- [ ] **Step 3: preload 목록에 partial 등록**

`module/helpers/templates.mjs`에서 `mg-svg-miniflr.hbs` 줄 바로 뒤에 추가:

```js
    "systems/magicalogia/templates/actor/parts/mg-svg-miniflr.hbs",
    "systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs",
    "systems/magicalogia/templates/actor/parts/grimoire.hbs",
```

(중간 줄 `mg-svg-fleur.hbs` 한 줄만 신규 — 앞뒤 줄은 위치 식별용 컨텍스트.)

- [ ] **Step 4: 테스트로 partial 무결성 확인**

Run: `npm test`
Expected: PASS (56). `template-partials.test.mjs`의 "참조된 전체 경로 partial 파일이 실제로 존재한다"가 그대로 통과(아직 참조는 없지만 파일 존재로 회귀 없음).

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 성공. `dist/assets/`에 3개 png + `dist/templates/actor/parts/mg-svg-fleur.hbs` 복사됨.

- [ ] **Step 6: 커밋**

```bash
git add assets/flourish-line.png assets/flourish.png assets/chart-watermark.png templates/actor/parts/mg-svg-fleur.hbs module/helpers/templates.mjs
git commit -m "feat: add fleur partial and flourish/watermark assets"
```

---

### Task 2: 상태이상 영역 재구성 + 메모 정보탭 이동

**Files:**

- Modify: `templates/actor/character-sheet.hbs` (status 구간 교체, belowgrid 제거, 메모 info탭 이동)
- Modify: `scss/component/_components.scss` (statusbar/toolbar/toolbtn/hline 추가, status\_\_list grid, 죽은 규칙 제거)
- Modify: `scss/sheet/_layout.scss` (`.mg-belowgrid` 규칙 제거)

**Interfaces:**

- Consumes: `assets/flourish-line.png` (Task 1).
- Produces: 없음(시각 변경). main 탭은 `headband → hline → statusbar(status+toolbar) → hline → mg-shared(subtabs+chart) → accordions` 순서.

- [ ] **Step 1: 상태이상 구간 마크업 교체**

`character-sheet.hbs`에서 현재 `mg-divider`+`mg-status` 블록 전체:

```hbs
        <div class="mg-divider"><img src="systems/magicalogia/assets/divider.png" alt="" /></div>

        <div class="mg-status">
          <span class="mg-status__title"><span class="mark">❖</span>상태이상</span>
          <span class="mg-status__list">
            {{#each statuses}}
            <span class="mg-status__chip {{#if this.active}}is-active{{/if}}" data-action="toggleStatus" data-status="{{this.key}}"><span class="mg-status__mark">✓</span>{{this.label}}</span>
            {{/each}}
          </span>
        </div>
```

를 아래로 교체:

```hbs
        <div class="mg-hline"><img src="systems/magicalogia/assets/flourish-line.png" alt="" /></div>

        <div class="mg-statusbar">
          <div class="mg-status">
            <span class="mg-status__title"><span class="mark">❖</span>상태이상</span>
            <span class="mg-status__list">
              {{#each statuses}}
              <span class="mg-status__chip {{#if this.active}}is-active{{/if}}" data-action="toggleStatus" data-status="{{this.key}}"><span class="mg-status__mark">✓</span>{{this.label}}</span>
              {{/each}}
            </span>
          </div>
          <div class="mg-toolbar">
            <button type="button" class="mg-toolbtn"><span class="mg-toolbtn__label">가변특기</span><span class="mg-toolbtn__val">{{#if system.variableSkill}}{{system.variableSkill}}{{else}}노래{{/if}}</span></button>
            <button type="button" class="mg-toolbtn"><span class="mg-toolbtn__label">운명 변전</span><span class="mg-toolbtn__val mg-toolbtn__val--icon">⚙</span></button>
            <button type="button" class="mg-toolbtn"><span class="mg-toolbtn__label">장면 표</span><span class="mg-toolbtn__val mg-toolbtn__val--icon">⚙</span></button>
            <button type="button" class="mg-toolbtn"><span class="mg-toolbtn__label">펌블 표</span><span class="mg-toolbtn__val mg-toolbtn__val--icon">⚙</span></button>
            <button type="button" class="mg-toolbtn"><span class="mg-toolbtn__label">사건 표</span><span class="mg-toolbtn__val mg-toolbtn__val--icon">⚙</span></button>
            <button type="button" class="mg-toolbtn"><span class="mg-toolbtn__label">주사위</span><span class="mg-toolbtn__val">{{#if system.dice}}{{system.dice}}{{else}}D6{{/if}}</span></button>
          </div>
        </div>

        <div class="mg-hline"><img src="systems/magicalogia/assets/flourish-line.png" alt="" /></div>
```

- [ ] **Step 2: belowgrid 제거 → 메모 블록을 잘라내 보관**

`mg-shared` 안의 `mg-belowgrid` 블록 전체:

```hbs
<div class="mg-belowgrid">
  <div class="mg-memo">
    <span class="mg-memo__label">메 모</span>
    {{#if editable}}
      <prose-mirror
        name="system.biography"
        button="true"
        editable="{{editable}}"
        toggled="false"
        value="{{system.biography}}"
      >{{{enrichedBiography}}}</prose-mirror>
    {{else}}
      {{{enrichedBiography}}}
    {{/if}}
  </div>
  <div>
    <div class="mg-banner mg-banner--inline" style="margin-bottom: 6px">
      <span class="mg-banner__rule mg-banner__rule--l"></span>
      <span class="mg-banner__label">주사위 및 각종 표</span>
      <span class="mg-banner__rule mg-banner__rule--r"></span>
    </div>
    <div class="mg-tables">
      <div class="mg-tablecard">
        <div class="mg-tablecard__head">가변특기</div>
        <div class="mg-tablecard__body mg-tablecard__body--select">
          <input
            class="mg-field__value"
            type="text"
            name="system.variableSkill"
            value="{{system.variableSkill}}"
            placeholder="—"
          /><span class="caret">▾</span>
        </div>
      </div>
      <div class="mg-tablecard"><div class="mg-tablecard__head">운명 변전</div><div
          class="mg-tablecard__body mg-tablecard__body--btn"
        >⚙</div></div>
      <div class="mg-tablecard"><div class="mg-tablecard__head">장면 표</div><div
          class="mg-tablecard__body mg-tablecard__body--btn"
        >⚙</div></div>
      <div class="mg-tablecard"><div class="mg-tablecard__head">주사위</div><div
          class="mg-tablecard__body mg-tablecard__body--roll"
        >D6</div></div>
      <div class="mg-tablecard"><div class="mg-tablecard__head">펌블 표</div><div
          class="mg-tablecard__body mg-tablecard__body--btn"
        >⚙</div></div>
      <div class="mg-tablecard"><div class="mg-tablecard__head">사건 표</div><div
          class="mg-tablecard__body mg-tablecard__body--btn"
        >⚙</div></div>
    </div>
  </div>
</div>
```

를 **삭제**한다. (각종 표는 Step 1 toolbar로 흡수됨, 메모는 Step 3에서 정보 탭으로 옮긴다.) 삭제 후 `mg-shared`는 아래 형태가 된다:

```hbs
        <div class="mg-shared">
          <div class="mg-subtabs">
            <a class="mg-subtab is-active">특기</a>
            <a class="mg-subtab is-disabled" title="준비 중">설정</a>
          </div>

          {{> "systems/magicalogia/templates/actor/parts/magic-chart.hbs"}}
        </div>
```

- [ ] **Step 3: 정보 탭에 메모 블록 추가**

정보 탭의 `mg-info-fields` 닫는 `</div>` 바로 뒤(정보 탭 `</div>` 닫기 전)에 삭제했던 메모 블록을 그대로 붙여넣는다(기존 `mg-memo__label` "메 모" 유지 — 별도 배너 불필요):

```hbs
        </div>
        <div class="mg-memo" style="margin-top: 14px">
          <span class="mg-memo__label">메 모</span>
          {{#if editable}}
            <prose-mirror name="system.biography" button="true" editable="{{editable}}" toggled="false" value="{{system.biography}}">{{{enrichedBiography}}}</prose-mirror>
          {{else}}
            {{{enrichedBiography}}}
          {{/if}}
        </div>
      </div>
```

(첫 `</div>`는 기존 `mg-info-fields` 닫기, 마지막 `</div>`는 기존 정보 탭 컨테이너 닫기 — 위치 식별용. 가운데 `mg-memo` 블록만 신규.)

- [ ] **Step 4: SCSS — statusbar/toolbar/toolbtn/hline 추가 + status\_\_list grid**

`scss/component/_components.scss`의 `.mg-status { ... }` 규칙 안에서 `&__list`를 grid로 교체:

```scss
&__list {
  display: grid;
  grid-template-columns: repeat(4, auto);
  gap: 6px 13px;
  justify-content: start;
}
```

그리고 `.mg-status { ... }` 블록이 끝난 직후(닫는 `}` 다음)에 추가:

```scss
// ---- 상태이상 + 각종 표 toolbar 가로 배치 ----
.mg-statusbar {
  display: flex;
  align-items: stretch;
  gap: 8px;

  > .mg-status {
    flex: 1;
    min-width: 0;
  }
}

// ---- 각종 표 toolbar (상태이상 우측, 현재는 시각 placeholder) ----
.mg-toolbar {
  flex: none;
  display: flex;
  align-items: stretch;
  gap: 8px;
}
.mg-toolbtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 60px;
  padding: 6px 12px;
  background: var(--mg-panel-2);
  border: 1px solid var(--mg-gold);
  border-radius: $mg-radius;
  cursor: pointer;
  transition:
    background 0.12s,
    box-shadow 0.12s;

  &:hover {
    background: var(--mg-hi);
    box-shadow: inset 0 0 0 1px var(--mg-gold);
  }
  &__label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: var(--mg-soft);
    white-space: nowrap;
  }
  &__val {
    font-size: 12px;
    font-weight: 800;
    line-height: 1.1;
    color: var(--mg-gold);
  }
  &__val--icon {
    font-size: 13px;
  }
}

// ---- 얇은 플로리시 가로 라인(상태이상 위/아래, 교체 가능 이미지) ----
.mg-hline {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 3px 0;

  img {
    display: block;
    width: 100%;
    max-width: 580px;
    height: auto;
    opacity: 0.9;
  }
}
```

- [ ] **Step 5: SCSS — 죽은 규칙 제거**

`scss/component/_components.scss`에서 다음 두 블록을 **삭제**:

1. `// ---- Baroque divider (교체 가능 이미지 자산) ----` 주석 + `.mg-divider { ... }` 규칙 전체.
2. `// ---- Dice & tables grid (주사위 및 각종 표) ----` 주석 + `.mg-tables { ... }` + `.mg-tablecard { ... }` 규칙 전체.

`scss/sheet/_layout.scss`에서 다음 블록을 **삭제**:

```scss
// ---- below the chart: memo + dice/tables (2-col) ----
.mg-belowgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: stretch;
}
```

- [ ] **Step 6: 빌드·테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 테스트 56 PASS. (SCSS에 정의되지 않은 변수 오류가 없어야 함 — `$mg-radius`는 기존 정의 사용.)

- [ ] **Step 7: 커밋**

```bash
git add templates/actor/character-sheet.hbs scss/component/_components.scss scss/sheet/_layout.scss
git commit -m "feat: rebuild status area with toolbar and flourish lines, move memo to info tab"
```

(워킹트리에 남아 있던 "일시적 마력" 변경도 이 커밋에 함께 포함된다.)

---

### Task 3: 스탯 FA 아이콘 + 카운터·계제 라벨 플로리시

**Files:**

- Modify: `templates/actor/character-sheet.hbs` (stat-row 라벨, counter-row 라벨, rank 라벨)
- Modify: `scss/component/_components.scss` (`.mg-lbl-ico` / `.mg-lbl-fl` 추가, `.mg-counter--muted` 제거)

**Interfaces:**

- Consumes: partial `mg-svg-fleur.hbs` (Task 1).
- Produces: 없음(시각 변경).

- [ ] **Step 1: 스탯 라벨에 FA 아이콘 + 이름 변경**

`character-sheet.hbs`의 `mg-stat-row` 3개 라벨을 교체. 공격:

```hbs
              <label class="mg-stat mg-stat--key"><span class="mg-stat__label">공격</span><input
```

→

```hbs
              <label class="mg-stat mg-stat--key"><span class="mg-stat__label"><span class="mg-lbl-ico"><i class="fa-solid fa-khanda"></i></span>공격력</span><input
```

방어(`<span class="mg-stat__label">방어</span>` → `...><span class="mg-lbl-ico"><i class="fa-solid fa-shield-halved"></i></span>방어력</span>`), 근원(`근원` → `<span class="mg-lbl-ico"><i class="fa-solid fa-hourglass-half"></i></span>근원력`). `name="system.abilities.*"` 속성은 **변경하지 않는다**.

- [ ] **Step 2: 카운터 라벨에 플로리시 + `--muted` 제거**

`mg-counter-row` 두 라벨 교체. 현재:

```hbs
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
```

→

```hbs
              <label class="mg-counter"><span class="mg-counter__label"><span class="mg-lbl-fl">{{> "systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs"}}</span>공적점<span class="mg-lbl-fl mg-lbl-fl--r">{{> "systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs"}}</span></span><input
                  class="mg-counter__value"
                  name="system.achievement"
                  value="{{system.achievement}}"
                /></label>
              <label class="mg-counter"><span class="mg-counter__label"><span class="mg-lbl-fl">{{> "systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs"}}</span>마화<span class="mg-lbl-fl mg-lbl-fl--r">{{> "systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs"}}</span></span><input
                  class="mg-counter__value"
                  name="system.mabloom"
                  value="{{system.mabloom}}"
                /></label>
```

- [ ] **Step 3: 계제 라벨에 플로리시**

```hbs
<div class="mg-rank__label">계제</div>
```

→

```hbs
              <div class="mg-rank__label"><span class="mg-lbl-fl">{{> "systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs"}}</span>계제<span class="mg-lbl-fl mg-lbl-fl--r">{{> "systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs"}}</span></div>
```

- [ ] **Step 4: SCSS — `.mg-lbl-ico` / `.mg-lbl-fl` 추가, `--muted` 제거**

`scss/component/_components.scss`의 골드 타일 영역(예: `.mg-counter { ... }` 블록 근처) 안 `.magicalogia` 스코프에 추가:

```scss
// ---- 골드 헤더 라벨 장식: FA 아이콘(스탯) / 플로리시(카운터·계제) ----
.mg-lbl-ico {
  display: inline-flex;
  align-items: center;
  color: var(--mg-head-ink);

  i {
    font-size: 11px;
    line-height: 1;
  }
  svg {
    display: block;
    width: 11px;
    height: 11px;
  }
}
.mg-lbl-fl {
  display: inline-flex;
  align-items: center;
  color: var(--mg-head-ink);
  opacity: 0.75;

  svg {
    display: block;
    width: 15px;
    height: 7px;
  }
  &--r {
    transform: scaleX(-1);
  }
}
```

그리고 `.mg-counter { ... }` 블록 안의 죽은 규칙 삭제:

```scss
// 약화(공적점/마화): 골드 헤더 타일은 유지하고 값 색만 죽인다.
&--muted .mg-counter__value {
  color: var(--mg-soft);
}
```

- [ ] **Step 5: 빌드·테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 56 PASS. `template-partials.test.mjs`가 이제 `mg-svg-fleur` 참조(전체경로)+존재를 실제로 검증하며 통과.

- [ ] **Step 6: 커밋**

```bash
git add templates/actor/character-sheet.hbs scss/component/_components.scss
git commit -m "feat: add stat icons and counter/rank label flourishes"
```

---

### Task 4: 마법표 배경 워터마크

**Files:**

- Modify: `templates/actor/parts/magic-chart.hbs:1-2` (`.mg-chart` 첫 자식으로 `<img>` 추가)
- Modify: `scss/component/_magic-chart.scss:1-13` (`.mg-chart` position + `__wm` + grid/footer z-index)

**Interfaces:**

- Consumes: `assets/chart-watermark.png` (Task 1).
- Produces: 없음(시각 변경).

- [ ] **Step 1: 워터마크 `<img>` 삽입**

`magic-chart.hbs` 시작부:

```hbs
<div class="mg-chart">
  <div class="mg-chart__grid">
```

→

```hbs
<div class="mg-chart">
  <img class="mg-chart__wm" src="systems/magicalogia/assets/chart-watermark.png" alt="" />
  <div class="mg-chart__grid">
```

- [ ] **Step 2: SCSS — position + 워터마크 규칙 + z-index**

`scss/component/_magic-chart.scss`의 `.magicalogia .mg-chart { ... }` 여는 블록에 `position: relative;`를 추가하고(`overflow: hidden;` 줄 아래), 같은 블록 안 `.mg-chart__grid { ... }` 규칙 **앞에** 워터마크/스택 규칙을 추가:

```scss
.magicalogia .mg-chart {
  background: var(--mg-panel);
  border: 1px solid var(--mg-gold);
  border-radius: var(--mg-radius);
  overflow: hidden;
  position: relative;
  color: var(--mg-ink);

  // 마법표 배경 워터마크(교체 가능 이미지) — 그리드/푸터 아래에 깐다.
  .mg-chart__wm {
    position: absolute;
    top: 30px;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    width: 300px;
    max-width: 62%;
    height: auto;
    opacity: 0.07;
    pointer-events: none;
    z-index: 0;
  }
  .mg-chart__grid,
  .mg-chart__footer {
    position: relative;
    z-index: 1;
  }
```

(이후 기존 `.mg-chart__grid { display: grid; ... }` 규칙은 그대로 둔다 — 위 stack 규칙과 별개로 grid 정의가 이어진다.)

- [ ] **Step 3: 빌드·테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 56 PASS.

- [ ] **Step 4: 커밋**

```bash
git add templates/actor/parts/magic-chart.hbs scss/component/_magic-chart.scss
git commit -m "feat: add magic chart background watermark"
```

---

## 최종 육안 검증 (F5, 전체 완료 후)

Foundry에서 캐릭터 시트를 새로고침(F5)하고 확인:

- 헤더밴드 아래 **위 flourish-line → 상태이상(4×2 칩) + 우측 toolbar 6버튼 → 아래 flourish-line** 순서. divider 없음.
- 상태이상 칩 클릭 토글 정상(`toggleStatus` 유지).
- toolbar 버튼은 클릭해도 동작/콘솔 경고 없음(`data-action` 없음). 가변특기=값/노래, 주사위=값/D6, 나머지 ⚙.
- 스탯 타일 라벨이 **검·방패·모래시계 아이콘 + 공격력/방어력/근원력**.
- 공적점·마화·계제 라벨 **양옆 플로리시**, 공적점/마화 값은 골드.
- 마법표 중앙 **옅은 워터마크**(셀/푸터 가독성 유지).
- **정보 탭**에 메모(prose-mirror) 표시, 수정 버튼·편집 정상. 메인 탭에는 메모/표 영역 없음.
- `/config`로 라이트 테마 전환 시 위 요소 모두 토큰 상속으로 정상 표시.

## Self-Review 결과(작성자 점검)

- **Spec 커버리지**: §4.1→Task2, §4.2→Task2(Step3), §4.3→Task3, §4.4→Task1+Task3, §4.5→Task4, §4.6→Task1. 누락 없음.
- **Placeholder 스캔**: 코드 블록 전부 실제 내용. "TBD/적절히 처리" 없음.
- **타입/이름 일관성**: 클래스명(`mg-statusbar`/`mg-toolbar`/`mg-toolbtn`/`mg-hline`/`mg-lbl-ico`/`mg-lbl-fl`/`mg-chart__wm`)·에셋 경로·partial 경로가 Task 간 일치. 데이터 경로는 현재 모델(`system.abilities.*` 등) 유지.
