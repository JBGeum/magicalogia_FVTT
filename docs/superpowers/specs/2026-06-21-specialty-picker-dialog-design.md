# 디자인 스펙 — 지정특기 특기표 picker 다이얼로그

> 날짜: 2026-06-21 · 브랜치 `develop` · 워크플로: brainstorming → **이 spec** → writing-plans → subagent-driven-development

## 1. 배경 / 목표

장서 아이템 시트의 **지정특기** 선택을 개선한다. 현재는 자유텍스트 input + 66개 평면 `datalist`라 목록이 너무 길다. 「표에서 선택」 버튼으로 **6열(영역)×11행(출목) 마법표 그리드 다이얼로그**를 띄워 셀(특기명) 클릭으로 선택한다. 자유텍스트 입력은 유지해 차트에 없는 커스텀 지정특기도 입력 가능하게 한다(직전 기능의 하이브리드 TN 폴백 보존).

## 2. 사용자 결정 사항

1. **선택 UI**: 특기표 다이얼로그(별도 창, 6×11 그리드). 인라인 팝오버/그룹 드롭다운 아님.
2. **자유 입력 유지**: 지정특기 자유텍스트 input + 「표에서 선택」 버튼 병행.
3. **다이얼로그 구현**: 소형 ApplicationV2(`SpecialtyPickerApp`). DialogV2 아님.
4. **datalist 제거**: picker가 발견 UX를 대체하므로 `mg-specialties` datalist 폐기.
5. **이름만 표시**: picker 그리드는 영역/출목 위치의 특기명만(라이브 TN/보유 강조 없음 — 월드 아이템엔 액터 없음). 현재 선택 특기만 `is-selected` 강조.

## 3. 원칙 / 제약

- **데이터 모델 변경 없음**: picker는 기존 `system.skill`(자유 StringField)을 set. 하이브리드 TN(`resolveSpecialtyTn`)·`tn` 폴백 그대로.
- **새 `--mg-*` 토큰 없음**: picker 그리드는 기존 마법표 토큰만 사용(다크/라이트 자동).
- **테마**: picker 루트에 `class="magicalogia"` + `applyTheme(this.element)`로 시트와 동일 다크/라이트 적용.
- **템플릿은 `loadTemplates` 프리로드 등록**(전체 경로).
- **partial/템플릿 경로는 따옴표 전체 경로**.
- **커밋 메시지**: 영어 한 줄 conventional, co-author 없음.
- **검증**: `npm run build` + `npm test`(현재 70 + 신규).

## 4. 변경 단위

### 4.1 그리드 헬퍼 (순수, 단위 테스트) — `module/system/specialty-table.mjs`

- `export function specialtyGrid()` → 행 우선 구조:
  ```js
  MAGICALOGIA.rows.map((num, i) => ({
    num,
    cells: MAGICALOGIA.attributes.map((a) => ({ col: a.key, name: MAGICALOGIA.chart[a.key][i] })),
  }));
  ```
  (열 우선 `chart`를 picker 렌더용 11행×6열로 전치.) 헤더(영역)는 `MAGICALOGIA.attributes`에서.

### 4.2 Picker 앱 — `module/apps/specialty-picker.mjs`(신규)

- `class SpecialtyPickerApp extends HandlebarsApplicationMixin(ApplicationV2)`.
  - `DEFAULT_OPTIONS`: `classes: ["magicalogia", "specialty-picker"]`, `window: { title: "지정특기 선택" }`, `position: { width: "auto" }`, `actions: { pick: SpecialtyPickerApp.#onPick }`.
  - `PARTS`: `{ picker: { template: "systems/magicalogia/templates/apps/specialty-picker.hbs" } }`.
  - 생성자/옵션: `{ current, onPick }` 수용 — `current`(현재 skill 문자열), `onPick(name)`(선택 콜백). 인스턴스에 보관.
  - `_prepareContext`: `{ columns: CONFIG.MAGICALOGIA.attributes, rows: specialtyGrid(), current }`.
  - `#onPick(_event, target)`: `this.onPick?.(target.dataset.skill); this.close();`.
  - `_onRender`: `applyTheme(this.element)`.
