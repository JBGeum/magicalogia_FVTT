# 마기카로기아 메인 탭 비주얼 슬라이스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시안의 캐릭터 시트(메인) 탭을 시각적으로 재현하고 식별 필드 입력·초상화 교체·상태이상 토글이 동작하게 한다.

**Architecture:** 시안 SCSS(`_base`/`_layout`/`_components`)를 `.magicalogia` 스코프로 이식(Sass 변수는 신규 `scss/theme/_vars.scss`로 공급), 식별 9필드를 `CharacterDataModel`에 추가, `character-sheet.hbs`를 시안 메인 탭 레이아웃으로 재구성. 마법표·판정은 기존 partial/액션 재사용.

**Tech Stack:** Foundry VTT V13(ApplicationV2 + TypeDataModel), `.mjs`, SCSS(Vite 추출), vitest.

## Global Constraints

- 시스템 id `magicalogia`. 런타임 코드 `.mjs`. V13 네임스페이스(`foundry.applications.*`).
- DataModel-only. 구조화 스키마. 신규 식별 필드는 StringField `initial: ""`.
- 다크 테마 고정(`theme-dark`). 라이트 테마·토글은 비포함.
- 기존 필드 매핑(신설 금지): 공격/방어/근원=`abilities.attack/defense/source`, 마력=`mp.value/max`, 일시마력=`tempMp`, 공적점=`achievement`, 마화=`mabloom`, 메모=`biography`, 가변특기=`variableSkill`, 계제=`rank`.
- 신규 식별 필드 9종: `tempName, career, magicName, organization, player, socialStatus, genderAge, trueForm, effect`.
- 비포함: 장서/관계 탭 콘텐츠, ⚙ 표 RollTable 연결, 라이트 테마, 폰트 번들, 주사위 실제 굴림.
- 커밋: 영어 한 줄, Conventional Commits 접두사, `Co-Authored-By` 없음, 본문 없음.
- 시안 SCSS 원본: `docs/design/styles/`(이미 `.magicalogia` 스코프, `--mg-*` 변수 사용). `templates/` 은 `.prettierignore`에 있음(hbs 포맷 제외).

---

## Task 1: 식별 9필드 데이터 모델 추가

`CharacterDataModel`에 시안 헤더의 식별 StringField 9종을 추가한다.

**Files:**

- Modify: `module/data/actors/character.mjs`
- Modify: `test/character-model.test.mjs`

**Interfaces:**

- Produces: `system.tempName, career, magicName, organization, player, socialStatus, genderAge, trueForm, effect` (모두 StringField, initial ""). Task 3 템플릿이 `name="system.<키>"`로 바인딩.

- [ ] **Step 1: 실패 테스트 추가 — `test/character-model.test.mjs`**

기존 `describe("CharacterDataModel", ...)` 블록 안, `base 스키마(biography)를 상속한다` 테스트 앞에 추가:

```js
it("시안 식별 9필드를 포함한다", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  const s = CharacterDataModel.defineSchema();
  for (const key of [
    "tempName",
    "career",
    "magicName",
    "organization",
    "player",
    "socialStatus",
    "genderAge",
    "trueForm",
    "effect",
  ]) {
    expect(Object.keys(s)).toContain(key);
  }
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/character-model.test.mjs`
Expected: FAIL (`expected [...] to contain 'tempName'`)

- [ ] **Step 3: `module/data/actors/character.mjs`에 식별 필드 추가**

`soulSkill`/`variableSkill` 정의 줄 다음(능력치 블록 앞)에 추가:

```js
      // 시안 헤더 식별 필드
      tempName: new fields.StringField({ initial: "" }),
      career: new fields.StringField({ initial: "" }),
      magicName: new fields.StringField({ initial: "" }),
      organization: new fields.StringField({ initial: "" }),
      player: new fields.StringField({ initial: "" }),
      socialStatus: new fields.StringField({ initial: "" }),
      genderAge: new fields.StringField({ initial: "" }),
      trueForm: new fields.StringField({ initial: "" }),
      effect: new fields.StringField({ initial: "" }),
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/character-model.test.mjs`
Expected: PASS (전부)

- [ ] **Step 5: 전체 테스트 + lint + typecheck**

Run: `npm test` → 모든 테스트 PASS
Run: `npm run lint` → 에러 0
Run: `npm run typecheck` → 에러 0

