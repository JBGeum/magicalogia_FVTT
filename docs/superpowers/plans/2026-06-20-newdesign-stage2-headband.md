# 새 시안 Stage 2 (헤더밴드 델타) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캐릭터 시트 헤더밴드(초상화·스탯·게이지·계제·divider)를 시안 구조로 재바인딩하되 데이터는 현행 경로 유지, 시트는 계속 정상 렌더.

**Architecture:** 데이터 모델 미변경. `config.mjs`에 `rankTitles` 추가 + 시트 `_prepareContext`에 `rankTitle` 주입(데이터). 시안 SVG는 partial 2개(`mg-svg-pcorner`/`mg-svg-rankflr`)로 신설·등록. 헤더밴드 마크업을 시안 구조로 교체하고, `_components.scss`의 스탯/게이지/초상화 블록을 시안 CSS로 이식. divider.png는 `assets/`에 넣어 빌드 복사(`{src:"assets",dest:"."}`)로 배포.

**Tech Stack:** Foundry VTT ApplicationV2(`module/sheets/actor-sheet.mjs`), Handlebars partial(`templates.mjs` `loadTemplates`), Dart Sass → Vite → `dist/magicalogia.css`(minified). vite-plugin-static-copy로 `assets/`→`dist/assets/`. Vitest 48 모델 테스트.

## Global Constraints

- 데이터 모델 유지 + 템플릿 재바인딩(마이그레이션 없음). 데이터 경로: `system.abilities.attack/defense/source`, `system.mp.value/max`, `system.tempMp`, `system.rank`(NumberField).
- SCSS 분할 + Vite 유지. 시안 단일 CSS를 그대로 쓰지 않고 `scss/`에 내용만 이식.
- `--mg-head-bg`/`--mg-head-ink`(S1에서 정의)를 스탯/게이지/계제 골드헤더가 소비.
- 폰트 변수: 본문 `$mg-font-body`(=Pretendard). 시안 CSS의 `font-family:'Pretendard',sans-serif`는 `$mg-font-body`로 이식.
- 커밋 메시지: 영어 한 줄, co-author 없음.
- 각 Task 종료 시 `npm run build` 성공(SCSS 에러 0) + `dist/magicalogia.css` 생성. `npm test`는 48 통과 유지.
- 빌드 산출물은 minified 1줄이므로 SCSS 검증은 문자열 grep.
- SCSS 함정: `scss/component/_components.scss`에 `.mg-statrail input { background: transparent; border: 0; padding: 0 }`가 있다(statrail 내 모든 input에 적용, specificity `.magicalogia .mg-statrail input`). 시안의 `.mg-stat__value{background:field}`는 `<div>` 기준이라, input value에는 이 transparent가 이긴다. 따라서 **스탯 타일 배경은 `.mg-stat`에 `background: var(--mg-field)`로 올린다**(value input은 투명 유지). 게이지/계제는 `__body`가 `<div>`라 배경을 거기 두면 input 투명과 호환된다.

---

## File Structure

- `module/helpers/config.mjs` — `CONFIG.MAGICALOGIA.*` 상수. Task 1: `rankTitles` 추가.
- `module/sheets/actor-sheet.mjs` — `_prepareContext`. Task 1: `rankTitle` 주입.
- `module/helpers/templates.mjs` — `loadTemplates` partial 목록. Task 2/5: partial 등록.
- `templates/actor/parts/mg-svg-pcorner.hbs` — 신규(Task 2). 초상화 모서리 SVG.
- `templates/actor/parts/mg-svg-rankflr.hbs` — 신규(Task 5). 계제 플로리시 SVG.
- `templates/actor/character-sheet.hbs` — 헤더밴드 마크업. Task 2(초상화)/3(게이지)/5(계제)/6(divider).
- `scss/component/_components.scss` — Task 2(portrait/pcorner)/3(gauge)/4(stat)/5(rank)/6(divider).
- `assets/divider.png` — 신규 바이너리(Task 6).

---

