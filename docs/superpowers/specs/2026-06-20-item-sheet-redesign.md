# 설계 — 아이템 시트 재디자인 (장서·앵커·일반)

> 2026-06-20 · 브랜치 `develop` · 시안 출처: `docs/design/06201857/`(gitignore — `example.html` + `styles/magicalogia-item.css` + `templates/item-{spell,anchor}-sheet.hbs`가 시각·구조 기준).
> 액터 시트 재디자인(S1~S5)과 별개의 아이템 시트 전면 재디자인. 다음 단계는 자체 plan→subagent-driven 사이클.

## 배경

새 핸드오프(`06201857`)가 아이템(Item) 시트의 전면 재디자인을 제공한다. 현재 시트는 단순 폼(`.mg-item-form`/`.mg-item-grid`/`.mg-ifield`/`.mg-icheck`)이고, 새 디자인은 액터 시트와 동일 토큰 체계의 그리모어풍 시트(`.mg-item` 골드 프레임 + `.mg-item__bar` 타이틀바 + sigil 아이콘 + 정돈된 폼 + 골드 배너 디바이더 + 리치 에디터)다.

핸드오프는 장서(spell)·앵커(anchor)만 다루지만, 일관성을 위해 일반(generic) 시트도 동일 `.mg-item` 구조로 적용한다.

## 공통 결정

- **데이터 모델·마이그레이션 변경 없음.** 시안의 `system.*` 경로는 예시이므로 현재 모델 경로에 재바인딩(아래 매핑표).
- **토큰은 우리 `scss/theme/_tokens.scss` 재사용.** 새 `magicalogia-item.css`의 토큰/`.theme-*` 블록은 이식하지 않는다(중복 방지). `.mg-item*` 컴포넌트 규칙만 이식.
- **V1 관용구 → ApplicationV2**: `<form>` 래퍼 제거(루트가 이미 form), `data-toggle` → `data-action`, `.mg-prose__box` 클릭 박스 → V13 `<prose-mirror>` element(이미 도입됨).
- select 옵션은 기존 `{{#each}}` + `selected` helper 유지(작동 검증·cost 매핑 단순). 시안의 `selectOptions` 헬퍼는 미채용.
- 시트 루트 `classes`는 현재대로 `["magicalogia", "sheet", "item"]` 유지(`.mg-item`은 템플릿 내부 div, 새 CSS가 `.magicalogia .mg-item`로 스코프).
- 커밋 메시지: 영어 한 줄, co-author 없음.

## 데이터 경로 매핑 (시안 예시 → 현재 모델)

| 시안 예시 경로                                   | 현재 모델 경로                           | 비고                               |
| ------------------------------------------------ | ---------------------------------------- | ---------------------------------- |
| `name`                                           | `name`                                   | document 이름(이미 input 존재)     |
| `system.type` / `system.skill` / `system.target` | 동일                                     | 장서                               |
| `system.costType` + `system.cost`                | `system.cost.area` + `system.cost.count` | 장서 코스트(SchemaField)           |
| `system.charge` / `system.mod` / `system.effect` | 동일                                     | 장서                               |
| `system.equip` / `system.juju`                   | `system.active` / `system.recite`        | 장서 체크                          |
| `system.fate` / `system.attr`                    | 동일                                     | 앵커                               |
| `system.junga` / `system.suka`                   | `system.encumbrance` / `system.scar`     | 앵커 체크                          |
| `system.setting`                                 | `system.description`                     | 앵커 설정 = description(HTMLField) |
| `system.description`                             | 동일                                     | 장서 서술                          |

select 옵션 소스(기존 config): `spellTypes`(CONFIG.MAGICALOGIA.spellTypes), `costAreas`(CONFIG.MAGICALOGIA.COST_AREAS, `{value,label}`), `anchorAttrs`(CONFIG.MAGICALOGIA.anchorAttrs). item-sheet `_prepareContext`가 이미 제공.

## 변경 파일·내용

### ① `scss/component/_item-sheet.scss` — 전면 재작성