- 호출 단순화: 정적 `static open(current, onPick)` 또는 호출 측에서 직접 `new SpecialtyPickerApp({ current, onPick }).render(true)`.

### 4.3 Picker 템플릿 — `templates/apps/specialty-picker.hbs`(신규)

- `<div class="mg-picker">`: 헤더 행(빈 출목칸 + `{{#each columns}}` 영역명) + `{{#each rows}}` (출목 `{{num}}` + `{{#each cells}}` 특기명 셀). 셀 = `<button type="button" class="mg-picker__cell {{#if (eq name ../../current)}}is-selected{{/if}}" data-action="pick" data-skill="{{name}}">{{name}}</button>`. (`eq` 헬퍼 등록됨.)

### 4.4 SCSS — `scss/component/_specialty-picker.scss`(신규) + `scss/magicalogia.scss` `@use`

- `.magicalogia .mg-picker`: 그리드(`grid-template-columns: auto repeat(6, 1fr)`), 영역 골드 헤더(`--mg-head-bg`/`--mg-head-ink`), 출목 열, 셀 버튼(배경 `--mg-field`, hover `--mg-hi`, `is-selected` 골드 보더/배경). 마법표와 동일 룩, 기존 토큰만.
- `scss/magicalogia.scss`에 `@use "component/specialty-picker";` 추가.

### 4.5 시트 배선 — `module/sheets/item-sheet.mjs`, `templates/item/spell-sheet.hbs`

- spell-sheet:
  - 지정특기 input에서 `list="mg-specialties"` 제거; 같은 `mg-ifield` 안에 「표」 버튼 `<button type="button" class="mg-pick-btn" data-action="pick-specialty" title="표에서 선택">⊞</button>` 추가.
  - 하단 `<datalist id="mg-specialties">…</datalist>` 줄 **삭제**.
- item-sheet:
  - `SpecialtyPickerApp` import.
  - `DEFAULT_OPTIONS.actions`에 `"pick-specialty": MagicalogiaItemSheet.#onPickSpecialty` 등록.
  - `#onPickSpecialty()`: `new SpecialtyPickerApp({ current: this.item.system.skill, onPick: (name) => this.item.update({ "system.skill": name }) }).render(true)`.
  - spell 분기에서 `context.specialtyNames = SPECIALTY_NAMES` 줄과 `SPECIALTY_NAMES` import **제거**(datalist 폐기로 불필요). `SPECIALTY_NAMES` export 자체는 specialty-table에 존속(findSpecialtyCoord 이름-고유 불변식 테스트 가드).
- `.mg-pick-btn` SCSS(작은 골드 버튼) — `_item-sheet.scss` 또는 `_specialty-picker.scss`.

### 4.6 프리로드 — `module/helpers/templates.mjs`

- `loadTemplates`에 `"systems/magicalogia/templates/apps/specialty-picker.hbs"` 추가.

## 5. 데이터 흐름 / 상태

- picker → `item.update({"system.skill": name})` → 시트 리렌더(input 갱신). TN은 시전 시 `resolveSpecialtyTn`이 이름으로 차트 매칭(변경 없음).
- 월드/액터 아이템 모두 동작(그리드는 액터 무관 차트 데이터). 액터 보유 시 TN/보유 강조는 **범위 밖**(후속).

## 6. 테스트 / 검증

- `specialtyGrid()` 단위 테스트: 행 11개, 각 행 cells 6개, `rows[0].cells[3] = {col:"song", name:"이야기"}`, `rows[10].cells[5] = {col:"dark", name:"죽음"}`.
- `npm run build`(SCSS @use 컴파일) + `npm test`(70 + 신규) 통과. `template-partials.test`(신규 템플릿 partial 참조 없음)·`theme-tokens.test`(새 토큰 없음) 통과.
- Picker 앱/시트 렌더는 Foundry 의존 → F5 육안: 장서 시트 지정특기 「표」 클릭 → 6×11 그리드 → 셀 클릭 → input에 반영 + 닫힘; 현재 특기 강조; 자유 입력 여전히 가능; 다크/라이트.

## 7. 범위 밖 (별도 후속)

- 액터 보유 시 picker에 라이브 TN/보유 셀 강조.
- 인라인 팝오버 변형.
- actor 시트 등 다른 곳에서의 picker 재사용.