- [ ] **Step 6: 커밋**

```bash
git add module/data/actors/character.mjs test/character-model.test.mjs
git commit -m "feat: add character identity fields"
```

---

## Task 2: 시안 SCSS 이식 (셸·레이아웃·컴포넌트·폰트·배경)

시안 `_base`/`_layout`/`_components`를 `.magicalogia` 스코프로 이식하고, Sass 변수 공급·다크 배경 장식·폰트 로드를 연결한다.

**Files:**

- Create: `scss/theme/_vars.scss`
- Modify: `scss/theme/_tokens.scss` (다크 `--mg-deco` 추가)
- Create: `scss/global/_base.scss`는 이미 존재 → **교체**(시안 \_base 이식). 기존 `scss/global/_base.scss`(보일러플레이트 골격)는 시안 버전으로 대체.
- Create: `scss/sheet/_layout.scss`
- Create: `scss/component/_components.scss`
- Modify: `scss/magicalogia.scss` (@use 연결 + 폰트 @import)

**Interfaces:**

- Produces: 시안 클래스 스타일(`mg-masthead`, `mg-tabs`, `mg-headband`, `mg-identity-grid`, `mg-statrail`, `mg-field`, `mg-stat`, `mg-gauge`, `mg-counter`, `mg-status__chip`, `mg-portrait`, `mg-memo`, `mg-subtabs`, `mg-banner`, `mg-tables`, `mg-tablecard`). Task 3 템플릿이 이 클래스를 사용.
- Sass 변수 `$mg-font-body/display/latin`, `$mg-radius`, `$mg-radius-sm`, `$mg-row-h`, `$mg-head-h` 를 `scss/theme/_vars.scss`가 export.

- [ ] **Step 1: `scss/theme/_vars.scss` 작성 (Sass 변수)**

```scss
// 시안 구조 토큰(테마 비의존 Sass 변수). 이식한 _base/_layout/_components가 @use로 참조.
$mg-font-body: "Nanum Myeongjo", serif;
$mg-font-display: "Gowun Batang", serif;
$mg-font-latin: "Cinzel", serif;

$mg-radius: 3px;
$mg-radius-sm: 2px;
$mg-row-h: 22px;
$mg-head-h: 36px;
$mg-sheet-w: 720px;
$mg-pad: 16px;
```

- [ ] **Step 2: `scss/theme/_tokens.scss`에 다크 배경 장식 `--mg-deco` 추가**

기존 `--mg-dark-ink: #a98fd0;` 줄 다음에 추가:

```scss
// 배경 장식 — 골드 소환진 + 보라 글로우 (다크). _base의 .magicalogia::before가 읽음.
--mg-deco:
  url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='440' height='440' viewBox='0 0 440 440'><g fill='none' stroke='%23e0c074' stroke-opacity='0.5'><circle cx='220' cy='220' r='168' stroke-width='1.5'/><circle cx='220' cy='220' r='146'/><circle cx='220' cy='220' r='100'/><rect x='96' y='96' width='248' height='248' transform='rotate(45 220 220)'/><rect x='116' y='116' width='208' height='208'/></g></svg>")
    no-repeat center 40px / 460px 460px,
  radial-gradient(700px 480px at 50% 30%, rgba(74, 44, 132, 0.5), transparent 70%);
```

- [ ] **Step 3: `scss/global/_base.scss` 교체 (시안 \_base 이식)**

`docs/design/styles/_base.scss`의 내용을 그대로 복사하되 **두 곳만 수정**:

1. 첫 줄 `@use 'tokens' as *;` → `@use "../theme/vars" as *;`
2. `> .mg-content { position: relative; z-index: 1; }` → `.mg-content { position: relative; z-index: 1; }` (V13에서 `.magicalogia`는 최상위 `.application`이고 form이 그 안쪽이라 직계 자식 셀렉터가 안 맞음 — 자손 셀렉터로 변경)

나머지(masthead/tabs/panel-body 규칙)는 그대로.

- [ ] **Step 4: `scss/sheet/_layout.scss` 작성 (시안 \_layout 이식)**

`docs/design/styles/_layout.scss`의 내용을 그대로 복사하되 첫 줄 `@use 'tokens' as *;` → `@use "../theme/vars" as *;` 로만 수정. (헤드밴드/식별그리드/스탯레일/belowgrid/mg-main/mg-shared 규칙 그대로. 하단 주석 블록도 유지 가능.)

