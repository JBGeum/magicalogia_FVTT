# 설계 — Stage 4 (탭 재편 + 정보 탭 + 장서·관계 아코디언)

> 2026-06-20 · 브랜치 `develop` · 시안 출처: `docs/design/new/`(gitignore — `example.html` + `styles/magicalogia.css`가 시각 기준).
> 로드맵의 S4. S1~S3는 완료·푸시됨(`7ac679a`). 이 문서 = S4 상세 설계. 다음 단계는 자체 plan→subagent-driven 사이클.

## 배경

새 시안은 탭 구조를 단순화한다. 현재 시트의 5탭(`캐릭터 시트 / 장서 / 관계 / 개요·정보(비활성) / 속성·능력(비활성)`)을 **3탭(`캐릭터 시트(main) / 정보(info) / 속성·능력(비활성)`)** 으로 재편하고, 장서·관계는 별도 탭 대신 캐릭터 시트 하단의 **접이식 아코디언**으로 내린다. 정보 탭은 플레이어/신분/성별/연령 입력 UI를 신설한다.

데이터 모델은 변경하지 않는다. `player` / `socialStatus` / `gender` / `age` 필드는 이미 `module/data/actors/character.mjs`에 존재한다(S1 매핑표 참조). 따라서 S4는 **템플릿 + 시트 클래스 + SCSS 변경**으로 한정된다.

## 공통 결정 (로드맵에서 상속)

- 데이터 모델 유지 + 템플릿 재바인딩(마이그레이션 없음).
- V1 관용구(`data-acc-toggle` + JS classList) → ApplicationV2 `data-action`으로 변환.
- partial은 **기존 것 재사용** — `grimoire.hbs` / `relations.hbs` / `mg-field.hbs`는 신규 생성 없이 그대로 사용. 신규 partial 없으므로 `loadTemplates` 추가 등록 불필요.
- 커밋 메시지: 영어 한 줄, co-author 없음.

## 핵심 결정 — 아코디언 펼침 상태 처리

시트는 `submitOnChange: true`라서 입력 변경 시마다 전체가 리렌더된다. 시안의 단순 `classList.toggle`(UI-only) 방식은 아코디언을 펼친 채 다른 필드를 수정하면 리렌더로 다시 접혀버려 UX가 나쁘다.

**결정: 인스턴스 멤버로 보관 + `_onRender`에서 복원** (Foundry `tabGroups` 패턴과 동일).

- `this._accOpen ??= { grimoire: false, relations: false }` — 시트 인스턴스 상태로 보관.
- 토글 액션이 `this._accOpen[k]`를 뒤집고 `this.render()` 호출.
- `_onRender`에서 `this._accOpen` 기준으로 각 아코디언에 `is-open` 클래스를 부여/제거.
- 효과: 입력을 수정해 리렌더돼도 펼침 상태 유지. DB write 없음. 시트를 닫으면 초기화(기본 접힘).

대안 비교:

| 방식                 | 리렌더 견딤 | 새로고침 후 유지 | 비용              | 채택            |
| -------------------- | ----------- | ---------------- | ----------------- | --------------- |
| 인스턴스 멤버        | O           | X                | 없음              | **채택**        |
| actor flag 영구 저장 | O           | O                | 토글마다 DB write | 미채택(과함)    |
| UI-only classList    | X           | X                | 없음              | 미채택(UX 불량) |

## 변경 파일·내용

### ① `module/sheets/actor-sheet.mjs`

**(a) `static TABS`** — `primary.tabs` 배열을 재편:

```js
static TABS = {
  primary: {
    tabs: [
      { id: "main", label: "캐릭터 시트" },
      { id: "info", label: "정보" },
    ],
    initial: "main",
  },
};
```

(`grimoire` / `relations` 제거, `info` 추가.)

**(b) `static DEFAULT_OPTIONS.actions`** — 아코디언 토글 액션 추가:

```js
"toggle-accordion": MagicalogiaActorSheet.#onToggleAccordion,
```

