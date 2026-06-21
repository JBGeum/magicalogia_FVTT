# 디자인 스펙 — 장서(주문) 시전 채팅 카드

> 날짜: 2026-06-21 · 브랜치 `develop` · 워크플로: brainstorming → **이 spec** → writing-plans → subagent-driven-development
> 시각 기준: `docs/design/06211530/`(README + `example-spell.html` + `styles/magicalogia-spellcard.css` + `templates/chat-spell-card.hbs` + `scripts/chat-card-helpers.js`)

## 1. 배경 / 목표

그리모어(장서)를 채팅에 **시전 카드**로 출력한다. 카드는 이전 세션의 판정 카드와 **동일 `.mg-card` 통일 양식**을 쓰고, 본문에 장서 정보 + 지정특기 명중 판정(+마소) + (디자인만) 대미지/회복 블록을 담는다.

지정특기의 목표치(TN)는 **마법표와 하이브리드 링크**한다: 지정특기 이름이 차트 특기와 일치하면 시전 액터의 `computeTable`에서 **라이브 TN**을 가져오고(특기표 셀과 동일), 미매칭이거나 보유특기가 없어 TN을 못 구하면 **수동 목표값으로 폴백**한다.

## 2. 사용자 결정 사항

1. **시전 트리거**: 그리모어 행. (아이템 시트 버튼 아님.)
2. **명중 판정 TN**: 차트 링크 + 수동 폴백(하이브리드).
3. **지정특기 입력**: `skill` 자유텍스트 유지 + 시트에 **차트 66특기 datalist** 자동완성. 이름이 차트와 일치 → 링크.
4. **TN 못 구하면**: 경고 후 시전 중단(특기표 판정과 동일 UX). 단 수동 폴백 기본값이 있어 실무상 거의 발생 안 함.
5. **대미지/회복 블록**: 템플릿 `{{#if damage}}` + CSS만(디자인). `castSpell`은 `damage` 미전달 → 미표시. `roll-damage` 리스너 미연결(YAGNI).

## 3. 원칙 / 제약 (핸드오프 §함정 준수)

- **데이터 모델**: spell에 `tn`(수동 폴백 목표값) **한 필드만** 추가. `skill`/`type`/`target`/`cost`/`effect` 등 기존 유지.
- **새 색 토큰은 다크+라이트 양쪽 정의**. 대미지 회복(heal) 변형이 쓰는 `--mg-good`/`--mg-good-bg`/`--mg-good-line`를 `_tokens.scss` **양쪽**에 추가(없으면 `theme-tokens.test.mjs` 완전성 실패). 그 외 새 토큰 없음.
- **판정 블록은 기존 판정 카드와 동일 마크업 재사용**: `.mg-roll-title`/`.mg-roll-dice`(+`.mg-roll-eq`/`.mg-roll-sum`/`.mg-roll-detail`)/`.mg-outcome`(스페셜!/펌블!)/`.mg-note`. 디자인 CSS의 `.mg-die-wrap`/`.mg-die-num`/`.mg-roll-op`/`.mg-roll-label` 변형은 **이식하지 않음**(통일 유지, 신규 CSS 최소화).
- **partial/템플릿 참조는 전체 경로**, 채팅 템플릿은 `loadTemplates` 프리로드 등록.
- **카드 테마**: 라이트 고정(`class="magicalogia theme-light"`) — 기존 판정 카드와 동일(메시지 content라 보는 이별 전환 불가).
- **커밋 메시지**: 영어 한 줄 conventional, co-author 없음.
- **검증**: `npm run build` + `npm test`(현재 56 + 신규 통과).

## 4. 재사용 (이전 세션 판정 카드)

- `module/system/specialty-roll.mjs`: `renderDie(value, match)`, `classifyRoll(d1,d2,tn)` → 그대로 import.
- `scss/component/_chat-card.scss`: `.mg-card`/`__head`/`__sigil`/`__who`/`__body`, `.mg-roll-*`, `.mg-die`, `.mg-outcome`, `.mg-note` → 그대로 재사용.
- `module/system/specialty-table.mjs`: `computeTable(state)` → TN 산출에 재사용.
- maso 매핑: `CONFIG.MAGICALOGIA.attributes[d1-1].title`.
- `eq` 핸들바 헬퍼: 이미 등록됨(`registerHandlebarsHelpers`).

## 5. 변경 단위

### 5.1 데이터 모델 (`module/data/items/spell.mjs`)

- `tn: new fields.NumberField({ initial: 5, min: 2, integer: true })` 추가(수동 폴백 목표값). `skill` 등 유지.