- [ ] **Step 5: `scss/component/_components.scss` 작성 (시안 \_components 이식)**

`docs/design/styles/_components.scss`의 내용을 그대로 복사하되 첫 줄 `@use 'tokens' as *;` → `@use "../theme/vars" as *;` 로만 수정. (field/stat/gauge/counter/status/portrait/memo/subtabs/banner/tables/tablecard/table/check 규칙 그대로.)

> 참고: `.mg-check` 규칙이 시안 \_components와 기존 `_magic-chart.scss` 양쪽에 있으나, 마법표의 `.mg-chart__cell .mg-check`가 더 구체적이라 충돌 없음. 그대로 둔다.

- [ ] **Step 6: `scss/magicalogia.scss` 갱신 (@use + 폰트)**

전체를 아래로 교체:

```scss
@use "global/base";
@use "sheet/sheet";
@use "sheet/layout";
@use "theme/tokens";
@use "component/magic-chart";
@use "component/components";

// 폰트 — 시안 지정(본문 Nanum Myeongjo / 디스플레이 Gowun Batang / 라틴 Cinzel).
// 오프라인/사설 서버용 @font-face 번들은 후속 작업.
@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Gowun+Batang:wght@400;700&family=Nanum+Myeongjo:wght@400;700&display=swap");
```

- [ ] **Step 7: 빌드·lint·typecheck 검증**

Run: `npm run build`
Expected: 에러 0, `dist/magicalogia.css` 생성(이전보다 커짐). Sass 컴파일 에러 없음.

Run: `npm run lint` → 에러 0
Run: `npm run typecheck` → 에러 0
Run: `npm test` → 모든 테스트 PASS(스타일은 테스트 없음, 회귀만 확인)

- [ ] **Step 8: 커밋**

```bash
git add scss/
git commit -m "style: port design sheet styles (shell, layout, components)"
```

---

## Task 3: 메인 탭 템플릿 재구성 + 식별 필드 partial + 인터랙션

`character-sheet.hbs`를 시안 메인 탭 레이아웃으로 재구성하고, 식별 필드 partial과 초상화 교체·상태 토글 액션을 추가한다.

**Files:**

- Create: `templates/actor/parts/mg-field.hbs`
- Modify: `templates/actor/character-sheet.hbs` (전면 교체)
- Modify: `module/helpers/templates.mjs` (partial preload)
- Modify: `module/sheets/actor-sheet.mjs` (editImg/toggleStatus 액션)

**Interfaces:**

- Consumes: Task 2 스타일 클래스, 기존 `magic-chart.hbs` partial, `computeTable`(이미 prepareContext에서 호출), `context.statuses`/`context.system`/`context.attributes`/`context.chart`.
- Produces: 시안 메인 탭 DOM. 액션 `editImg`, `toggleStatus`.

- [ ] **Step 1: `templates/actor/parts/mg-field.hbs` 작성**

```hbs
{{!-- 라벨+밑줄 값 필드. usage: {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="마법명" name="system.magicName" value=system.magicName}} --}}
<label class="mg-field">
  <span class="mg-field__mark">❖</span>
  <span class="mg-field__label">{{label}}</span>
  <input
    class="mg-field__value {{#unless value}}mg-field__value--empty{{/unless}}"
    type="text"
    name="{{name}}"
    value="{{value}}"
    placeholder="—"
  />
</label>
```

- [ ] **Step 2: `module/helpers/templates.mjs` preload에 mg-field 추가**

`loadTemplates` 배열에 추가(마법표 partial 줄 다음):

```js
    "systems/magicalogia/templates/actor/parts/mg-field.hbs",
```

- [ ] **Step 3: `templates/actor/character-sheet.hbs` 전면 교체**