**(c) `_prepareContext`의 `context.tabs`** — `grimoire` / `relations` 객체 제거, `info` 추가. `main`은 유지. `activeTab` 비교 대상도 `main` / `info`로 정리.

```js
const activeTab = this.tabGroups.primary ?? "main";
context.tabs = {
  main: { id: "main", group: "primary", label: "캐릭터 시트", active: activeTab === "main" },
  info: { id: "info", group: "primary", label: "정보", active: activeTab === "info" },
};
```

**(d) 아코디언 상태 + 토글 핸들러:**

```js
/** 장서/관계 아코디언 펼침 토글 — 인스턴스 상태로 보관(리렌더 견딤, 저장 안 함). */
static async #onToggleAccordion(_event, target) {
  const key = target.dataset.acc; // "grimoire" | "relations"
  this._accOpen ??= { grimoire: false, relations: false };
  this._accOpen[key] = !this._accOpen[key];
  this.render();
}
```

**(e) `_onRender`** — 기존 더블클릭/컨텍스트메뉴 등록 뒤에 아코디언 `is-open` 복원 추가:

```js
this._accOpen ??= { grimoire: false, relations: false };
for (const key of ["grimoire", "relations"]) {
  this.element
    .querySelector(`[data-acc="${key}"]`)
    ?.closest(".mg-accordion")
    ?.classList.toggle("is-open", this._accOpen[key]);
}
```

> 기존 `_onRender`의 더블클릭(시트 열기)·우클릭(삭제) 컨텍스트메뉴는 selector(`.mg-grimoire .mg-table__row` / `.mg-relations .mg-table__row`)가 아코디언 내부에서도 그대로 매칭되므로 변경 없이 동작 유지.

### ② `templates/actor/character-sheet.hbs`

**(a) `<nav class="mg-tabs">`** — 탭 링크 3개로 교체:

```hbs
<nav class="mg-tabs tabs" data-group="primary">
  <a class="mg-tab {{#if tabs.main.active}}active{{/if}}" data-action="tab" data-group="primary" data-tab="main">캐릭터 시트</a>
  <a class="mg-tab {{#if tabs.info.active}}active{{/if}}" data-action="tab" data-group="primary" data-tab="info">정보</a>
  <a class="mg-tab is-disabled" title="준비 중">속성·능력</a>
</nav>
```

**(b) main 탭 — `mg-shared` 블록 닫힘 직후**에 아코디언 2개 삽입(여전히 `data-tab="main"` div 안):

```hbs
<div class="mg-accordion">
  <div class="mg-accordion__head" data-action="toggle-accordion" data-acc="grimoire">
    <span class="mg-accordion__caret">▸</span>
    <span class="mg-accordion__title">장서</span>
    <span class="mg-accordion__count">{{spells.length}}권</span>
  </div>
  <div class="mg-accordion__body">
    {{> "systems/magicalogia/templates/actor/parts/grimoire.hbs"}}
  </div>
</div>
<div class="mg-accordion">
  <div class="mg-accordion__head" data-action="toggle-accordion" data-acc="relations">
    <span class="mg-accordion__caret">▸</span>
    <span class="mg-accordion__title">관계</span>
    <span class="mg-accordion__count">{{anchors.length}}명</span>
  </div>
  <div class="mg-accordion__body">
    {{> "systems/magicalogia/templates/actor/parts/relations.hbs"}}
  </div>
</div>
```

**(c) 기존 `grimoire` / `relations` 탭 `<div>` 2개 제거** (현재 파일 182~188라인).

**(d) `</section>` 앞에 정보 탭 `<div>` 신설:**

```hbs
<div class="tab mg-panel-body--pad {{#if tabs.info.active}}active{{/if}}" data-tab="info" data-group="primary">
  <div class="mg-banner" style="margin-bottom: 4px">
    <span class="mg-banner__rule mg-banner__rule--l"></span>
    <span class="mg-banner__label">정 보</span>
    <span class="mg-banner__rule mg-banner__rule--r"></span>
  </div>
  <div class="mg-info-fields">
    {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="플레이어" name="system.player" value=system.player}}
    {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="신분" name="system.socialStatus" value=system.socialStatus}}
    {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="성별" name="system.gender" value=system.gender}}
    {{> "systems/magicalogia/templates/actor/parts/mg-field.hbs" label="연령" name="system.age" value=system.age}}
  </div>
</div>
```

