# Stage 4 (탭 재편 + 정보 탭 + 아코디언) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캐릭터 시트의 탭을 `캐릭터 시트 / 정보 / 속성·능력(비활성)` 3탭으로 재편하고, 장서·관계를 접이식 아코디언으로 내리며, 정보 탭(플레이어/신분/성별/연령)을 신설한다.

**Architecture:** 데이터 모델은 변경하지 않는다(필드 이미 존재). 변경 범위는 SCSS 1개 + 시트 클래스(`actor-sheet.mjs`) + 템플릿(`character-sheet.hbs`). 아코디언 펼침 상태는 시트 인스턴스 멤버(`this._accOpen`)로 보관하고 `_onRender`에서 복원해 `submitOnChange` 리렌더를 견딘다. partial(`grimoire.hbs`/`relations.hbs`/`mg-field.hbs`)은 전부 기존 것을 재사용한다.

**Tech Stack:** Foundry VTT ApplicationV2(`HandlebarsApplicationMixin`/`ActorSheetV2`), Handlebars, SCSS(Vite 빌드), Node 테스트(vitest 계열, `npm test`).

## Global Constraints

- 데이터 모델·마이그레이션 변경 금지 — `system.player`/`socialStatus`/`gender`/`age`는 이미 `module/data/actors/character.mjs`에 존재.
- 신규 partial 생성 금지 — 기존 partial 재사용, `loadTemplates`(`module/helpers/templates.mjs`) 변경 없음.
- V1 관용구(`data-acc-toggle` + JS classList) → ApplicationV2 `data-action`으로 변환.
- 커밋 메시지: 영어 한 줄, co-author 없음.
- 각 task 종료 시 시트가 정상 렌더되는 상태를 유지(중간 상태 무손상).
- 검증 방식: 이 프로젝트엔 시트 UI 단위테스트 인프라가 없다(데이터 모델 테스트만 존재). 따라서 각 task의 test cycle은 **`npm run build` 성공 + `npm test` 48개 무회귀 + 명시된 육안 포인트**다. SCSS/템플릿/시트 변경이라 모델 테스트에 영향 없어야 한다.
- 커밋 시 lint-staged(prettier)가 md·SCSS·hbs를 자동 정렬하는 것은 정상.

---

## File Structure

- **Modify** `scss/component/_components.scss` — 아코디언(`.mg-accordion*`) + 정보 필드 래퍼(`.mg-info-fields`) 스타일 추가. (Task 1)
- **Modify** `module/sheets/actor-sheet.mjs` — `static TABS`, `actions`, `context.tabs`, 아코디언 토글 핸들러, `_onRender` 복원 로직. (Task 2·3)
- **Modify** `templates/actor/character-sheet.hbs` — `<nav>` 탭 재편, 아코디언 2개 삽입, 기존 grimoire/relations 탭 div 제거, 정보 탭 div 신설. (Task 2·3)

기존 검증 참고:

- `.mg-tab-content > .tab.active { display: flex; flex-direction: column }` (`scss/sheet/_sheet.scss:33`) — 정보 탭의 banner+fields 세로 배치가 자동으로 맞음.
- `.mg-panel-body--pad { padding: 18px }` (`scss/global/_base.scss:202`) — 이미 존재, 재정의 불필요.
- 토큰 `--mg-bar`/`--mg-bar-ink`/`--mg-gold`/`--mg-paper` 모두 `scss/theme/_tokens.scss`에 존재.

---

## Task 1: 아코디언·정보 필드 SCSS

**Files:**

- Modify: `scss/component/_components.scss` (`.mg-banner` 블록 뒤, 약 522라인 이후 같은 들여쓰기 레벨에 추가)

**Interfaces:**

- Consumes: 토큰 `--mg-gold`/`--mg-bar`/`--mg-bar-ink`/`--mg-paper`, 변수 `$mg-font-display`(파일 상단에서 이미 import됨 — `.mg-banner__label`이 사용 중).
- Produces: CSS 클래스 `.mg-accordion`, `.mg-accordion__head`, `.mg-accordion__caret`, `.mg-accordion__title`, `.mg-accordion__count`, `.mg-accordion__body`, `.mg-accordion.is-open`(caret 회전·body 표시), `.mg-info-fields`. Task 2·3의 템플릿이 이 클래스들을 사용.

- [ ] **Step 1: 아코디언 + 정보 필드 스타일 추가**

