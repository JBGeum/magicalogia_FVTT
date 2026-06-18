# 마기카로기아 — 메인 탭 비주얼 슬라이스 설계

- **작성일**: 2026-06-18
- **대상**: Foundry VTT V13+, 시스템 id `magicalogia`
- **선행**: 특기표 판정 슬라이스(`2026-06-18-magicalogia-specialty-slice-design.md`) 완료, `main` 병합됨
- **디자인 레퍼런스**: `docs/design/`(고품질 핸드오프 — example.html, README.md, styles/, templates/)

## 1. 목표와 범위

시안의 **캐릭터 시트(메인) 탭**을 시각적으로 충실히 재현하고 데이터 입력이 동작하게 한다. 마법표·특기 판정은 이미 완성됐으므로, 그 주변 영역(마스트헤드·헤드밴드·상태이상 스트립·서브탭·메모/표 카드)과 전체 스타일을 채운다.

### 포함 (동작)

- 모든 입력 필드 저장(폼 바인딩 submitOnChange)
- 초상화 이미지 교체(FilePicker)
- 상태이상 칩 토글
- 기존 마법표 렌더·특기 판정(그대로 재사용)

### 비포함 (이번 슬라이스 밖)

- 장서/관계 탭 — 탭 네비에 "준비 중" 비활성 표기만, 콘텐츠 없음
- 운명변전·장면표·펌블표·사건표 ⚙ 카드 — 정적 버튼(RollTable 미연결)
- 라이트 테마·테마 토글 — 다크 고정 유지(`theme-dark`)
- 폰트 번들(@font-face 동봉) — Google Fonts 로드로 갈음, 번들은 후속

## 2. 데이터 모델 추가 (CharacterDataModel)

식별 StringField 9종 신설(`initial: ""`):

| 필드           | 라벨        |
| -------------- | ----------- |
| `tempName`     | 임시 이름   |
| `career`       | 경력        |
| `magicName`    | 마법명      |
| `organization` | 기관        |
| `player`       | 플레이어    |
| `socialStatus` | 신분        |
| `genderAge`    | 성별·연령   |
| `trueForm`     | 진정한 모습 |
| `effect`       | 효과        |

나머지는 **기존 필드에 매핑**(신설하지 않음):

| 시안 표기      | 기존 필드                                  |
| -------------- | ------------------------------------------ |
| 공격/방어/근원 | `abilities.attack/defense/source`          |
| 마력 value/max | `mp.value/mp.max`                          |
| 일시 마력      | `tempMp`                                   |
| 공적점         | `achievement`                              |
| 마화           | `mabloom`                                  |
| 메모           | `biography`(HTMLField, ProseMirror 에디터) |
| 가변특기       | `variableSkill`                            |

주사위 카드는 정적 "D6" 텍스트(필드 없음). 식별 필드 외 데이터 모델 변경 없음.

## 3. 스타일 (시안 SCSS 이식)

시안 `docs/design/styles/`를 `.magicalogia` 스코프로 이식한다. 변수 prefix는 이미 `--mg-*`라 그대로 사용.

- `scss/global/_base.scss` ← 시안 `_base.scss`: 셸, 배경 장식 레이어(`.magicalogia::before`, `--mg-deco`), 마스트헤드, 탭 네비.
- `scss/sheet/_layout.scss`(신설) ← 시안 `_layout.scss`: 헤드밴드 그리드(`118px 1fr 132px`), 식별 2열 그리드, 스탯레일, belowgrid(메모+표 2열), `.mg-main`/`.mg-shared` 수직 리듬.
- `scss/component/_components.scss`(신설) ← 시안 `_components.scss`: 필드(`mg-field`), 스탯(`mg-stat`), 게이지(`mg-gauge`), 카운터(`mg-counter`), 상태칩(`mg-status__chip`), 메모(`mg-memo`), 배너(`mg-banner`), 표카드(`mg-tablecard`), 초상화(`mg-portrait`/`mg-corner`).
- 기존 `scss/theme/_tokens.scss`(다크) · `scss/component/_magic-chart.scss` 재사용.
- `scss/magicalogia.scss`에 `@use`로 신규 파일 연결.

