# 마기카로기아 — 특기표 판정 수직 슬라이스 설계

- **작성일**: 2026-06-18
- **대상**: Foundry VTT V13+, 시스템 id `magicalogia`
- **선행**: 보일러플레이트(`docs/superpowers/specs/2026-06-18-magicalogia-boilerplate-design.md`) 완료, `main` 병합됨
- **디자인 레퍼런스**: `docs/design/`(고품질 핸드오프 — example.html, README.md, config/sheet 스켈레톤)

## 1. 목표와 범위

마기카로기아 캐릭터의 **핵심 수직 슬라이스**를 데이터→시트→판정까지 end-to-end로 동작시킨다:
**기본 능력치 + 특기표(特技, 마법표) + 판정(2d6)**.

방향은 **A안**: 시안이 캐릭터 모델을 거의 완전히 명세했으므로 **CharacterDataModel은 한 번에 전체 정의**(나중 변경 시 마이그레이션 비용 회피)하되, **구현은 슬라이스만**(마법표 렌더 + 거리/TN 엔진 + 특기 판정). 장서/관계/상태이상 효과 등은 필드만 두고 로직/UI는 다음 계층.

근거: 데이터 모델은 룰·시안으로 이미 "알려진" 상태라 선定의가 조급한 추상화(YAGNI 위반)가 아니다. 구현 범위는 좁게 유지해 위험을 통제한다.

### 비목표 (이번 슬라이스 밖)

- 장서(spell)·관계(anchor) 탭의 로직/판정
- 상태이상 효과 규칙, 게이지/카운터 규칙
- 판정 수정치(±)
- wrap을 실제로 켜는 주문 (필드·엔진 지원만)
- 다크/라이트 테마 전환

## 2. 도메인 규칙 (룰북 확정분)

### 2.1 마법표 구조

- 6속성 열 × 11행. 속성(가로 순서): **별(star)·짐승(beast)·힘(force)·노래(song)·꿈(dream)·어둠(dark)**.
- 행은 출목 2~12 (세로). **세로 순환 없음** (2와 12는 양 끝).
- 어둠 열 = 저주 속성. 취소선 표시.

### 2.2 거리·목표치(TN) 계산

사이코로 픽션 거리 시스템:

- 보유(체크)한 특기 = 거리 0 = **TN 5**. 한 칸 이동마다 +1.
- 표를 2D 그래프로 보고 **세로·가로 이동 모두 1칸**.
- 열 사이 gap 5개(1-2, 2-3, 3-4, 4-5, 5-6). gap도 한 칸 → 인접 열은 보통 2칸(열→gap→열). **가로 순환 없음**(어둠↔별 사이 gap 없음, 기본).
- **소속 영역**(`domain`): 그 열 양옆 gap이 칠해져 **거리에서 생략**(0칸) → 인접 열이 1칸.
- **TN = 5 + (가장 가까운 보유 특기까지의 최단 거리)**.

검증 예시:

- 물(힘, 행5) ← 보유 이별(노래, 행5): 세로0 + 가로2 = 2 → **TN 7**.
- 짐승이 소속영역일 때, 보유 꽃(짐승, 행4) ← 숲(별, 행4)·흐름(힘, 행4): 양옆 gap 생략 → 각 1칸 → **TN 6**.
- 보유 특기 자신 → **TN 5**.

### 2.3 취소선(사용 불가) 규칙

- **어둠 열** 특기, **상흔 영역**(`scarDomains`) 열 특기 = **취소선 = 직접 판정 불가**(클릭 롤 불가).
- 단 보유(체크)된 경우 **거리 기준점(anchor)으로는 여전히 유효** — 어둠·상흔 모두 동일.
- 정리: `취소선 = 판정 대상 불가`, `anchor 참여 = 보유 여부로만 결정`.

### 2.4 두 영역 메커니즘 (별개)

- **소속 영역**(`domain`): 단일 선택(6속성 중 하나). 효과 = 양옆 gap 생략(거리 단축). 이로움.
- **상흔 영역**(`scarDomains`): 별개 룰. 열 단위(복수 가능). 효과 = 그 열 특기 취소선/판정 불가(2.3).

### 2.5 가로 순환 확장점

- 기본 가로 순환 없음. 단 일부 장서(주문)가 순환을 가능케 할 수 있음.
- → 엔진이 `wrap` 파라미터를 받아 어둠(10)↔별(0)에 wrap-gap을 추가하는 토폴로지를 지원. 액터에 `horizontalWrap` 필드를 두되 이번 슬라이스에선 항상 false(켜는 주문은 다음 계층).

### 2.6 판정 분류