`scss/component/_components.scss`에서 `.mg-banner` 관련 블록(`.mg-banner--inline ...`로 끝나는 부분, 약 523~525라인) 다음, 바깥 셀렉터(`.magicalogia` 등 파일 최상위 래퍼) 안쪽 같은 들여쓰기 레벨에 아래 블록을 추가한다. (이 파일은 클래스들이 평면적으로 나열되는 패턴이므로 동일하게 평면으로 추가한다.)

```scss
// ---- Accordion (캐릭터 시트 하단 장서/관계 접이식) ----
.mg-accordion {
  border: 1px solid var(--mg-gold);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 2px;
}
.mg-accordion + .mg-accordion {
  margin-top: 8px;
}
.mg-accordion__head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 13px;
  background: var(--mg-bar);
  color: var(--mg-bar-ink);
  cursor: pointer;
  user-select: none;
}
.mg-accordion__caret {
  color: var(--mg-gold);
  font-size: 11px;
  transition: transform 0.18s ease;
}
.mg-accordion.is-open .mg-accordion__caret {
  transform: rotate(90deg);
}
.mg-accordion__title {
  font-family: $mg-font-display;
  font-weight: 800;
  font-size: 13.5px;
  letter-spacing: 0.1em;
  white-space: nowrap;
}
.mg-accordion__count {
  margin-left: auto;
  color: var(--mg-gold);
  opacity: 0.8;
  font-size: 11px;
}
.mg-accordion__body {
  display: none;
  padding: 12px 13px;
  background: var(--mg-paper);
}
.mg-accordion.is-open .mg-accordion__body {
  display: block;
}

// ---- 정보 탭 필드 래퍼 ----
.mg-info-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 420px;
}
```

> 주의: `$mg-font-display`가 이 파일 스코프에서 안 보이면(`@use`로 분리된 경우) `.mg-banner__label`이 같은 변수를 쓰고 있으니 동일 방식으로 참조하면 된다 — 빌드 에러가 나면 `.mg-banner__label`의 `font-family` 선언을 그대로 모방한다.

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: 에러 없이 성공, `dist/magicalogia.css` 갱신. (이 시점엔 어떤 템플릿도 아직 이 클래스를 안 쓰므로 시각 변화 없음 — 빌드 통과만 확인.)

- [ ] **Step 3: 커밋**

```bash
git add scss/component/_components.scss
git commit -m "feat: add accordion and info-fields styles for stage 4"
```

---

## Task 2: 탭 재편 + 장서·관계 아코디언

`캐릭터 시트` 탭만 활성으로 두고(정보·속성은 비활성 placeholder), 장서·관계 탭을 제거해 캐릭터 시트 하단 아코디언으로 옮긴다. 정보 탭 활성화는 Task 3에서 한다.

**Files:**

- Modify: `module/sheets/actor-sheet.mjs` (`static TABS` 35-44, `actions` 20-32, `context.tabs` 126-141, 핸들러 추가, `_onRender` 230-245)
- Modify: `templates/actor/character-sheet.hbs` (`<nav>` 16-22, mg-shared 뒤 삽입, grimoire/relations 탭 div 182-188 제거)

**Interfaces:**

- Consumes: Task 1의 `.mg-accordion*` 클래스. context의 `spells`/`anchors` 배열(이미 `_prepareContext`가 생성, `.length` 사용).
- Produces: `data-action="toggle-accordion"` + `data-acc="grimoire|relations"` DOM, 인스턴스 멤버 `this._accOpen = { grimoire, relations }`, 정적 핸들러 `#onToggleAccordion`.

- [ ] **Step 1: `static TABS`에서 grimoire/relations 제거 (info는 아직 미추가)**

`module/sheets/actor-sheet.mjs` 35-44라인을 교체:

```js
  static TABS = {
    primary: {
      tabs: [{ id: "main", label: "캐릭터 시트" }],
      initial: "main",
    },
  };
```

- [ ] **Step 2: `actions`에 toggle-accordion 추가**

`module/sheets/actor-sheet.mjs`의 `actions` 객체에서 `"toggle-scar": ...` 줄(31라인) 다음에 추가:

```js
      "toggle-scar": MagicalogiaActorSheet.#onToggleScar,
      "toggle-accordion": MagicalogiaActorSheet.#onToggleAccordion,
```

- [ ] **Step 3: `context.tabs`를 main만 남기도록 축소**

`module/sheets/actor-sheet.mjs` 126-141라인을 교체:

```js
const activeTab = this.tabGroups.primary ?? "main";
context.tabs = {
  main: { id: "main", group: "primary", label: "캐릭터 시트", active: activeTab === "main" },
};
```