현재 내용(`.mg-item-form`/`.mg-item-grid`/`.mg-ifield`/`.mg-icheck`)을 폐기하고, 새 `magicalogia-item.css`의 `.mg-item*` 규칙을 이식한다(토큰/`.theme-*` 블록 제외). 이식 대상 클래스:

- `.mg-item`(골드 2px + `::before` 안쪽 라인 프레임, `var(--mg-paper)` 배경)
- `.mg-item__bar`(`var(--mg-bar)` + 하단 2px 골드, flex) / `&__sigil`(원형 골드 링 + svg) / `&__name`(골드 잉크, ellipsis)
- `.mg-item__body`(패딩, flex column)
- `.mg-iform`(flex column) / `.mg-irow`(2열 grid) / `.mg-ifield`(라벨+컨트롤 flex) / `&--full`(전폭) / `&__label`(고정폭 라벨) / `&__label--wide`
- `.mg-input` / `.mg-input--name`(골드·굵게) / `.mg-num`(폭 좁힘) / `.mg-select`(appearance none + 캐럿 data-URI, 라이트 캐럿 오버라이드) / `.mg-area`(textarea)
- `.mg-cost`(select + num 인라인)
- `.mg-checkrow`(라벨 flex) / `.mg-check`(골드 채움 토글; `.is-on` 상태) — 액터 시트 `.mg-check`와 시각 일관
- `.mg-idiv`(골드 배너 디바이더) / `&__rule--l/--r`(그라데이션 룰) / `&__label`
- prose-mirror 컨테이너 여백(필요 시 `.mg-item__body prose-mirror` 최소 규칙)

> 정확한 수치·색은 `docs/design/06201857/styles/magicalogia-item.css`의 해당 규칙을 그대로 이식한다(모두 `--mg-*` 토큰 기반).

### ② `templates/item/spell-sheet.hbs` — 새 구조로 재작성