## Task 1: rankTitle 데이터 계층

**Files:**

- Modify: `module/helpers/config.mjs:66` (statuses 배열 뒤)
- Modify: `module/sheets/actor-sheet.mjs:84` (careerOptions 주입 옆)

**Interfaces:**

- Consumes: 없음.
- Produces: `CONFIG.MAGICALOGIA.rankTitles`(객체 `{1..10: string}`)와 시트 컨텍스트 `context.rankTitle`(string, 범위 밖이면 `""`). Task 5의 `{{rankTitle}}`가 소비.

- [ ] **Step 1: config.mjs에 rankTitles 추가**

`module/helpers/config.mjs`의 `MAGICALOGIA.statuses = [...]` 블록(line 57~66) 직후에 추가:

```js
// 계제(rank) 등급명 — rankTitle 헬퍼/시트 컨텍스트가 system.rank 값으로 조회.
MAGICALOGIA.rankTitles = {
  1: "입문자 (Neophyte)",
  2: "열성자 (Zelator)",
  3: "이론자 (Theoricus)",
  4: "실천자 (Practicus)",
  5: "철학자 (Philosophus)",
  6: "소관문 (Adeptus Minor)",
  7: "대관문 (Adeptus Major)",
  8: "면관문 (Adeptus Exemptus)",
  9: "대사 (Magister)",
  10: "마도사 (Magus)",
};
```

- [ ] **Step 2: actor-sheet.mjs에 rankTitle 주입**

`module/sheets/actor-sheet.mjs`의 `context.orgOptions = ...` 줄(line 84) 직후에 추가:

```js
// 계제 등급명(범위 밖이면 빈 문자열).
context.rankTitle = CONFIG.MAGICALOGIA.rankTitles[Number(sys.rank)] ?? "";
```

- [ ] **Step 3: 빌드 + 회귀 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, `Tests 48 passed (48)`. (config 객체 룩업·시트 컨텍스트 주입은 기존 모델 테스트 무관 — 단위 테스트 미추가: 자명한 상수 매핑이고 주입 로직 검증은 Foundry `this.actor` 모킹이 필요해 비용 대비 가치 낮음. 시각 검증은 Task 5 + 통합 Foundry 렌더.)

- [ ] **Step 4: 커밋**

```bash
git add module/helpers/config.mjs module/sheets/actor-sheet.mjs
git commit -m "feat: add rankTitles config and rankTitle sheet context"
```

---

## Task 2: 초상화 SVG 필리그리

**Files:**

- Create: `templates/actor/parts/mg-svg-pcorner.hbs`
- Modify: `module/helpers/templates.mjs:11` (partial 목록)
- Modify: `templates/actor/character-sheet.hbs:29-37` (초상화)
- Modify: `scss/component/_components.scss:276-340` (`.mg-portrait` 블록)

**Interfaces:**

- Consumes: 없음.
- Produces: partial `mg-svg-pcorner.hbs`, 클래스 `.mg-pcorner`(+ `--tl/--tr/--bl/--br`). `.mg-corner*`는 제거.

- [ ] **Step 1: pcorner partial 생성**

Create `templates/actor/parts/mg-svg-pcorner.hbs`:

```hbs
{{! 초상화 모서리 필리그리 (시안 mg-svg-pcorner와 동일) }}
<svg viewBox="0 0 60 60" aria-hidden="true"><g
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
  ><path d="M8 8 H34" /><path d="M8 8 V34" /><path d="M8 22 c10 0 14 -4 14 -14" /><path
      d="M34 12 c8 0 12 4 12 12"
    /><path d="M12 34 c0 -8 4 -12 12 -12" /></g><circle
    cx="8"
    cy="8"
    r="3.4"
    fill="currentColor"
  /></svg>
```

- [ ] **Step 2: templates.mjs에 partial 등록**

`module/helpers/templates.mjs`의 `"systems/magicalogia/templates/actor/parts/mg-field.hbs",` 줄 뒤에 추가:

```js
    "systems/magicalogia/templates/actor/parts/mg-svg-pcorner.hbs",
```

- [ ] **Step 3: 초상화 마크업 교체**

`templates/actor/character-sheet.hbs`의 초상화 블록(현재 line 29~37):

```hbs
<div class="mg-portrait" data-action="editImg">
  {{#if actor.img}}
    <img src="{{actor.img}}" alt="portrait" />
  {{else}}
    <span class="mg-corner mg-corner--tl"></span><span class="mg-corner mg-corner--tr"></span>
    <span class="mg-corner mg-corner--bl"></span><span class="mg-corner mg-corner--br"></span>
    <span class="mg-portrait__glyph">✶</span><span class="mg-portrait__hint">초상화</span>
  {{/if}}
</div>
```

를 (pcorner 4개를 if 바깥에 항상 두고, partial include):

```hbs
            <div class="mg-portrait" data-action="editImg">
              <span class="mg-pcorner mg-pcorner--tl">{{> "systems/magicalogia/templates/actor/parts/mg-svg-pcorner.hbs"}}</span>
              <span class="mg-pcorner mg-pcorner--tr">{{> "systems/magicalogia/templates/actor/parts/mg-svg-pcorner.hbs"}}</span>
              <span class="mg-pcorner mg-pcorner--bl">{{> "systems/magicalogia/templates/actor/parts/mg-svg-pcorner.hbs"}}</span>
              <span class="mg-pcorner mg-pcorner--br">{{> "systems/magicalogia/templates/actor/parts/mg-svg-pcorner.hbs"}}</span>
              {{#if actor.img}}
                <img src="{{actor.img}}" alt="portrait" />
              {{else}}
                <span class="mg-portrait__glyph">✶</span><span class="mg-portrait__hint">초상화</span>
              {{/if}}
            </div>
```

- [ ] **Step 4: SCSS — .mg-portrait 블록 교체**

`scss/component/_components.scss`의 `.mg-portrait { ... }` 블록(현재 line 276~340, `.mg-corner*` 포함) 전체를 교체:

```scss
// ---- Portrait frame (drag/drop target in Foundry) ----
.mg-portrait {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--mg-panel);
  border: 2px solid var(--mg-gold);
  border-radius: $mg-radius;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px var(--mg-gold),
    inset 0 0 0 4px var(--mg-panel),
    inset 0 0 0 5px var(--mg-line);

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__glyph {
    font-size: 32px;
    line-height: 1;
    color: var(--mg-faint);
  }
  &__hint {
    font-size: 9.5px;
    letter-spacing: 0.2em;
    color: var(--mg-faint);
  }

  // SVG corner filigree (시안 mg-pcorner)
  .mg-pcorner {
    position: absolute;
    width: 30px;
    height: 30px;
    color: var(--mg-gold);
    z-index: 2;
    pointer-events: none;

    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  }
  .mg-pcorner--tl {
    top: 3px;
    left: 3px;
  }
  .mg-pcorner--tr {
    top: 3px;
    right: 3px;
    transform: scaleX(-1);
  }
  .mg-pcorner--bl {
    bottom: 3px;
    left: 3px;
    transform: scaleY(-1);
  }
  .mg-pcorner--br {
    bottom: 3px;
    right: 3px;
    transform: scale(-1);
  }
}
```

- [ ] **Step 5: 빌드 + grep + 테스트**

Run: `npm run build && grep -o "mg-pcorner\|mg-corner" dist/magicalogia.css; npm test`
Expected: 빌드 성공, `mg-pcorner` 등장, `mg-corner`(구 클래스) **미등장**, `Tests 48 passed (48)`.

- [ ] **Step 6: 커밋**

```bash
git add templates/actor/parts/mg-svg-pcorner.hbs module/helpers/templates.mjs templates/actor/character-sheet.hbs scss/component/_components.scss
git commit -m "feat: replace portrait corners with SVG filigree (mg-pcorner)"
```

---

## Task 3: 게이지 head/body 재구조화