- [ ] **Step 4: 아코디언 토글 핸들러 추가**

`module/sheets/actor-sheet.mjs`의 `#onToggleTrueForm` 메서드(223-227라인) 닫는 `}` 다음에 새 메서드 추가:

```js
  /** 장서/관계 아코디언 펼침 토글 — 인스턴스 상태로 보관(리렌더 견딤, 저장 안 함). */
  static async #onToggleAccordion(_event, target) {
    const key = target.dataset.acc; // "grimoire" | "relations"
    this._accOpen ??= { grimoire: false, relations: false };
    this._accOpen[key] = !this._accOpen[key];
    this.render();
  }
```

- [ ] **Step 5: `_onRender`에 아코디언 펼침 복원 추가**

`module/sheets/actor-sheet.mjs`의 `_onRender`(230-245라인)에서 기존 `for (const sel of [...])` 루프 **뒤**, 메서드 닫는 `}` 직전에 추가:

```js
this._accOpen ??= { grimoire: false, relations: false };
for (const key of ["grimoire", "relations"]) {
  this.element
    .querySelector(`[data-acc="${key}"]`)
    ?.closest(".mg-accordion")
    ?.classList.toggle("is-open", this._accOpen[key]);
}
```

- [ ] **Step 6: `<nav>` 탭 재편 (정보·속성은 비활성)**

`templates/actor/character-sheet.hbs` 16-22라인을 교체:

```hbs
    <nav class="mg-tabs tabs" data-group="primary">
      <a class="mg-tab {{#if tabs.main.active}}active{{/if}}" data-action="tab" data-group="primary" data-tab="main">캐릭터 시트</a>
      <a class="mg-tab is-disabled" title="준비 중">정보</a>
      <a class="mg-tab is-disabled" title="준비 중">속성·능력</a>
    </nav>
```

- [ ] **Step 7: mg-shared 뒤에 아코디언 2개 삽입**

`templates/actor/character-sheet.hbs`에서 mg-shared 닫는 `</div>`(179라인)와 main 탭 div 닫는 `</div>`(180라인) 사이에 삽입:

```hbs
        </div>

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
      </div>
```

(위 블록의 첫 `</div>`는 기존 mg-shared 닫기, 마지막 `</div>`는 기존 main 탭 div 닫기다 — 그 사이에 아코디언 2개가 들어간다.)

- [ ] **Step 8: 기존 grimoire/relations 탭 div 제거**

`templates/actor/character-sheet.hbs`에서 아래 블록(grimoire/relations 탭, 약 182-188라인)을 통째로 삭제:

```hbs
      <div class="tab mg-panel-body {{#if tabs.grimoire.active}}active{{/if}}" data-tab="grimoire" data-group="primary">
        {{> "systems/magicalogia/templates/actor/parts/grimoire.hbs"}}
      </div>

      <div class="tab mg-panel-body {{#if tabs.relations.active}}active{{/if}}" data-tab="relations" data-group="primary">
        {{> "systems/magicalogia/templates/actor/parts/relations.hbs"}}
      </div>
```

삭제 후 main 탭 div 닫힘 다음 곧바로 `</section>`이 와야 한다.

- [ ] **Step 9: 빌드·테스트 검증**

Run: `npm run build`
Expected: 에러 없이 성공.

Run: `npm test`
Expected: 48개 통과(무회귀). 모델/판정 변경 없음.

- [ ] **Step 10: 커밋**

```bash
git add module/sheets/actor-sheet.mjs templates/actor/character-sheet.hbs
git commit -m "feat: move grimoire and relations into collapsible accordions"
```

**육안 검증(서버 재시작 후 — `static TABS` 변경이라 F5로 부족할 수 있음):**

- 탭이 `캐릭터 시트 / 정보(비활성) / 속성·능력(비활성)`로 표시.
- 캐릭터 시트 하단에 장서·관계 아코디언 2개. head 클릭 → 펼침/접힘, caret 90° 회전, count(`N권`/`N명`) 정확.
- 아코디언을 펼친 뒤 임의 필드(예: 마법명) 수정 → 리렌더돼도 펼침 유지.
- 장서/관계 행 더블클릭(아이템 시트 열기)·우클릭(삭제 메뉴) 정상. 장서 `＋` 추가, 관계 `＋` 추가, "의무" 입력 보존.

---

## Task 3: 정보 탭 신설

`정보` 탭을 활성화하고 플레이어/신분/성별/연령 입력 UI를 추가한다.

**Files:**