```hbs
<div class="{{cssClass}}">
  <div class="mg-item">
    <div class="mg-item__bar">
      <span class="mg-item__sigil">{{!-- 책 SVG (시안 item-spell-sheet.hbs 인라인) --}}</span>
      <span class="mg-item__name">{{item.name}}</span>
    </div>
    <div class="mg-item__body">
      <div class="mg-iform">
        <div class="mg-ifield mg-ifield--full">
          <span class="mg-ifield__label">이름</span>
          <input class="mg-input mg-input--name" name="name" value="{{item.name}}" placeholder="마법 이름" />
        </div>
        <div class="mg-irow">
          {{!-- 타입(select system.type, spellTypes) / 지정특기(system.skill) / 목표(system.target) --}}
          {{!-- 코스트: .mg-cost > select system.cost.area(costAreas) + input.mg-num system.cost.count --}}
          {{!-- 충전(system.charge, mg-num) / 수정(system.mod, mg-num) --}}
        </div>
        <div class="mg-irow">
          <label class="mg-checkrow"><span class="mg-check {{#if system.active}}is-on{{/if}}" data-action="toggle-field" data-field="system.active">{{#if system.active}}✓{{/if}}</span>장비/유효</label>
          <label class="mg-checkrow"><span class="mg-check {{#if system.recite}}is-on{{/if}}" data-action="toggle-field" data-field="system.recite">{{#if system.recite}}✓{{/if}}</span>주구</label>
        </div>
        <div class="mg-ifield mg-ifield--full">
          <span class="mg-ifield__label">효과</span>
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

- 코스트는 `.mg-cost` 안에 `select name="system.cost.area"`(costAreas 옵션, 기존 `{{#each costAreas}}<option value="{{this.value}}" {{selected (eq ../system.cost.area this.value)}}>{{this.label}}</option>{{/each}}`) + `input.mg-num name="system.cost.count"`.
- type select: `{{#each spellTypes}}<option value="{{this}}" {{selected (eq ../system.type this)}}>{{this}}</option>{{/each}}`(빈 옵션 `—` 포함).
- sigil 책 SVG는 시안 `item-spell-sheet.hbs`의 인라인 SVG를 그대로 사용.

### ③ `templates/item/anchor-sheet.hbs` — 새 구조로 재작성

동일 `.mg-item` 골격. 필드: 이름(name input) / 운명점(`system.fate`, mg-num, 라벨 `--wide`) / 속성(select `system.attr`, anchorAttrs) / 중하(`system.encumbrance`, toggle-field) / 스카(`system.scar`, toggle-field). 디바이더 "설 정" + prose-mirror `system.description`. sigil 닻 SVG(시안 인라인).

체크 예시:

```hbs
<label class="mg-checkrow"><span class="mg-check {{#if system.encumbrance}}is-on{{/if}}" data-action="toggle-field" data-field="system.encumbrance">{{#if system.encumbrance}}✓{{/if}}</span>중하<span class="han">(重荷)</span></label>
<label class="mg-checkrow"><span class="mg-check {{#if system.scar}}is-on{{/if}}" data-action="toggle-field" data-field="system.scar">{{#if system.scar}}✓{{/if}}</span>스카<span class="han">(疵)</span></label>
```

### ④ `templates/item/generic-sheet.hbs` — 새 구조로 재작성

`.mg-item` 골격에 최소 필드: sigil `❖`(범용), 이름(name input), 디바이더 "설 명"(`MAGICALOGIA.item.description` 유지 가능) + prose-mirror `system.description`. 필드 그리드 없음(이름 + 서술만).

### ⑤ `module/sheets/item-sheet.mjs` — toggle-field 액션 신설

`DEFAULT_OPTIONS`에 `actions` 추가(현재 없음):

```js
    actions: {
      "toggle-field": MagicalogiaItemSheet.#onToggleField,
    },
```

핸들러:

```js
  /** 불리언 필드 토글(.mg-check 클릭) — data-field 경로의 boolean 반전. */
  static async #onToggleField(_event, target) {
    const field = target.dataset.field;
    await this.item.update({ [field]: !foundry.utils.getProperty(this.item, field) });
  }
```

(`_prepareContext`의 `enrichedDescription`은 이미 존재 — prose-mirror 내용으로 사용. spellTypes/costAreas/anchorAttrs도 이미 제공.)

## 검증

- `npm run build` 성공 — `.mg-item*` 컴파일, `dist/magicalogia.css` 생성.
- `npm test` 무회귀 — 데이터 모델 변경 없음, 52개 통과 유지.
- **Foundry 실렌더(F5 — 아이템 시트라 서버 재시작 불필요):**
  - 장서·앵커·일반 시트가 골드 프레임 + 타이틀바(sigil + 이름)로 렌더.
  - 장서: 타입/지정특기/목표/코스트(영역+개수)/충전/수정 입력, 장비·주구 체크(클릭 토글), 효과 textarea, 서술 prose-mirror.
  - 앵커: 운명점/속성, 중하·스카 체크, 설정 prose-mirror.
  - 일반: 이름 + 설명 prose-mirror.
  - 체크 클릭 → `.is-on` 골드 채움 토글·저장. 모든 입력 저장·재로드 유지. 캐릭터 시트 장서/관계 행에 이름·값 반영.
  - 다크/라이트 테마 양쪽 가독성.

## 비목표 (후속)

- 데이터 모델 필드 추가/변경(시안 `costType` 등은 기존 경로로 재바인딩만).
- 아이템 타입 신설.
- 캐릭터 시트(액터) 변경.

## 함정 / 참고

- 새 `magicalogia-item.css`의 토큰/`.theme-*` 블록은 이식 금지(우리 `_tokens.scss`와 중복).
- 앵커 "설정"은 별도 필드가 아니라 `system.description`(HTMLField)에 매핑 — 모델 추가 없음.
- 체크가 `<input type=checkbox>`(폼 바인딩)에서 `.mg-check` span + `toggle-field` 액션(DB update)으로 바뀜 — 액터 시트 체크 패턴과 일관.
- prose-mirror element는 이미 액터 메모/아이템 description에 도입돼 동작 확인됨.
- `docs/design/`은 gitignore — 새 SCSS는 이식으로 시스템에 들여와야 배포 포함.