**Files:**

- Modify: `templates/actor/character-sheet.hbs:107-116` (마력/일시마력 게이지)
- Modify: `scss/component/_components.scss:146-206` (`.mg-gauge` 블록)

**Interfaces:**

- Consumes: `--mg-head-bg`/`--mg-head-ink`/`--mg-field`.
- Produces: 시안 게이지 구조 `.mg-gauge > .mg-gauge__head + .mg-gauge__body`. `--key`/`--muted` 변형자·`.mg-gauge__label` 제거.

- [ ] **Step 1: 게이지 마크업 교체**

`templates/actor/character-sheet.hbs`의 마력/일시마력 게이지(현재 line 107~116):

```hbs
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
```

를:

```hbs
<div class="mg-gauge">
  <div class="mg-gauge__head"><span class="mg-gauge__icon">◈</span>마력</div>
  <div class="mg-gauge__body">
    <input class="mg-gauge__value" name="system.mp.value" value="{{system.mp.value}}" />
    <span class="mg-gauge__sep">/</span>
    <input class="mg-gauge__max" name="system.mp.max" value="{{system.mp.max}}" />
  </div>
</div>
<div class="mg-gauge">
  <div class="mg-gauge__head"><span class="mg-gauge__icon">◇</span>일시 마력</div>
  <div class="mg-gauge__body">
    <input class="mg-gauge__value" name="system.tempMp" value="{{system.tempMp}}" />
  </div>
</div>
```

- [ ] **Step 2: SCSS — .mg-gauge 블록 교체**

`scss/component/_components.scss`의 `.mg-gauge { ... }` 블록(현재 line 146~206) 전체를 교체:

```scss
// ---- Resource gauge (마력 value/max, 일시 마력) — head/body 2분할 ----
.mg-gauge {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--mg-gold);
  border-radius: $mg-radius-sm;
  overflow: hidden;
  min-height: 32px;

  &__head {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    background: var(--mg-head-bg);
    color: var(--mg-head-ink);
    font-weight: 800;
    font-size: 11.5px;
    padding: 0 8px;
    white-space: nowrap;
  }
  &__icon {
    display: flex;
    align-items: center;
    color: var(--mg-head-ink);
    font-size: 11px;
  }
  &__body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--mg-field);
    padding: 0 8px;
  }
  // value/max 는 <input> — statrail input 리셋(투명/border0/padding0)이 적용된다.
  // 폭 제약이 없으면 input 기본 폭이 body를 넘으므로 좁은 폭 + min-width:0 으로 가둔다.
  &__value {
    width: 3ch;
    min-width: 0;
    text-align: right;
    font-family: $mg-font-body;
    font-size: 16px;
    font-weight: 800;
    color: var(--mg-ink);
  }
  &__sep {
    color: var(--mg-soft);
    font-size: 12px;
  }
  &__max {
    width: 3ch;
    min-width: 0;
    text-align: right;
    font-family: $mg-font-body;
    font-size: 16px;
    font-weight: 800;
    color: var(--mg-gold);
  }
}
```

- [ ] **Step 3: 빌드 + grep + 테스트**

Run: `npm run build && grep -o "mg-gauge__head\|mg-gauge__body" dist/magicalogia.css; npm test`
Expected: 빌드 성공, `mg-gauge__head`·`mg-gauge__body` 등장, `Tests 48 passed (48)`.

- [ ] **Step 4: 커밋**

```bash
git add templates/actor/character-sheet.hbs scss/component/_components.scss
git commit -m "feat: restructure mana gauges into head/body with gold header"
```

---

## Task 4: 스탯 타일 골드헤더 (SCSS-only)

**Files:**

- Modify: `scss/component/_components.scss:97-140` (`.mg-stat` 블록)

**Interfaces:**