### 5.2 아이템 시트 (`templates/item/spell-sheet.hbs`, `module/sheets/item-sheet.mjs`)

- 지정특기 input에 `list="mg-specialties"` + `<datalist id="mg-specialties">{{#each specialtyNames}}<option value="{{this}}">{{/each}}</datalist>`.
- `mg-irow`에 「목표값」 number 입력(`name="system.tn"`, min 2) 추가.
- item-sheet `_prepareContext`(spell 분기)에 `context.specialtyNames = CONFIG.MAGICALOGIA의 차트 66특기 평면 목록`.

### 5.3 차트 링크/TN 해석 (순수 함수 — 단위 테스트)

- `module/system/specialty-table.mjs`:
  - 모듈 로드 시 `SPECIALTY_INDEX`(이름→`{col,row}`) 구축, `export function findSpecialtyCoord(name)` 반환(없으면 null).
  - `export function specialtyNames()` 또는 상수 — 차트 66특기 평면 배열(시트 datalist용).
- `module/system/spell-cast.mjs`(신규):
  - `export function resolveSpecialtyTn(table, skill, manualTn)` — `findSpecialtyCoord(skill)`로 셀 찾아 `cell.tn`; `null`이면 `manualTn` 폴백; 미매칭이면 `manualTn`. 반환 `{ tn, linked }`(`linked`=차트 좌표 매칭 여부). `manualTn`이 유한수가 아니고 링크 TN도 없으면 `tn=null`.

### 5.4 시전 로직 (`module/system/spell-cast.mjs`)

- `export async function castSpell(actor, itemId)`:
  1. `const spell = actor.items.get(itemId)` (type spell 아니면 무시).
  2. `const table = computeTable({ owned: actor.system.skills, domain: actor.system.domain || null, wrap: actor.system.horizontalWrap })`.
  3. `const { tn } = resolveSpecialtyTn(table, spell.system.skill, spell.system.tn)`.
  4. `tn == null`이면 `ui.notifications.warn("목표치를 계산할 수 없습니다.")` 후 return.
  5. `const roll = await new Roll("2d6").evaluate(); const [d1,d2] = roll.dice[0].results.map(r=>r.result);`
  6. `const result = classifyRoll(d1, d2, tn);` `dieHtml = renderDie(d1,result.doublet) + '<span class="mg-roll-eq">+</span>' + renderDie(d2,result.doublet);`
  7. 데이터 구성: `who`(getSpeaker alias), `name`(item.name), `type`(system.type), `skill`(system.skill), `target`(system.target), `cost`(`formatCost(system.cost)`), `effect`(system.effect), `roll:{ dice:[d1,d2], target:tn, sum:result.total, success, special, fumble, doublet, masoDomain }`, `dieHtml`. (`damage`는 전달하지 않음.)
  8. `renderTemplate(".../chat/spell-card.hbs", data)` → `ChatMessage.create({ speaker, content, rolls:[roll] })`.

### 5.5 채팅 템플릿 (`templates/chat/spell-card.hbs`, 신규)