```hbs
<form class="{{cssClass}}" autocomplete="off">
  <div class="mg-content">
    <header class="mg-masthead">
      <div>
        <div class="mg-masthead__eyebrow">❧ 파토서대전 RPG ❧</div>
        <span class="mg-masthead__title">마기카로기아</span>
        <span class="mg-masthead__latin">CHARACTER SHEET</span>
      </div>
      <div class="mg-masthead__sigil">✶</div>
    </header>

    <nav class="mg-tabs">
      <a class="mg-tab is-active">캐릭터 시트</a>
      <a class="mg-tab is-disabled" title="준비 중">장서</a>
      <a class="mg-tab is-disabled" title="준비 중">관계</a>
      <a class="mg-tab is-disabled" title="준비 중">개요·정보</a>
      <a class="mg-tab is-disabled" title="준비 중">속성·능력</a>
    </nav>

    <section class="mg-tab-content">
      <div class="tab mg-main mg-panel-body" data-tab="main">

        <div class="mg-headband">
          <div class="mg-portrait" data-action="editImg">
            {{#if actor.img}}
            <img src="{{actor.img}}" alt="portrait" />
            {{else}}
            <span class="mg-corner mg-corner--tl"></span><span class="mg-corner mg-corner--tr"></span>
            <span class="mg-corner mg-corner--bl"></span><span class="mg-corner mg-corner--br"></span>
            <span class="mg-portrait__glyph">✶</span><span class="mg-portrait__hint">초상화</span>
            {{/if}}
          </div>

          <div class="mg-identity-grid">
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="임시 이름" name="system.tempName" value=system.tempName}}
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="경력" name="system.career" value=system.career}}
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="마법명" name="system.magicName" value=system.magicName}}
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="기관" name="system.organization" value=system.organization}}
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="플레이어" name="system.player" value=system.player}}
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="신분" name="system.socialStatus" value=system.socialStatus}}
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="성별·연령" name="system.genderAge" value=system.genderAge}}
            {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="진정한 모습" name="system.trueForm" value=system.trueForm}}
            <label class="mg-field mg-field--wide mg-field--effect">
              <span class="mg-field__mark">❖</span>
              <span class="mg-field__label">효과</span>
              <input class="mg-field__value" type="text" name="system.effect" value="{{system.effect}}" placeholder="—" />
            </label>
          </div>

          <div class="mg-statrail">
            <div class="mg-stat-row">
              <label class="mg-stat"><span class="mg-stat__label">공격</span><input class="mg-stat__value" name="system.abilities.attack" value="{{system.abilities.attack}}" /></label>
              <label class="mg-stat"><span class="mg-stat__label">방어</span><input class="mg-stat__value" name="system.abilities.defense" value="{{system.abilities.defense}}" /></label>
              <label class="mg-stat"><span class="mg-stat__label">근원</span><input class="mg-stat__value" name="system.abilities.source" value="{{system.abilities.source}}" /></label>
              <label class="mg-stat mg-stat--rank"><span class="mg-stat__label">계제</span><input class="mg-stat__value" name="system.rank" value="{{system.rank}}" /></label>
            </div>
            <div class="mg-gauge">
              <span class="mg-gauge__icon">◈</span><span class="mg-gauge__label">마력</span>
              <input class="mg-gauge__value" name="system.mp.value" value="{{system.mp.value}}" />
              <span class="mg-gauge__sep">/</span>
              <input class="mg-gauge__max" name="system.mp.max" value="{{system.mp.max}}" />
            </div>
            <div class="mg-gauge">
              <span class="mg-gauge__icon">◇</span><span class="mg-gauge__label">일시 마력</span>
              <input class="mg-gauge__value" name="system.tempMp" value="{{system.tempMp}}" />
            </div>
            <div class="mg-counter-row">
              <label class="mg-counter"><span class="mg-counter__label">공적점</span><input class="mg-counter__value" name="system.achievement" value="{{system.achievement}}" /></label>
              <label class="mg-counter"><span class="mg-counter__label">마화</span><input class="mg-counter__value" name="system.mabloom" value="{{system.mabloom}}" /></label>
            </div>
          </div>
        </div>

        <div class="mg-status">
          <span class="mg-status__title"><span class="mark">❖</span>상태이상</span>
          <span class="mg-status__list">
            {{#each statuses}}
            <span class="mg-status__chip {{#if this.active}}is-active{{/if}}" data-action="toggleStatus" data-status="{{this.key}}">{{this.label}}</span>
            {{/each}}
          </span>
        </div>

        <div class="mg-shared">
          <div class="mg-subtabs">
            <a class="mg-subtab is-active">특기</a>
            <a class="mg-subtab is-disabled" title="준비 중">설정</a>
          </div>

          {{> "systems/magicalogia/templates/actor/parts/magic-chart.hbs"}}

          <div class="mg-belowgrid">
            <div class="mg-memo">
              <span class="mg-memo__label">메 모</span>
              {{editor enrichedBiography target="system.biography" button=true editable=editable}}
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
                    <input class="mg-field__value" type="text" name="system.variableSkill" value="{{system.variableSkill}}" placeholder="—" /><span class="caret">▾</span>
                  </div>
                </div>
                <div class="mg-tablecard"><div class="mg-tablecard__head">운명 변전</div><div class="mg-tablecard__body mg-tablecard__body--btn">⚙</div></div>
                <div class="mg-tablecard"><div class="mg-tablecard__head">장면 표</div><div class="mg-tablecard__body mg-tablecard__body--btn">⚙</div></div>
                <div class="mg-tablecard"><div class="mg-tablecard__head">주사위</div><div class="mg-tablecard__body mg-tablecard__body--roll">D6</div></div>
                <div class="mg-tablecard"><div class="mg-tablecard__head">펌블 표</div><div class="mg-tablecard__body mg-tablecard__body--btn">⚙</div></div>
                <div class="mg-tablecard"><div class="mg-tablecard__head">사건 표</div><div class="mg-tablecard__body mg-tablecard__body--btn">⚙</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</form>
```