**다크 소환진 배경**: 시안 `_tokens.scss`의 다크 `--mg-deco`(골드 소환진 인라인 SVG data-URI + 보라 글로우)를 `scss/theme/_tokens.scss`에 추가하고 `_base.scss`의 `.magicalogia::before`가 읽도록 한다.

**폰트**: Nanum Myeongjo(본문/라벨) · Gowun Batang(디스플레이/숫자) · Cinzel(라틴 강조). 이번 슬라이스는 `scss/magicalogia.scss` 상단 Google Fonts `@import`로 로드한다. 오프라인/사설 서버 대응 `@font-face` 번들은 후속 작업으로 분리(시안 README 권장 사항 인지).

## 4. 템플릿 구조

`templates/actor/character-sheet.hbs`를 시안 메인 탭(레이아웃 C) 구조로 재구성. 식별 필드는 `templates/actor/parts/mg-field.hbs` partial 사용.

```
<form>
 └ .mg-content
    ├ header.mg-masthead  (❧ 마기카로기아 ❧ + CHARACTER SHEET + ✶)
    ├ nav.mg-tabs         (캐릭터 시트[활성] · 장서·관계·개요·속성[비활성 "준비 중"])
    └ section.mg-tab-content
       └ .mg-main (data-tab=main)
          ├ .mg-headband
          │   ├ .mg-portrait (data-action=editImg)
          │   ├ .mg-identity-grid  (mg-field × 9 + 효과)
          │   └ .mg-statrail (스탯 행 + 게이지 2 + 카운터 행)
          ├ .mg-status   (상태이상 칩 토글)
          └ .mg-shared
             ├ .mg-subtabs (특기[활성] · 설정[비활성])
             ├ {{> magic-chart}}   (기존 partial)
             └ .mg-belowgrid (메모 에디터 | 표카드 2×3)
```

표카드 6종: 가변특기(`variableSkill` 표시), 운명 변전·장면 표·펌블 표·사건 표(⚙ 정적), 주사위(정적 "D6").

## 5. 인터랙션 (sheets/actor-sheet.mjs)

기존 `toggleSkill`·`rollSpecialty` 액션 유지. 추가:

- `editImg`: 초상화 클릭 → `foundry.applications.apps.FilePicker.implementation`으로 `img` 갱신.
- `toggleStatus`: 상태이상 칩 클릭 → `system.statuses[key]` 토글(배열 아님, SchemaField boolean이라 update 안전).

입력 필드는 폼 바인딩으로 자동 저장. 탭·서브탭·⚙ 카드는 정적(전환·롤 없음).

`_prepareContext`는 기존 chart/statuses에 더해 식별·스탯 필드를 `system`으로 노출(이미 `context.system = sys`로 전부 접근 가능 — 추가 가공 불필요).

## 6. 검증 기준 (완료 정의)

| 검증         | 방법                                   | 기대                                                                                                                        |
| ------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 데이터 모델  | `npm test`(character-model)            | 9개 식별 필드 존재 검증 통과                                                                                                |
| 빌드/품질    | `npm run build` / `lint` / `typecheck` | clean, dist 산출                                                                                                            |
| 런타임(수동) | Foundry 시트                           | 시안과 유사한 메인 탭 렌더(마스트헤드·헤드밴드·상태칩·표카드), 필드 입력 저장, 초상화 교체·상태 토글 동작, 마법표·판정 정상 |

## 7. 의도적으로 제외 (YAGNI)

장서/관계 탭 콘텐츠, ⚙ 표 RollTable 연결, 라이트 테마·토글, 폰트 번들, 주사위 실제 굴림, 설정 서브탭 콘텐츠 — 모두 후속. 이번 슬라이스는 메인 탭의 시각 재현과 기본 입력에 한정한다.