- Consumes: `--mg-head-bg`/`--mg-head-ink`/`--mg-field`. 마크업 변경 없음(현 `.mg-stat--key` 유지).
- Produces: 시안 스탯 타일(골드헤더 label + field value). `--muted`/`--rank` 변형자 제거(계제는 Task 5에서 `.mg-rank`로 분리되어 더 이상 `.mg-stat--rank` 마크업 없음; `--muted`도 마크업에서 사라짐).

- [ ] **Step 1: SCSS — .mg-stat 블록 교체**

`scss/component/_components.scss`의 `.mg-stat { ... }` 블록(현재 line 97~140) 전체를 교체(`.mg-stat-row`(line 141~144)는 그대로 둔다):

```scss
.mg-stat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 46px;
  border: 1px solid var(--mg-gold);
  border-radius: $mg-radius-sm;
  overflow: hidden;
  // value input은 .mg-statrail input 리셋으로 투명 → 타일 배경을 field로 둔다.
  background: var(--mg-field);

  &__label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--mg-head-bg);
    color: var(--mg-head-ink);
    text-align: center;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.02em;
    padding: 0 2px;
  }
  &__value {
    flex: 1;
    width: 100%;
    text-align: center;
    color: var(--mg-ink);
    font-family: $mg-font-body;
    font-size: 18px;
    font-weight: 800;
  }
  // 강조(공격/방어/근원): 큰 값.
  &--key .mg-stat__value {
    font-size: 20px;
  }
}
```

- [ ] **Step 2: 빌드 + grep + 테스트**

Run: `npm run build && grep -o "mg-stat__label{[^}]*head-bg\|mg-stat__label" dist/magicalogia.css | head; npm test`
Expected: 빌드 성공, `.mg-stat__label`에 `--mg-head-bg` 적용 확인, `Tests 48 passed (48)`.

- [ ] **Step 3: 커밋**

```bash
git add scss/component/_components.scss
git commit -m "style: apply gold header to stat tiles (mg-stat)"
```

---

## Task 5: 계제 타일 재구조화 (.mg-rank)

**Files:**

- Create: `templates/actor/parts/mg-svg-rankflr.hbs`
- Modify: `module/helpers/templates.mjs` (partial 목록)
- Modify: `templates/actor/character-sheet.hbs:117-125` (계제 stat-row)
- Modify: `scss/component/_components.scss` (`.mg-stat-row` 뒤 `.mg-rank` 신설)

**Interfaces:**

- Consumes: `context.rankTitle`(Task 1), `--mg-head-bg`/`--mg-head-ink`/`--mg-field`/`--mg-soft`/`--mg-gold`.
- Produces: partial `mg-svg-rankflr.hbs`, 클래스 `.mg-rank`(+`__label`/`__body`/`__flourish`/`__value`/`__sub`).

- [ ] **Step 1: rankflr partial 생성**

Create `templates/actor/parts/mg-svg-rankflr.hbs`:

```hbs
{{! 계제 타일 플로리시 (시안 mg-svg-rankflr와 동일) }}
<svg viewBox="0 0 120 12" aria-hidden="true"><g
    fill="none"
    stroke="currentColor"
    stroke-width="1.3"
    stroke-linecap="round"
  ><path d="M6 6 H48" /><path d="M72 6 H114" /><path d="M48 6 c6 0 8 -4 14 -4" /><path
      d="M72 6 c-6 0 -8 -4 -14 -4"
    /></g><path d="M60 1 l4 5 l-4 5 l-4 -5 z" fill="currentColor" /></svg>
```

- [ ] **Step 2: templates.mjs에 partial 등록**

`module/helpers/templates.mjs`의 `mg-svg-pcorner.hbs` 줄(Task 2에서 추가됨) 뒤에 추가:

```js
    "systems/magicalogia/templates/actor/parts/mg-svg-rankflr.hbs",
```

- [ ] **Step 3: 계제 마크업 교체**

`templates/actor/character-sheet.hbs`의 계제 stat-row(현재 line 117~125):

```hbs
<div class="mg-stat-row">
  <label class="mg-stat mg-stat--rank mg-stat--muted"><span class="mg-stat__label">계제</span><input
      class="mg-stat__value"
      name="system.rank"
      value="{{system.rank}}"
    /></label>
</div>
```