- Modify: `module/sheets/actor-sheet.mjs` (`static TABS`, `context.tabs`)
- Modify: `templates/actor/character-sheet.hbs` (`<nav>` 정보 탭, 정보 탭 div 신설)

**Interfaces:**

- Consumes: `mg-field.hbs` partial(시그니처: `label`, `name`, `value`, 선택 `fieldClass`/`valueClass`). `system.player`/`socialStatus`/`gender`/`age`. Task 1의 `.mg-info-fields`. `.mg-panel-body--pad`(기존).
- Produces: 활성 탭 `info`.

- [ ] **Step 1: `static TABS`에 info 추가**

`module/sheets/actor-sheet.mjs`의 `static TABS`(Task 2에서 main만 남긴 상태)를 교체:

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

- [ ] **Step 2: `context.tabs`에 info 추가**

`module/sheets/actor-sheet.mjs`의 `context.tabs`(Task 2에서 main만 남긴 상태)를 교체:

```js
const activeTab = this.tabGroups.primary ?? "main";
context.tabs = {
  main: { id: "main", group: "primary", label: "캐릭터 시트", active: activeTab === "main" },
  info: { id: "info", group: "primary", label: "정보", active: activeTab === "info" },
};
```

- [ ] **Step 3: `<nav>`에서 정보 탭 활성화**

`templates/actor/character-sheet.hbs`의 정보 탭 링크(Task 2에서 `is-disabled`로 둔 것)를 교체:

```hbs
      <a class="mg-tab {{#if tabs.info.active}}active{{/if}}" data-action="tab" data-group="primary" data-tab="info">정보</a>
```

(`속성·능력`은 `is-disabled` 유지.)

- [ ] **Step 4: 정보 탭 div 신설**

`templates/actor/character-sheet.hbs`에서 main 탭 div 닫힘(아코디언 포함) 다음, `</section>` 앞에 추가:

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

- [ ] **Step 5: 빌드·테스트 검증**

Run: `npm run build`
Expected: 에러 없이 성공.

Run: `npm test`
Expected: 48개 통과(무회귀).

- [ ] **Step 6: 커밋**

```bash
git add module/sheets/actor-sheet.mjs templates/actor/character-sheet.hbs
git commit -m "feat: add info tab with player and identity fields"
```

**육안 검증(서버 재시작 후):**

- 탭 `캐릭터 시트 / 정보 / 속성·능력(비활성)`. 정보 탭 클릭 시 전환.
- 정보 탭: "정 보" 배너 + 플레이어/신분/성별/연령 입력 4개(세로 정렬, max-width 420px).
- 각 값 입력 → 저장·재로드 후 유지(`system.player` 등 정상 바인딩).
- 캐릭터 시트 탭으로 복귀 시 헤더밴드·상태칩·마법표·메모·아코디언 무손상.

---

## Self-Review

**1. Spec coverage:**

- 탭 재편(`main/info/속성`) → Task 2(나브 골격·main) + Task 3(info 활성). ✓
- 장서·관계 아코디언 이동 → Task 2 Step 7·8. ✓
- 아코디언 상태 인스턴스 멤버 보관 → Task 2 Step 4·5. ✓
- 정보 탭(player/socialStatus/gender/age) → Task 3 Step 4. ✓
- SCSS `.mg-accordion*` 이식 + `.mg-info-fields` → Task 1. ✓
- 모델 변경 없음·partial 재사용·`loadTemplates` 무변경 → Global Constraints + 각 task가 준수. ✓
- "의무"(`system.mission`) 보존 → `relations.hbs` 통째 재사용(Task 2 Step 7), 육안 검증 항목 포함. ✓
- 서버 재시작 권장 → Task 2·3 육안 검증 주석. ✓

**2. Placeholder scan:** TBD/TODO/"적절히 처리" 없음. 모든 코드 step에 완전한 코드 블록 포함. ✓

**3. Type consistency:**

- `this._accOpen` 형태 `{ grimoire, relations }` — Task 2 Step 4·5에서 동일. ✓
- `data-acc` 값 `"grimoire"`/`"relations"` — 핸들러 `target.dataset.acc`, `_onRender` 루프 키, 템플릿 `data-acc` 일치. ✓
- 액션명 `"toggle-accordion"` — `actions` 등록(Step 2)과 템플릿 `data-action`(Step 7) 일치. ✓
- `context.tabs.info.active` — Task 3 context(Step 2)와 템플릿(Step 3·4) 일치. ✓
- partial 인자 `label`/`name`/`value` — `mg-field.hbs` 시그니처와 일치. ✓