- 루트 `class="magicalogia theme-light"` → `.mg-card`:
  - `__head`: 책 시질 SVG(아이템 시트 `mg-item__sigil`과 동일) + `__who`("{{who}} · 장서 시전"). 시간/삭제 생략(Foundry 제공).
  - `__body`:
    - `.mg-spell-head`: `.mg-spell-name`({{#if nameRt}}루비{{else}}{{name}}{{/if}}) + `.mg-spell-type`({{type}}).
    - `.mg-spell-info` `<dl>`: 지정특기={{skill}} · 목표={{target}} · 타입={{type}} · 코스트=`<b>{{cost}}</b>`.
    - `.mg-spell-effect`: 라벨 "효과" + {{effect}}.
    - `.mg-cardrule`: 골드 구분선.
    - 판정 블록(기존 판정 카드 마크업): `.mg-roll-title`(`<span class="dom">{{skill}}</span> 판정` + `목표 <b>{{roll.target}}</b>`) / `.mg-roll-dice`(`{{{dieHtml}}}` + `=` + `{{roll.sum}}` + `2D6 · {{roll.dice.[0]}} + {{roll.dice.[1]}}`) / `.mg-outcome`(성공·스페셜!/실패·펌블! + 더블릿 태그) / `{{#if roll.doublet}}.mg-note{{/if}}`(masoDomain).
    - `{{#if damage}}.mg-damage--{{eq…}}{{/if}}`: 디자인만(미전달 → 미표시).

### 5.6 SCSS (`scss/component/_chat-card.scss` 추가, `scss/theme/_tokens.scss`)

- `_chat-card.scss`에 추가(기존 토큰만): `.mg-spell-head`/`.mg-spell-name`(+`rt`)/`.mg-spell-type`, `.mg-spell-info`(dl `auto 1fr auto 1fr` 그리드 + dt 골드헤더 + dd), `.mg-spell-effect`(+`__label`/`__text`), `.mg-cardrule`(+`__line`/`__dot`), `.mg-damage`(+`--dmg`/`--heal`/`__label`/`__formula`/`__dice`/`__sum`/`__detail` + `.mg-dmg-btn`). 디자인 `magicalogia-spellcard.css`에서 이식.
- `_tokens.scss`: `--mg-good`/`--mg-good-bg`/`--mg-good-line`를 **다크+라이트** 추가.
  - 라이트(디자인값): `#2f7d4e` / `#2f7d4e1f` / `#2f7d4e7a`.
  - 다크(밝은 초록, `--mg-bad` 명도 반전 선례): `#86d6a3` / `#2f7d4e3d` / `#5cae7f8c`.

### 5.7 코스트 라벨 헬퍼 (`module/helpers/config.mjs`)

- `export function formatCost(cost)` — `cost.area`가 빈값이면 `"—"`, 아니면 `${COST_AREAS label}${count? "×"+count : ""}`. `all`/`none`도 라벨 매핑.
- `module/sheets/actor-sheet.mjs` `_prepareContext`의 인라인 costLabel 계산을 `formatCost`로 교체(DRY, 2곳 사용).

### 5.8 시전 트리거 (`templates/actor/parts/grimoire.hbs`, `module/sheets/actor-sheet.mjs`, SCSS)

- grimoire 행 `col-name` 안 이름 앞에 `<span class="mg-spell-cast" data-action="cast-spell" data-item-id="{{this.id}}" title="시전">✦</span>`.
- actor-sheet `DEFAULT_OPTIONS.actions`에 `"cast-spell": MagicalogiaActorSheet.#onCastSpell` 등록; `#onCastSpell(_event, target){ castSpell(this.actor, target.dataset.itemId); }`. `castSpell` import.
- `.mg-spell-cast` SCSS(작은 골드 ✦, cursor pointer, hover) — `_grimoire.scss` 또는 `_chat-card.scss` 외 적절한 곳(시트 컴포넌트).

### 5.9 프리로드 (`module/helpers/templates.mjs`)

- `loadTemplates`에 `"systems/magicalogia/templates/chat/spell-card.hbs"` 추가.

## 6. 데이터 흐름 / 상태

- 시전은 **출력 + 즉석 판정**만. 코스트/충전 소비, 효과 적용 등 게임 처리는 **범위 밖**(YAGNI, 미요청).
- TN은 저장 안 함 — 시전 시점 `computeTable`로 라이브 산출. `spell.tn`은 폴백만.
- 카드는 ChatMessage content(라이트 고정). 마소는 `attributes[d1-1].title`.

## 7. 테스트 / 검증

- `findSpecialtyCoord` — 차트 66특기 이름이 모두 고유하고 역매핑이 정확(예: "이야기"→{col:"song",row:0}); 미존재 이름→null.
- `resolveSpecialtyTn` — ① 링크+`cell.tn` 있음 → 그 값, ② 링크지만 `cell.tn=null`(보유특기 없음) → `manualTn`, ③ 미매칭 → `manualTn`, ④ 둘 다 없음 → null. (computeTable 결과를 stub/실제로 구성.)
- `formatCost` — area 빈값→"—", area+count→"별×2" 등, all/none 라벨.
- `npm run build` + 기존 56 + 신규 통과. `theme-tokens.test` (`--mg-good*` 양쪽) 통과.
- `castSpell`/템플릿/시트 렌더는 Foundry 의존 → F5 육안: 그리모어 ✦ 클릭 → 시전 카드(장서 정보·판정·더블릿 마소), 차트 링크 특기는 라이브 TN, 미링크는 수동 TN. 다크/라이트 양쪽.

## 8. 범위 밖 (별도 후속)

- 대미지/회복 굴림 실제 연동(`damage` 필드·`bindDamageButtons`·`roll-damage`) — 고정값/굴림 정책 확정 후.
- 이름 루비(`nameRt`) 데이터 필드.
- 코스트/충전 소비·효과 자동 적용 등 시전 게임 처리.
- 아이템 시트에서의 시전 버튼(현재 그리모어 행만).