를:

```hbs
            <div class="mg-rank">
              <div class="mg-rank__label">계제</div>
              <div class="mg-rank__body">
                <div class="mg-rank__flourish">{{> "systems/magicalogia/templates/actor/parts/mg-svg-rankflr.hbs"}}</div>
                <input class="mg-rank__value" name="system.rank" value="{{system.rank}}" />
                <div class="mg-rank__sub">{{rankTitle}}</div>
              </div>
            </div>
```

- [ ] **Step 4: SCSS — .mg-rank 신설**

`scss/component/_components.scss`의 `.mg-stat-row { ... }` 블록 직후에 추가:

```scss
// ---- Rank tile (계제: 값 + 등급명 + 플로리시) ----
.mg-rank {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--mg-gold);
  border-radius: $mg-radius-sm;
  overflow: hidden;
  text-align: center;

  &__label {
    background: var(--mg-head-bg);
    color: var(--mg-head-ink);
    font-size: 10px;
    font-weight: 800;
    padding: 2px 0;
  }
  &__body {
    background: var(--mg-field);
    padding: 3px 0 5px;
  }
  &__flourish {
    display: flex;
    justify-content: center;
    height: 11px;
    margin: 1px 0;
    color: var(--mg-gold);

    svg {
      height: 11px;
      width: auto;
      display: block;
    }
  }
  // value 는 <input> — statrail input 리셋(투명/border0/padding0) 적용.
  &__value {
    width: 100%;
    text-align: center;
    color: var(--mg-gold);
    font-family: $mg-font-body;
    font-size: 22px;
    font-weight: 800;
    line-height: 1;
  }
  &__sub {
    color: var(--mg-soft);
    font-size: 9.5px;
    margin-top: 1px;
  }
}
```

- [ ] **Step 5: 빌드 + grep + 테스트**

Run: `npm run build && grep -o "mg-rank__flourish\|mg-rank__sub" dist/magicalogia.css; npm test`
Expected: 빌드 성공, `mg-rank__flourish`·`mg-rank__sub` 등장, `Tests 48 passed (48)`.

- [ ] **Step 6: 커밋**

```bash
git add templates/actor/parts/mg-svg-rankflr.hbs module/helpers/templates.mjs templates/actor/character-sheet.hbs scss/component/_components.scss
git commit -m "feat: restructure rank tile with title and flourish (mg-rank)"
```

---

## Task 6: divider

**Files:**

- Create: `assets/divider.png` (copy from gitignored mockup)
- Modify: `templates/actor/character-sheet.hbs:127-128` (헤더밴드 닫힘 직후)
- Modify: `scss/component/_components.scss` (`.mg-status` 블록 앞 `.mg-divider` 신설)

**Interfaces:**

- Consumes: 없음.
- Produces: `assets/divider.png`(빌드 시 `dist/assets/divider.png`로 복사), 클래스 `.mg-divider`. Foundry 경로 `systems/magicalogia/assets/divider.png`.

- [ ] **Step 1: divider.png 복사**

Run: `cp docs/design/new/assets/divider.png assets/divider.png && ls -l assets/divider.png`
Expected: `assets/divider.png` 존재(0바이트 아님).

- [ ] **Step 2: divider 마크업 추가**

`templates/actor/character-sheet.hbs`에서 헤더밴드(`.mg-headband`)를 닫는 `</div>`(현재 line 127)와 상태이상(`<div class="mg-status">`, 현재 line 129) 사이에 추가:

```hbs
<div class="mg-divider"><img src="systems/magicalogia/assets/divider.png" alt="" /></div>
```

- [ ] **Step 3: SCSS — .mg-divider 신설**

`scss/component/_components.scss`의 `.mg-status { ... }` 블록 직전에 추가:

```scss
// ---- Baroque divider (교체 가능 이미지 자산) ----
.mg-divider {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 6px 0 4px;

  img {
    display: block;
    width: 100%;
    max-width: 560px;
    height: auto;
  }
}
```

- [ ] **Step 4: 빌드 + asset 복사 + grep + 테스트**

Run: `npm run build && ls dist/assets/divider.png && grep -o "mg-divider" dist/magicalogia.css; npm test`
Expected: 빌드 성공, `dist/assets/divider.png` 존재, `mg-divider` 등장, `Tests 48 passed (48)`.

- [ ] **Step 5: Foundry 실렌더 검증 (수동)**

Foundry에서 캐릭터 시트를 열어(F5) 육안 확인:

- 초상화 네 모서리에 SVG 필리그리(곡선 장식) 표시, img 유무와 무관.
- 공격/방어/근원 스탯 타일: 골드 그라데이션 헤더(라벨) + field 값.
- 마력/일시 마력 게이지: 골드헤더(아이콘+라벨) + field body(값).
- 계제 타일: 골드헤더 "계제" + 플로리시 SVG + 골드 숫자 + 등급명(예 rank=4 → "실천자 (Practicus)").
- 헤더밴드와 상태이상 사이 divider 이미지 표시.
- 정체성 그리드/마법표/탭 레이아웃 무손상.

(partial 신규 등록이라 F5로 시스템 템플릿 재로드 필요. documentTypes 변경 아니므로 서버 재시작 불필요.)

- [ ] **Step 6: 커밋**

```bash
git add assets/divider.png templates/actor/character-sheet.hbs scss/component/_components.scss
git commit -m "feat: add baroque divider between headband and status strip"
```

---

## Self-Review (스펙 대조)

- **스펙 ① rankTitle 데이터** → Task 1. ✓ (config.mjs rankTitles + actor-sheet.mjs 주입. 단위테스트 미추가 사유 명시.)
- **스펙 ② 초상화 SVG 필리그리** → Task 2. ✓ (partial 신설·등록·마크업 항상표시·SCSS. portrait 프레임은 시안값(border 2px + 3중 inset box-shadow + aspect 1/1)으로 이식 — spec "box-shadow 갱신"을 시안 프레임 전체로 해석.)
- **스펙 ③ 게이지 head/body** → Task 3. ✓ (`--key`/`--muted`/`__label` 제거, head/body.)
- **스펙 ④ 스탯 골드헤더** → Task 4. ✓ (SCSS-only. `.mg-stat` background:field로 input 투명 함정 해소.)
- **스펙 ⑤ 계제 .mg-rank** → Task 5. ✓ (partial·등록·마크업·SCSS. rankTitle 소비.)
- **스펙 ⑥ divider** → Task 6. ✓ (asset 복사·마크업·SCSS·빌드 복사 검증.)
- **검증(build/test/실렌더)** → 각 Task 검증 + Task 6 Step 5 통합 Foundry. ✓
- **비목표**(miniflr·상태칩 마크·마법표 아이콘·탭재편·라이트테마) → 미포함. ✓

**Type/이름 일관성:** `context.rankTitle`(Task 1) ↔ `{{rankTitle}}`(Task 5) 일치. partial 경로 `mg-svg-pcorner.hbs`(Task 2)/`mg-svg-rankflr.hbs`(Task 5)가 등록·include·SCSS에서 동일. `--mg-head-bg`/`--mg-head-ink`(S1 정의) 소비 일치.

**스펙과의 의도적 차이(보정):**

1. 스탯 타일 배경을 `.mg-stat__value`(시안 div) 대신 `.mg-stat`에 둠 — `.mg-statrail input{background:transparent}` 함정 회피(input value 투명 유지).
2. 초상화 `aspect-ratio`를 현행 `1/1.05` → 시안 `1/1`로(프레임 전체 이식 일관성). border 1px→2px + box-shadow 추가.
3. 게이지 value/max에 `width:3ch; min-width:0` 추가(시안 div엔 없음 — input 폭 가둠, 현행 게이지 패턴 계승).