- [ ] **Step 4: `module/sheets/actor-sheet.mjs`에 editImg/toggleStatus 액션 추가**

`actions` 객체에 추가(기존 toggleSkill/rollSpecialty 옆):

```js
      editImg: MagicalogiaActorSheet.#onEditImg,
      toggleStatus: MagicalogiaActorSheet.#onToggleStatus,
```

그리고 `#onToggleSkill` 메서드 옆에 두 메서드 추가:

```js
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
```

- [ ] **Step 5: 빌드·lint·typecheck·test 검증**

Run: `npm run lint` → 에러 0
Run: `npm run typecheck` → 에러 0
Run: `npm test` → 모든 테스트 PASS
Run: `npm run build` → 에러 0, dist 산출(템플릿 복사 포함)

- [ ] **Step 6: 커밋**

```bash
git add templates/actor module/helpers/templates.mjs module/sheets/actor-sheet.mjs
git commit -m "feat: rebuild character sheet main tab to design layout"
```

- [ ] **Step 7: (수동) Foundry 런타임 검증**

`npm run build && npm run link:foundry` 후 Foundry 기동 → character 액터 시트:

1. 마스트헤드(마기카로기아 + CHARACTER SHEET + ✶), 비활성 탭 네비 표시.
2. 헤드밴드: 초상화(클릭 시 FilePicker), 식별 9필드 2열, 스탯레일(공격/방어/근원/계제·마력·일시마력·공적점·마화) — 입력 저장.
3. 상태이상 칩 클릭 시 토글(골드 강조).
4. 마법표·특기 판정 정상(기존 기능 회귀 없음).
5. 메모 에디터, 표카드 6종 표시.
6. 다크 배경 소환진·골드 라인 등 시안 톤 적용.
   Expected: 콘솔 에러 없이 시안과 유사한 메인 탭 렌더.

---

## Self-Review

- **Spec coverage:** §2 식별 9필드→Task 1. §3 SCSS 이식(base/layout/components/tokens deco/fonts/@use)→Task 2. §4 템플릿 구조(마스트헤드·탭·헤드밴드·상태·서브탭·마법표·belowgrid)→Task 3 Step 3. §5 인터랙션(editImg/toggleStatus, 폼 바인딩)→Task 3 Step 4. §6 검증→각 Task + Task 3 Step 7. §7 제외 항목은 정적 처리(탭/⚙/설정 비활성).
- **Placeholder scan:** 없음. SCSS 대용량 3파일은 "시안 파일 복사 + 명시된 1~2줄 수정"으로 구체 지정(플레이스홀더 아님).
- **Type consistency:** 신규 필드 키 9종이 모델(Task 1)·템플릿(Task 3) 일치. 액션명 `editImg`/`toggleStatus`가 시트 actions↔템플릿 data-action 일치. 기존 매핑 필드 경로(`abilities.attack`, `mp.value`, `mabloom`, `rank`, `variableSkill`, `biography`)가 현 모델과 정합. mg-field partial 경로가 preload(Step 2)↔사용(Step 3) 일치. `@use "../theme/vars"` 경로가 각 이식 파일 위치(global/sheet/component → ../theme/vars)에서 정합.