- 2d6 굴림. `(1,1)` = **펌블**(자동 실패), `(6,6)` = **스페셜**(자동 성공), 그 외 `합 ≥ TN` = **성공**. `d1==d2` = **더블릿** 플래그(부가 표시).

## 3. 아키텍처 / 모듈 경계

```
module/
├─ helpers/config.mjs          # CONFIG.MAGICALOGIA: 정적 마법표 토폴로지(이름·열·gap), 상태이상, 옵션
├─ data/actors/character.mjs   # CharacterDataModel — 전체 캐릭터 스키마
├─ system/specialty-table.mjs  # 거리/TN 엔진 (순수 함수, Foundry 비의존)
├─ system/specialty-roll.mjs   # 2d6 판정 + classifyRoll + 챗카드
├─ sheets/actor-sheet.mjs      # _prepareContext에서 엔진 호출 → 셀별 {tn, rollable, on}
├─ documents/actor.mjs         # 파생 데이터 진입점(필요 시)
└─ templates/actor/...         # 시안 C 레이아웃 (슬라이스는 마법표 중심)
```

핵심 원칙: **`specialty-table.mjs`는 Foundry와 완전 분리된 순수 모듈**. 거리/TN 규칙이 시스템의 심장이므로 독립적으로 단위 테스트한다. `classifyRoll`도 순수 함수로 분리한다.

## 4. CONFIG (정적 토폴로지) — `helpers/config.mjs`

`CONFIG.MAGICALOGIA`에는 변하지 않는 것만 둔다.

- `attributes`: 6열 순서 `[star, beast, force, song, dream, dark]`. 각 `{ key, num, title, dark:boolean }`. 배열 순서 = 가로 위치.
- `chart`: 열별 11개 특기 **이름만**(`{ name }[11]`). 숫자(cost/TN)는 저장하지 않음 — 파생.
- `rows`: `[2,3,4,5,6,7,8,9,10,11,12]` (출목, 세로 위치).
- `statuses`: 8종 `[{ key, label }]` — 봉인/타짐/허약/병마/차단/불운/사망/소멸.
- `spellTypes`, `anchorAttrs`, `themes`.

> 시안 `magicalogia-config.js`의 셀 `cost` 숫자는 특정 보유상태 예시이므로 버린다. 특기 이름·열·dark 플래그만 가져온다.

## 5. CharacterDataModel (전체 정의) — `data/actors/character.mjs`

V13 DataModel. 동적 문자열 키 대신 **구조화 스키마**(DataModel은 동적 키에 약함).

| 필드             | 타입                                                                               | 비고                             |
| ---------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| `skills`         | SchemaField{ star…dark : ArrayField(BooleanField) 길이 11 }                        | 특기 보유. `skills.star[i]`      |
| `domain`         | StringField (6키 또는 "")                                                          | 소속 영역(단일). gap 단축        |
| `scarDomains`    | SchemaField{ star…dark : BooleanField }                                            | 상흔 영역(복수). 취소선/판정불가 |
| `horizontalWrap` | BooleanField (기본 false)                                                          | 가로 순환 확장점                 |
| `soulSkill`      | StringField                                                                        | 혼의 특기                        |
| `variableSkill`  | StringField                                                                        | 가변 특기                        |
| `abilities`      | SchemaField{ attack, defense, source : NumberField }                               | 슬라이스에선 표시만              |
| `rank`           | NumberField                                                                        | 계제                             |
| `mp`             | SchemaField{ value, max : NumberField }                                            | 마력 게이지                      |
| `tempMp`         | NumberField                                                                        | 일시 마력                        |
| `achievement`    | NumberField                                                                        | 공적점                           |
| `mabloom`        | NumberField                                                                        | 마화                             |
| `statuses`       | SchemaField{ 8키 : BooleanField }                                                  | 상태이상(표시/토글, 효과는 보류) |
| `spells`         | ArrayField(Schema{ name, type, skill, target, cost, charge, mod, recite, effect }) | 장서(필드만)                     |
| `anchors`        | ArrayField(Schema{ name, fate, attr, checked })                                    | 관계(필드만)                     |
| `mission`        | StringField                                                                        | 사명                             |
| `collection`     | StringField                                                                        | 수집 장서                        |
| `biography`      | HTMLField                                                                          | 메모                             |

- 테마(dark/light)는 시안대로 **액터 flag**로 관리(DataModel 밖).
- `skills`/`scarDomains`의 키는 CONFIG `attributes`의 key와 정합.

## 6. 거리/TN 엔진 — `system/specialty-table.mjs`

순수 함수. 입력 상태는 액터에서 추출:

```js
computeTable({
  owned,        // { star:bool[11], … } — skills
  domain,       // string|null
  scarDomains,  // Set<string> 또는 { key:bool }
  wrap,         // boolean
}) => columns.map(col => ({ key, cells: [{ name, tn, rollable, owned }] }))
```

### 6.1 가로 축

11 위치: `별0 · gap1 · 짐승2 · gap3 · 힘4 · gap5 · 노래6 · gap7 · 꿈8 · gap9 · 어둠10`.
`wrap=true`면 어둠10↔별0 사이에 wrap-gap 추가(원형).

### 6.2 거리 공식

각 셀(목표) → 각 보유 특기(anchor):

```
거리 = |행차(rowIndex 차)| + 가로거리
가로거리(직선) = |posA − posB| − (사이에 칠해진 gap 수)
wrap=true면 가로거리 = min(직선, 반대로 도는 경로)
TN = 5 + min(모든 보유 특기까지 거리)
```

- 칠해진 gap = `domain` 열의 양옆 gap(생략=0칸).
- 세로 순환 없음.
- 보유 특기 0개 → TN 없음(셀 `—`, rollable=false).

### 6.3 rollable

`rollable = (열이 dark 아님) AND (열이 scarDomains 아님)`. 어둠·상흔도 보유 시 anchor엔 포함.

### 6.4 단위 테스트 케이스

- 물(force,행5) ← 보유 이별(song,행5), domain=null → TN 7.
- 숲(star,행4)·흐름(force,행4) ← 보유 꽃(beast,행4), domain=beast → TN 6.
- 보유 특기 자신 → TN 5.
- 어둠 열 셀 → rollable=false (보유 시 anchor엔 포함되는지 별도 검증).
- 상흔 영역 열 셀 → rollable=false, anchor 유효.
- wrap=true: 어둠↔별 인접 케이스 1건.
- 보유 0개 → tn=null, rollable=false.

## 7. 판정 — `system/specialty-roll.mjs`

- `classifyRoll(d1, d2, tn) => { success, special, fumble, doublet }` (순수 함수)
  - `(1,1)` → `fumble=true, success=false`
  - `(6,6)` → `special=true, success=true`
  - 그 외 → `success = (d1+d2) >= tn`
  - `doublet = (d1 === d2)`
- `rollSpecialty(actor, colKey, rowIndex)`:
  1. 엔진으로 해당 셀 TN 산출(없으면 경고 후 중단).
  2. `new Roll("2d6")` 평가.
  3. `classifyRoll`로 분류.
  4. 챗 템플릿 렌더 → `ChatMessage.create`. 카드에 특기명·TN·주사위·합·결과(성공/실패/스페셜/펌블/더블릿) 표시.

## 8. 시트 — `sheets/actor-sheet.mjs` + 템플릿

- `_prepareContext`에서 `computeTable(...)` 호출 → 셀별 `{ name, tn, rollable, on }` 구성.
- 마법표 렌더(시안 C 레이아웃, 마법표 중심):
  - 셀: 보유 체크박스 + 특기명 + 파생 TN. `on`이면 하이라이트, dark/scar면 취소선.
  - 소속영역 select, 상흔영역 토글(열 단위), 혼의특기/가변특기.
  - 능력치·마력·카운터는 표시/편집 입력만.
- 상호작용(ApplicationV2 `actions`):
  - 특기 체크 토글 → `skills.{key}[{i}]` 갱신.
  - 소속영역 select 변경 → `domain` 갱신.
  - 상흔영역 토글 → `scarDomains.{key}` 갱신.
  - rollable 셀의 롤 버튼/클릭 → `rollSpecialty`.
- 어둠/상흔 셀은 롤 액션 비활성(취소선).

## 9. 검증 기준 (완료 정의)

| 검증             | 방법                                 | 기대                                                                                                            |
| ---------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 엔진 단위테스트  | `npm test` (specialty-table)         | 6.4 케이스 전부 통과                                                                                            |
| 판정 분류 테스트 | `npm test` (classifyRoll)            | 7 케이스 통과                                                                                                   |
| 빌드             | `npm run build`                      | 에러 0, dist 산출                                                                                               |
| lint/typecheck   | `npm run lint` / `npm run typecheck` | clean                                                                                                           |
| 런타임(수동)     | Foundry에서 character 시트           | 마법표 TN이 보유·소속영역에 따라 정확히 갱신, rollable 셀 클릭 시 2d6 판정 챗카드 출력, 어둠/상흔 취소선·비활성 |

## 10. 의도적으로 제외 (YAGNI)

장서/관계 로직, 상태이상 효과, 게이지/카운터 규칙, 수정치, wrap 발동 주문, 테마 전환 — 모두 데이터 모델엔 자리를 두되 이번 슬라이스에선 구현하지 않는다.
