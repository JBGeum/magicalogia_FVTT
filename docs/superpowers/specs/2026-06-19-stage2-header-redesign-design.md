# 스테이지 ② 헤더 전면 개편 — 설계 (2026-06-19)

> 로드맵(`2026-06-19-sheet-redesign-roadmap-design.md`)의 ②단계 상세 설계.
> 새 시안 `docs/design/magilogi_2.html`의 다크 프레임을 현재 구현에 반영한다.
> ①(데이터 모델 확장, commit `dc2460d`)이 선행 완료된 상태를 전제로 한다.

## 목표

`mg-headband`(초상화·식별그리드·statrail) 영역을 시안에 맞춰 전면 재구성한다.
식별 정보 재배치, 입력 위젯 변경(datalist/select/체크), 강조 위계(key/muted) 도입,
초상화+카운터 묶음(portcol) 레이아웃을 포함한다.

## 범위 결정

- 시안 기준 메인 그리드에서 빠지는 4필드(`player`/`socialStatus`/`gender`/`age`)는
  **제거**하며, 입력 수단은 ③ 정보 탭에서 곧바로 제공한다(②→③ 연속 진행). 그 사이
  잠시 입력 불가는 개발 단계라 허용.
- ①에서 스키마에서 제거된 `genderAge`의 템플릿 바인딩(`character-sheet.hbs:41`)을
  **반드시 제거**한다(① 최종 리뷰 발견사항).
- 마크업 방식은 **하이브리드(접근 A)**: 단순 텍스트 필드는 `mg-field.hbs` partial 재사용
  (class 파라미터 추가), 변형이 큰 필드(datalist/box+select/체크)는 인라인 마크업.
  단일 사용 변형을 partial에 넣지 않는다(기존 효과 필드 인라인 패턴과 일치).

## 컴포넌트 설계

### 1. 식별그리드 (`mg-identity-grid`)

시안 순서로 재구성한다.

| 필드        | 마크업                                                    | 바인딩                                                         |
| ----------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| 임시 이름   | partial + `mg-field--wide mg-field--lg`                   | `system.tempName`                                              |
| 마법명      | partial + `mg-field--wide mg-field--lg`                   | `system.magicName`                                             |
| 경력        | 인라인 datalist (`input list` + `<datalist>`)             | `system.career`, 옵션 `CAREER_OPTIONS`                         |
| 기관        | 인라인 datalist                                           | `system.organization`, 옵션 `ORG_OPTIONS`                      |
| 진정한 모습 | 인라인 (`mark` · `mg-check` · `label` · `input`)          | `input`=`system.trueForm`, `mg-check`=`trueFormRevealed`(토글) |
| 효과        | 인라인 (`mg-field--wide mg-field--box`, `input` + select) | `input`=`system.effect`, select=`system.effectType`            |
| 혼의 특기   | partial + `mg-field--wide`, 값에 `--accent`               | `system.soulSkill`                                             |

- **`mg-field.hbs` 확장**: 선택적 `fieldClass`(label 요소)와 `valueClass`(input 요소)
  파라미터를 추가한다. 미전달 시 기존과 동일하게 렌더(기존 호출부 무영향).
- datalist: `<input list="mg-career-list" ...><datalist id="mg-career-list">…</datalist>`.
  자유 입력 허용(목록은 추천). `submitOnChange`로 자동 저장.
- 효과 select: `<select name="system.effectType">`에 `EFFECT_TYPES` 옵션, 현재값 selected.
- 진정한모습 `mg-check`: `data-action="toggleTrueForm"`, `is-on`은 `trueFormRevealed`로.

### 2. statrail + portcol

- **`mg-portcol`** 신설: 초상화 + 카운터행(공적점/마화)을 한 컬럼으로 묶는다.
  카운터는 statrail에서 제거하고 portcol로 이동.
- **statrail 강조/순서**: 공격/방어/근원 `mg-stat--key`; 마력 `mg-gauge--key`;
  일시 마력 `mg-gauge--muted`; 계제 `mg-stat--rank mg-stat--muted`.
  순서: 능력치행 → 마력 → 일시 마력 → 계제.
- `mg-headband` 그리드 컬럼: portcol | identity-grid | statrail.

### 3. SCSS (신규)

`mg-ident-select`(+`--wide`), `mg-portcol`, `mg-field--lg`, `mg-field--box`,
`mg-stat--key`/`mg-stat--muted`, `mg-gauge--key`/`mg-gauge--muted`, `mg-counter--muted`.
시안 `magilogi_2.html`의 다크 토큰 기준 값(`scss/component/_components.scss`,
`scss/sheet/_layout.scss`에 기존 컴포넌트 옆에 배치).

### 4. 시트 로직 (`actor-sheet.mjs`)

- `_prepareContext`에 `context.careerOptions = CONFIG.MAGICALOGIA.CAREER_OPTIONS`,
  `context.orgOptions = CONFIG.MAGICALOGIA.ORG_OPTIONS`,
  `context.effectTypes = CONFIG.MAGICALOGIA.EFFECT_TYPES` 추가.
- 새 액션 `toggleTrueForm`: `system.trueFormRevealed`를 반전(기존 `#onToggleStatus` 패턴).
  `actions`에 등록.
- datalist/select/`soulSkill` 텍스트는 `name` 바인딩 + `submitOnChange`로 저장(추가 액션 없음).

## 데이터 흐름

입력 위젯 → `submitOnChange` → `#onSubmit`(`actor.update(formData.object)`).
`trueFormRevealed`만 클릭 액션 → `actor.update({ "system.trueFormRevealed": !cur })`.

## 검증

- `npm run build` 성공, 기존 `npm test`(38개) 회귀 없음.
- Foundry 실렌더로 시안(다크 프레임) 대조: 식별그리드 배치, datalist/select 동작,
  진정한모습 체크 토글, portcol/강조 위계 표시, 게이지·카운터 입력.
- `docs/design/example.html`을 개편된 헤더로 동기화(디자이너 전달용).

## 범위 밖

- 라이트 테마(④), 정보 탭(③, ② 직후 별도 진행), 속성·능력 탭.
- 시트 액션 단위테스트 인프라 신설(기존 `toggleStatus` 등도 무테스트 — YAGNI).
- `mg-statbar*` 클래스(시안 미사용, 로드맵에서 제외).
