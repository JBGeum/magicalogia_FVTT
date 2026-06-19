# 설계 — 장서/관계 Item화 (표준 전환, A안)

> 2026-06-19 · 브랜치 `develop` · 핸드오프 `docs/handoff/2026-06-19-stage1-2-and-item-plan.md`의 "다음 작업".
> 관련 메모리: `grimoire-item-migration`, `next-work-order`.

## 목표

캐릭터 `system.spells`/`system.anchors` ArrayField를 Foundry **embedded Item 문서**(`spell`/`anchor` 서브타입)로 전환한다. 편집은 **전용 item sheet 중심**(A안): 액터 시트 탭은 목록 + 빠른 토글만 제공하고, 본문 편집은 행 더블클릭으로 item sheet에서 한다.

전환과 함께 룰(`docs/feature`) 충실성 교정을 반영한다: spell `cost` 구조화(영역+개수), anchor `scar`(상흔) 필드 신설, anchor `fate`는 "운명점"으로 NumberField 유지.

## 범위 결정 (확정)

- **범위**: 표준 Item 전환 = embedded Item + 전용 item sheet. 드래그앤드롭·컴펜디움 라이브러리·ActiveEffect 연결은 **후속**(YAGNI 제외).
- **마이그레이션**: **생략**. 개발 초기라 기존 월드 데이터를 버리고 ArrayField를 제거한다. 기존 테스트 액터의 장서/관계 데이터는 손실됨(허용).
- **편집 방식**: A안. 액터 탭 = 목록 + 빠른 토글, 본문은 item sheet.
- **`trueForm`/`mana` Item화**: `docs/feature` 제안이나 과함 → 제외.

## 컴포넌트

### ① Item 타입 등록

- 신규 DataModel: `module/data/items/spell.mjs`(`SpellDataModel`), `module/data/items/anchor.mjs`(`AnchorDataModel`). 둘 다 `BaseItemModel` 상속(→ `description` HTMLField 공통 제공).
- `module/magicalogia.mjs`: `CONFIG.Item.dataModels`에 `spell`/`anchor` 추가(`generic` 유지). import 추가.
- `module/sheets/item-sheet.mjs`: `PARTS`에 `spell`·`anchor` 템플릿 등록. `options.parts = [this.document.type]`가 이미 타입별 라우팅하므로 시트 클래스는 1개 유지. `_prepareContext`에 타입별 옵션(spellTypes, cost 영역 목록, selected 플래그) 보강.

### ② 스키마

이름은 Item 최상위 `name`을 사용하므로 system에서 제외한다.

**`SpellDataModel.system`**

- `type`: StringField(choices = `spellTypes`, blank 허용)
- `skill`: StringField (지정특기)
- `target`: StringField (목표)
- `cost`: SchemaField `{ area: StringField(choices = COST_AREAS, 초기 ""), count: NumberField(initial 0, min 0, integer) }`
- `charge`: NumberField(initial 0, min 0, max 6, integer) — 충전된 마소 수
- `mod`: NumberField(initial 0, integer)
- `active`: BooleanField(initial false) — 장비/유효 플래그
- `recite`: BooleanField(initial false) — 주구
- `effect`: StringField(initial "") — 짧은 효과 텍스트(드롭다운식 고정 표기라 단순 텍스트로 유지)
- (`description`: BaseItemModel 상속, item sheet 본문 서술용)

**`AnchorDataModel.system`**

- `fate`: NumberField(initial 0, integer) — 운명점
- `attr`: StringField(initial "") — 속성
- `encumbrance`: BooleanField(initial false) — 중하(重荷/인컴브런스). 확장 대비 `checked` 대신 의미 기반 네이밍
- `scar`: BooleanField(initial false) — 스카(疵/상흔), **신규**
- (`description`: BaseItemModel 상속 — 앵커 설정(캐릭터 설정에 가까운 서술)에 사용. 별도 `setting` 필드 두지 않음)

**`config.mjs`**: `COST_AREAS` 상수 신설 — 코스트 영역 목록(`["", star, beast, force, song, dream, dark, all, none]` 표기 라벨 포함). 기존 `spellTypes`는 그대로 사용.

### ③ 액터 데이터 모델

- `module/data/actors/character.mjs`: `spells`·`anchors` ArrayField **제거**. `migrateData`는 기존 `genderAge → gender` 처리만 유지(spells/anchors 마이그레이션 없음).

### ④ 액터 시트 (A안)

`module/sheets/actor-sheet.mjs`:

- `_prepareContext`: `sys.spells`/`sys.anchors` → `this.actor.itemTypes.spell`/`.anchor`로 교체. 충전 링(rings) 표시 계산은 spell 아이템 기준으로 유지(`item.system.charge`).
- 액션 교체(ArrayField CRUD 폐기):
  - `add-spell`/`add-anchor`: `actor.createEmbeddedDocuments("Item", [{ type, name }])` → 생성된 item의 `sheet.render(true)` 자동 오픈.
  - 빠른 토글 `toggle-spell-flag`(active/recite)·`toggle-anchor`(encumbrance)·신규 scar 토글·`set-charge`: `data-item-id`로 아이템 조회 후 `item.update({...})`.
  - 본문 편집: 행 더블클릭 → `item.sheet.render(true)`.
  - 삭제: 기존 우클릭 ContextMenu → `item.delete()`(또는 `deleteEmbeddedDocuments`).
- `CHARGE_SLOTS`(=6) 상수 유지.

`templates/actor/parts/grimoire.hbs`·`relations.hbs`:

- 배열 인덱스 바인딩(`name="system.spells.{i}.x"`) 전면 제거 → 아이템 순회 + `data-item-id`.
- 표시: 이름은 **인라인 읽기 표시**(편집은 더블클릭), 타입/지정특기/cost/충전/빠른 토글 노출. 관계는 이름/운명점/속성 + 중하(encumbrance)·scar 토글. 설정(description)은 item sheet에서 편집.
- 기존 `.mg-table--grimoire`/`.mg-table--relations` SCSS 재사용.

### ⑤ Item 시트 템플릿 (신규)

- `templates/item/spell-sheet.hbs`: type select, 지정특기/목표/effect 텍스트, **cost = 영역 select + 개수 number**, charge, active/recite 체크, description 리치텍스트.
- `templates/item/anchor-sheet.hbs`: fate(number)/속성 입력, 중하(encumbrance)·scar 체크, 설정은 description 리치텍스트.
- `module/helpers/templates.mjs`: 프리로드 목록에 신규 템플릿 등록.
- 스타일은 기존 `mg-field` 등 재사용 + cost(영역 select + 개수) 소규모 레이아웃만 신설.

### ⑥ 테스트

- `test/spell-model.test.mjs`·`test/anchor-model.test.mjs` 신설: 스키마 기본값, `cost` 구조(area/count), `scar`·`encumbrance` 기본값, fate Number 유지 검증. 기존 `test/character-model.test.mjs` 패턴 차용.
- `test/character-model.test.mjs`: spells/anchors 필드 제거에 따른 단언 정리.
- 시트 액션(Item CRUD)은 기존과 동일하게 무테스트(ApplicationV2 단위테스트 인프라 없음).

## 데이터 흐름

1. 사용자가 장서 탭 ＋ 클릭 → `createEmbeddedDocuments` → spell Item 생성 → item sheet 오픈 → 본문 입력(`submitOnChange`으로 즉시 저장).
2. 액터 탭 목록은 `actor.itemTypes.spell`을 렌더 → 빠른 토글/충전은 `item.update`로 직접 갱신 → 액터 리렌더로 반영.
3. 행 더블클릭 → item sheet 재오픈으로 전체 편집.
4. 우클릭 → 삭제 → `item.delete`.

## 에러/엣지 처리

- `data-item-id`로 조회 실패 시 액션 no-op(기존 `if (!arr[index]) return` 패턴 대체).
- charge 클릭 토글: 현재 값과 같은 링 클릭 시 -1(기존 `set-charge` 로직 보존).
- 마이그레이션 없음 → 기존 `system.spells`/`anchors` 잔존 데이터는 스키마에서 사라져 무시됨(Foundry가 정의되지 않은 system 키를 버림).

## 룰 충실성 교정 요약

| 항목        | 기존                                     | 변경                                                  |
| ----------- | ---------------------------------------- | ----------------------------------------------------- |
| spell.cost  | StringField(자유 문자열)                 | `{ area, count }` 구조화                              |
| anchor.fate | NumberField(템플릿은 텍스트 입력 = 버그) | NumberField 유지(운명점) + item sheet에서 number 입력 |
| anchor.scar | 없음                                     | BooleanField 신규                                     |

## 작업 후 정리

- 메모리 `grimoire-item-migration`(전환 완료로 갱신), `next-work-order`(다음 작업 갱신) 업데이트.
- `docs/feature`(현재 미커밋) 정체 확정: 룰/설계 개요 참조 문서로 커밋 여부 사용자 판단.

## 비목표 (후속)

드래그앤드롭, 컴펜디움 마법 라이브러리, ActiveEffect/매크로 연결, `trueForm`/`mana` Item화, 마법 발동 채팅 카드·마소 자동 차감(별도 spec).
