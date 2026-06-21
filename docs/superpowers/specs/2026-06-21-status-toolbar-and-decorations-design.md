# 디자인 스펙 — 상태이상 영역 재구성 + 라벨 장식 (06210400 잔여 적용)

> 날짜: 2026-06-21 · 브랜치 `develop` · 워크플로: brainstorming → **이 spec** → writing-plans → subagent-driven-development

## 1. 배경 / 목표

새 디자인 핸드오프 `docs/design/06210400/`(README + `styles/magicalogia.css` + `templates/actor-sheet.hbs`)를 현재 구현에 반영한다.

대조 결과 **헤더밴드(README/CHANGES-header.md §1~§5b)는 이미 구현 완료**다 — 4종 골드 타일 통일, select 밑줄형, 라벨 12.5px/700, statrail 순서·`flex:1 0 auto`, `mg-gauge-row`(2fr/1fr), identity-grid `gap:8px 14px`, 마법표 그리드+푸터까지 현재 SCSS/마크업과 일치한다. 따라서 헤더밴드는 **건드리지 않는다.**

남은 차이(= 이번 작업 범위)는 상태이상 영역 레이아웃, 라벨 장식, 마법표 워터마크, 메모 위치다.

### README 모순에 대한 판단

README는 내부 모순이 있다: 상단 ASCII는 `divider + belowgrid(메모+표카드)` 구조(=현재 구현)를 그리지만, §상태이상과 실제 `actor-sheet.hbs`는 `flourish-line + toolbar` 구조를 기술한다. **§Assets에 "divider.png는 현재 시트 본문에선 미사용"이라 명시**되어 있으므로, `flourish-line + toolbar` 레이아웃이 의도된 최종형으로 확정한다. (사용자 승인 완료.)

## 2. 원칙 / 제약 (핸드오프 §함정 준수)

- **데이터 모델 변경 없음.** 시안의 `system.*` 경로는 예시 — 현재 모델로 매핑(`system.biography`, `system.variableSkill`, `system.statuses`, `system.achievement`, `system.mabloom` 등 현행 유지).
- **새 `--mg-*` 토큰 추가 없음.** 모든 새 컴포넌트 규칙은 기존 토큰만 읽는 `.magicalogia` 중첩 SCSS로 작성 → 라이트 테마는 토큰 상속으로 자동 적용. `theme-tokens.test.mjs` 영향 없음.
- ApplicationV2(`ActorSheetV2` + `HandlebarsApplicationMixin`). 액션은 `DEFAULT_OPTIONS.actions`에만 등록된 것이 동작.
- partial 참조는 **전체 경로**(`{{> "systems/magicalogia/templates/..."}}`)만 사용(`template-partials.test.mjs`가 짧은 이름 차단).

## 3. 사용자 결정 사항

1. **상태이상 영역**: 디자인대로 재구성(toolbar + 위/아래 flourish-line + 4×2 그리드, belowgrid 제거).
2. **메모**: 위치는 디자인대로 **정보 탭**으로 이동하되, **prose-mirror 리치텍스트 에디터는 유지**(직전 세션 `9492618` 보존). 일반 textarea(`mg-memo-area`)는 채택하지 않음.
3. **toolbar 버튼**: roll 핸들러(`roll-fate/scene/fumble/event`)는 미구현 → **`data-action` 없이 시각 placeholder**로 렌더(현재 표카드와 동일한 비기능 상태, V2 경고 회피). roll 테이블 연동은 별도 기능으로 분리(범위 밖).
4. **가변특기**: toolbar에선 **표시 전용**(현재 `<input>` 편집 기능 일시 상실). 추후 영역(소속영역 항목) select box로 재설계 예정이므로 유지 불필요(사용자 확인).
5. **공적점/마화 카운터**: 디자인대로 골드 값 + 플로리시 → `mg-counter--muted`(값 색 죽임) 제거.

## 4. 변경 단위

### 4.1 상태이상 영역 (`templates/actor/character-sheet.hbs`, `scss/component/_components.scss`, `scss/sheet/_layout.scss`)

마크업(현재 `mg-divider` + `mg-status` + 하단 `mg-belowgrid` 구간을 교체):

- 헤더밴드 직후 `mg-divider`(divider.png) 제거 → `<div class="mg-hline"><img src="systems/magicalogia/assets/flourish-line.png" alt=""></div>`.
- `mg-status`를 `<div class="mg-statusbar"> … </div>`로 감싸고, 그 안 우측에 `mg-toolbar` 추가:
  - `.mg-toolbtn` 6개(순서: 가변특기 · 운명 변전 · 장면 표 · 펌블 표 · 사건 표 · 주사위).
  - 각 버튼 `<button type="button" class="mg-toolbtn">` (data-action 없음), 내부 `__label` + `__val`.
  - 가변특기 `__val` = `{{#if system.variableSkill}}{{system.variableSkill}}{{else}}노래{{/if}}`, 주사위 `__val` = `{{#if system.dice}}{{system.dice}}{{else}}D6{{/if}}`, 나머지 `__val mg-toolbtn__val--icon`=⚙.
- 상태이상 strip 아래 `mg-hline` 하나 더.
- main 탭 하단 `mg-belowgrid`(메모 + 주사위표 banner + `mg-tables`) **블록 전체 제거**. (메모는 §4.2로 이동, 표는 toolbar로 흡수.)

SCSS:

- `_components.scss` 추가: `.mg-statusbar`{flex; align-items:stretch; gap:8px} + `>.mg-status`{flex:1;min-width:0}; `.mg-toolbar`{flex:none;flex; align-items:stretch; gap:8px}; `.mg-toolbtn`{세로 정렬 버튼, min-width:60px, padding:6px 12px, panel-2 배경, gold 보더, radius, hover 시 hi 배경+inset} + `__label`(10px/700 soft) + `__val`(12px/800 gold) + `__val--icon`(13px); `.mg-hline`{flex center; margin:3px 0} + `img`{width:100%;max-width:580px;opacity:.9}.
- `.mg-status__list`: 기존 `flex-wrap` → `display:grid; grid-template-columns:repeat(4,auto); gap:6px 13px; justify-content:start` (4×2).
- `_components.scss`에서 더 이상 쓰지 않는 `.mg-tables`, `.mg-tablecard*`, `.mg-divider` 규칙 제거. `_layout.scss`에서 `.mg-belowgrid` 규칙 제거.

### 4.2 메모 이동 (`templates/actor/character-sheet.hbs`)

- main 탭의 `.mg-memo`(prose-mirror) 블록을 **정보 탭으로 이동**.
- 정보 탭: 기존 `정 보` 배너 + `mg-info-fields` 아래에 `mg-banner--inline`("메모") + 이동한 `.mg-memo` 블록(prose-mirror 그대로). `system.biography`/`enrichedBiography` 변경 없음.
- 기존 `.mg-memo` SCSS 규칙 유지(재사용). `mg-memo-area` 신규 규칙은 추가하지 않음.

### 4.3 스탯 라벨 FA 아이콘 (`templates/actor/character-sheet.hbs`, `scss/component/_components.scss`)

- 라벨 텍스트 `공격/방어/근원` → `공격력/방어력/근원력`.
- 각 라벨 앞에 `<span class="mg-lbl-ico"><i class="fa-solid fa-khanda"></i></span>` (방어=`fa-shield-halved`, 근원=`fa-hourglass-half`).
- SCSS `.mg-lbl-ico`{inline-flex; align-items:center; color:var(--mg-head-ink)} + `i`{font-size:11px;line-height:1} + `svg`{11×11}. (Foundry V13 FA 네이티브.)

### 4.4 카운터·계제 라벨 플로리시 (`templates/actor/...`, `parts/mg-svg-fleur.hbs` 신규, `module/helpers/templates.mjs`)

- 신규 partial `templates/actor/parts/mg-svg-fleur.hbs` — `docs/design/06210400/templates/partials/mg-svg-fleur.hbs` 내용 이식.
- `module/helpers/templates.mjs` 프리로드 목록에 `systems/magicalogia/templates/actor/parts/mg-svg-fleur.hbs` **전체경로** 추가.
- 공적점·마화 카운터 라벨, 계제 라벨을 `<span class="mg-lbl-fl">{{> "...mg-svg-fleur.hbs"}}</span>텍스트<span class="mg-lbl-fl mg-lbl-fl--r">{{> "...mg-svg-fleur.hbs"}}</span>` 형태로.
- `mg-counter--muted` 제거(골드 값).
- SCSS `.mg-lbl-fl`{inline-flex; align-items:center; color:var(--mg-head-ink); opacity:.75} + `svg`{15×7} + `--r`{transform:scaleX(-1)}.

### 4.5 마법표 워터마크 (`templates/actor/parts/magic-chart.hbs`, `scss/component/_magic-chart.scss`)

- `.mg-chart` 최상단에 `<img class="mg-chart__wm" src="systems/magicalogia/assets/chart-watermark.png" alt="">` 삽입.
- SCSS `.mg-chart`{position:relative}(이미 그러면 유지) + `.mg-chart__wm`{absolute 중앙, width:300px/max 62%, opacity:.07, pointer-events:none, z-index:0} + `.mg-chart__grid`/`.mg-chart__footer`{position:relative; z-index:1}.

### 4.6 에셋 복사

- `docs/design/06210400/assets/`의 `flourish-line.png`, `flourish.png`, `chart-watermark.png` → `assets/`로 복사.
- (`flourish.png`는 마법표 푸터용 — 현재 푸터는 `mg-svg-miniflr` SVG를 쓰므로 즉시 필요하진 않으나, README 자산 목록 완비를 위해 함께 복사.)
- README상 캔버스 생성 임시 자산 → 동일 파일명 덮어쓰기로 추후 교체 가능.

## 5. 데이터 흐름 / 상태

- 모든 변경은 **템플릿 + SCSS + 정적 partial + 정적 에셋**. `_prepareContext`/getData 로직 변경 없음(필요 컨텍스트 `system.variableSkill`, `system.dice`, `statuses`, `enrichedBiography`, `rankTitle`는 이미 제공).
- `system.dice`는 현재 모델에 없을 수 있음 → 템플릿에서 `{{#if}}`로 기본값 `D6` 처리(없으면 그대로 D6 표시). 데이터 모델 미변경.

## 6. 테스트 / 검증

- `npm run build` 통과(SCSS 컴파일).
- `npm test` 56개 통과 유지.
- `template-partials.test.mjs`: `mg-svg-fleur` 전체경로 프리로드 등록으로 통과(미등록 시 차단되므로 회귀 가드 역할).
- `theme-tokens.test.mjs`: 새 토큰 없음 → 자동 통과.
- 육안(F5): 상태이상 4×2 + toolbar 6버튼 + 위/아래 flourish-line, 스탯 FA 아이콘, 카운터/계제 플로리시, 마법표 워터마크, 정보 탭 메모(prose-mirror 편집 동작), 라이트/다크 양쪽.

## 7. 범위 밖 (별도 후속)

- toolbar 버튼 roll 액션(운명변전/장면/펌블/사건 롤테이블) 실제 연동.
- 가변특기 → 영역 항목 select box 재설계.
- divider.png/flourish 임시 자산의 최종 아트 교체.
- 로드맵 잔여: 속성·능력 탭 활성화.
