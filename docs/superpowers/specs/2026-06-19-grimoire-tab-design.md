# 설계 — 장서(Grimoire) 탭 구현 (2026-06-19)

> 브랜치: `develop`
> 캐릭터 시트에 두 번째 동작 탭인 "장서"를 추가한다.

## 1. 목표

ApplicationV2 캐릭터 시트는 현재 탭 5개 중 "캐릭터 시트" 1개만 동작하고,
나머지(장서/관계/개요·정보/속성·능력)는 정적 `is-disabled` 플레이스홀더다.
데이터 모델 `spells` 스키마는 이미 존재하나 UI가 없어 "필드만" 상태다.

이 작업은 (1) 탭 전환 메커니즘을 도입하고 (2) 시안(`docs/design/`)의 장서
테이블을 기반으로 장서 탭을 구현해, 캐릭터/장서 두 탭이 전환·편집되게 한다.
관계/개요/속성능력 탭은 여전히 `is-disabled`로 둔다(후속 작업).

## 2. 결정 사항 (브레인스토밍 합의)

| 항목           | 결정                       | 비고                                                 |
| -------------- | -------------------------- | ---------------------------------------------------- |
| 탭 전환        | **Foundry V2 네이티브 탭** | `HandlebarsApplicationMixin` 탭 그룹. 표준·확장 용이 |
| 첫 칸 □ 체크   | **`active` 필드 추가**     | 모델에 boolean 신설. 세션 중 사용/선택 표시          |
| 낭독 체크      | 기존 `recite` 사용         | 이미 존재                                            |
| 효과(`effect`) | 행 아래 한 줄 input        | 시안의 정적 note 자리에 연결                         |
| 행 추가        | `＋` 버튼(`add-spell`)     | 시안에 존재                                          |
| 행 삭제        | **우클릭 컨텍스트 메뉴**   | 시안엔 삭제 UI 없음 — 신설                           |

## 3. 변경 범위

| 파일                                        | 내용                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `module/data/actors/character.mjs`          | `spells` SchemaField에 `active: BooleanField({initial:false})` 추가                                    |
| `module/sheets/actor-sheet.mjs`             | `static TABS`(main·grimoire) 도입; actions `add-spell` + active/recite 토글; 우클릭 삭제 핸들러 바인딩 |
| `templates/actor/character-sheet.hbs`       | 탭 nav에 `data-action="tab"`/`data-group`/`data-tab` 부여, 콘텐츠를 `data-tab` 섹션으로 분리           |
| `templates/actor/parts/grimoire.hbs` (신규) | 시안 `mg-grimoire` 기반 테이블 + `effect` input + ＋추가                                               |
| `scss/component/_grimoire.scss` (신규)      | 시안 `_components.scss`의 `.mg-table` / `.mg-table--grimoire` 이식                                     |
| `scss/magicalogia.scss`                     | 신규 partial `@use` 등록                                                                               |

## 4. 데이터 흐름 / 인터랙션

- 텍스트·숫자 필드: `system.spells.{{@index}}.*` 바인딩 → 루트 form 자동 제출
  (기존 `submitOnChange` 흐름 그대로).
- 추가(`add-spell`): `spells` 배열을 deepClone 후 빈 항목 push → `actor.update`.
  기존 `#onToggleSkill`의 배열 갱신 패턴을 따른다(폼 인덱스 바인딩 회피).
- 삭제: 행 우클릭 → `ContextMenu`로 해당 `@index` 항목 제거 후 `actor.update`.
- `active` / `recite` 셀: 클릭 시 해당 배열 항목 boolean 토글.

## 5. 탭 구조

- 탭 그룹 `primary`, 탭 id: `main`(캐릭터 시트), `grimoire`(장서), 초기 `main`.
- nav 항목: 동작 탭은 `data-action="tab"`; 미구현 3개는 `is-disabled` 유지.
- 콘텐츠: 각 탭을 `<section class="tab" data-group="primary" data-tab="…">`로 분리.

## 6. 구현 전 확인할 API (writing-plans 단계)

- ApplicationV2 `HandlebarsApplicationMixin` 탭 그룹의 정확한 형식
  (`static TABS` 스키마, 템플릿 속성, 컨텍스트 주입 방식).
- Foundry `ContextMenu` API로 행 우클릭 메뉴를 거는 표준 방법(`_onRender` 바인딩).
- → context7로 문서 확인 후 계획에 반영.

## 7. 범위 밖 (후속)

- 관계 탭(`anchors`) — 동일 패턴 재사용 가능(`.mg-table--relations`도 시안에 존재).
- 개요·정보 / 속성·능력 탭.
- 라이트 테마 이식.