> 시안은 인라인 `padding:18px` + `max-width:420px`을 썼으나, 일관성을 위해 `mg-panel-body--pad` 클래스와 `.mg-info-fields` 래퍼 클래스로 SCSS에서 처리.

### ③ `scss/component/_components.scss` — 아코디언 + 정보 필드

시안 `docs/design/new/styles/magicalogia.css`의 `.mg-accordion*` 블록을 이식(SCSS 중첩으로 정리):

- `.mg-accordion`: `border: 1px solid var(--mg-gold)`, `border-radius: 3px`, `overflow: hidden`, `margin-top: 2px`. 인접 형제 `& + & { margin-top: 8px }`.
- `&__head`: `background: var(--mg-bar)`, `color: var(--mg-bar-ink)`, `cursor: pointer`, flex 정렬, `gap: 9px`, `padding: 8px 13px`, `user-select: none`.
- `&__caret`: `color: var(--mg-gold)`, `font-size: 11px`, `transition: transform .18s ease`.
- `&.is-open &__caret`: `transform: rotate(90deg)`.
- `&__title`: `letter-spacing: .1em`, `font-weight: 800`, `font-size: 13.5px`(폰트는 토큰 상속).
- `&__count`: `color: var(--mg-gold)`, `opacity: .8`, `font-size: 11px`, `margin-left: auto`.
- `&__body`: `display: none`, `padding: 12px 13px`, `background: var(--mg-paper)`.
- `&.is-open &__body`: `display: block`.
- `.mg-info-fields`: `display: flex; flex-direction: column; gap: 8px; max-width: 420px`.

(`mg-panel-body--pad`가 기존에 없으면 `padding: 18px` 정도로 정의 — 시안 정보 탭 패딩 대응.)

## 검증

- `npm run build` 성공(SCSS 에러 없음, `dist/magicalogia.css` 생성).
- `npm test` 무회귀 — 데이터 모델·판정 로직 변경 없음, 48 통과 유지.
- **Foundry 실렌더(서버 재시작 권장):** `static TABS`는 시트 클래스 정의 변경이라 F5(모듈 재로드)로 부족할 수 있음. 재시작 후 확인:
  - 탭이 `캐릭터 시트 / 정보 / 속성·능력(비활성)` 3개로 표시.
  - 캐릭터 시트 하단에 장서·관계 아코디언 2개. head 클릭 시 펼침/접힘, caret 90° 회전, count(N권/N명) 정확.
  - **아코디언을 펼친 뒤 임의 필드를 수정** → 리렌더돼도 펼침 유지(인스턴스 멤버 검증).
  - 장서/관계 행 더블클릭(아이템 시트 열기)·우클릭(삭제 메뉴) 정상.
  - 정보 탭: 플레이어/신분/성별/연령 입력 → 저장·재로드 후 값 유지.
  - 기존 캐릭터 시트(헤더밴드·상태칩·마법표·메모·표) 무손상.

## 비목표 (후속)

- 속성·능력 탭 활성화(별도 작업).
- 라이트 테마(S5).
- 아코디언 펼침 상태의 영구 저장(actor flag) — 현재 범위 아님.

## 함정 / 참고

- `static TABS` 변경 → 서버 재시작 필요할 수 있음(핸드오프 §5).
- partial은 모두 기존 등록분 재사용 — `loadTemplates` 변경 없음.
- `docs/design/`은 gitignore — 시안 CSS는 SCSS로 이식해 시스템에 들여와야 배포 포함.
- 이전 `relations` 탭에 있던 "의무"(`system.mission`) 입력은 `relations.hbs` partial 내부에 포함되어 있으므로 아코디언으로 함께 이동(누락 주의 — partial 통째 재사용이라 자동 보존).
- 커밋 후 lint-staged(prettier)가 md·SCSS·hbs 자동 정렬(정상).
