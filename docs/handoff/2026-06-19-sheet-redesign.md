# 핸드오프 — 캐릭터 시트 시안 정렬 & V2 렌더 수정 (2026-06-19)

> 다른 PC에서 오늘 작업을 이어가거나 확인하기 위한 인수인계 노트.
> 브랜치: `develop`

## 0. 다른 PC에서 먼저 할 일 (중요)

`dist/`와 `node_modules/`는 **git 추적 대상이 아니다**(`.gitignore`).
클론/풀 직후 Foundry가 읽는 `dist/magicalogia.css`가 없으므로 반드시 빌드한다.

```bash
npm install
npm run build      # vite 빌드 + 팩 빌드 → dist/ 생성
npm test           # 29개 통과 확인
```

Foundry에 시스템을 연결하려면 `npm run link:foundry`(tools/link-to-foundry.mts) 참고.

## 1. 오늘 한 일 요약

ApplicationV2 캐릭터 시트가 (1) 잘못된 위치에 렌더되고 (2) 디자인 시안
(`docs/design/`)과 어긋나 있던 것을 바로잡았다.

### 커밋

| 해시      | 내용                                                                   |
| --------- | ---------------------------------------------------------------------- |
| `bec3b3e` | refactor(config): 어둠을 일반 속성으로 처리(미사용 `dark` 플래그 제거) |
| `c1f3689` | feat(sheet): 캐릭터 시트 시안 정렬 + V2 렌더 수정                      |
| (이 문서) | docs: 핸드오프 노트 추가                                               |

## 2. 변경 상세

### A. V2 렌더링 버그 수정

- **창 위치 버그**: 루트 `.magicalogia`(= `form.application`)에 있던
  `position: relative; width: 100%`가 코어 `.application { position: fixed }`를
  덮어써 창이 일반 문서 흐름으로 떨어졌다(사이드바 우측/`</body>` 직전 노출).
  → 루트에서 두 속성 제거, 셸 시각 스타일은 자식 `.mg-content`로 스코프.
  - `scss/global/_base.scss`
- **중첩 form 제거**: `DocumentSheetV2`의 루트 태그가 이미 `<form>`이라
  파트 템플릿의 `<form>`은 무효한 중첩이었다. → 파트 래퍼를 `<div>`로 교체.
  - `templates/actor/character-sheet.hbs`, `templates/item/generic-sheet.hbs`
  - `scss/sheet/_sheet.scss`: `.window-content > form` → `.window-content > div`
  - 폼 제출은 루트 form이 담당하므로 동작 영향 없음(input은 루트 form 자손).

### B. 매직 차트 시안 정렬 (`scss/component/_magic-chart.scss`)

- 차트 테두리 line→gold, 헤더/푸터 골드 라인 1px→2px, 헤더·푸터 배경 추가.
- 열 헤더 `.num`(9px soft)/`.title`(14px 700 bar-ink), 출목 인덱스 셀
  중앙·700·soft·tabular, 비용 `.tn` 골드·우측정렬·tabular·min-width 13px.
- 셀 padding `0 7px`, gap 5px, 체크 13px, 셀 구분선 `border-top`.

### C. 영역 gap 컬럼 (신규)

- 그리드 `30px repeat(6,1fr)` → **`30px 1fr repeat(5, 6px 1fr)`**.
- 속성 열 **사이마다** 빈 `<div class="mg-chart__gap">` 5개 삽입
  (`templates/actor/parts/magic-chart.hbs`, `{{#unless @first}}`).
- gap 색은 **단일 골드 틴트** `var(--mg-hi)`(골드 18%). 그리드 stretch로
  헤더~셀 전체 높이를 채우는 세로 색 띠 → "시트에 색을 칠한" 느낌.
- 출목│첫 속성 경계는 gap 대신 `.mg-chart__index { border-right: 1px gold }`.

### D. 헤드밴드

- 스탯 값 `<input class="mg-stat__value">`에 `width:100%`
  (시안은 `<div>`라 폭이 박스를 채움 → input도 동일하게).
  - `scss/component/_components.scss`
- 효과 필드에 시안의 토글 dots(○○) 추가 — **현재는 정적 장식**
  (데이터/토글 미연결, 시안도 동일).
- 계제를 스탯 행에서 분리해 단독 `.mg-stat-row`로. 스탯 행은
  공격/방어/근원 3칸(시안 일치), 계제는 `.mg-stat--rank`(골드 값) 재사용.
  - `templates/actor/character-sheet.hbs`

### E. 설정 (`module/helpers/config.mjs`)

- `MAGICALOGIA.attributes`의 미사용 `dark` 플래그 제거, 어둠은 특수처리
  없이 일반 속성과 동일 렌더임을 주석에 명시.

## 3. 현재 상태

- 빌드 성공, 테스트 29개 통과.
- **Foundry 실제 렌더는 미확인** — 아래는 눈으로 확인 필요.

## 4. 열어서 확인할 것 (직접 검증 권장)

1. 시트를 열어 창이 정상 플로팅하는지(사이드바 우측 노출 없음).
2. 필드 값 수정 시 저장·유지되는지(중첩 form 제거 후 제출 동작).
3. 매직 차트 gap 색 띠가 헤더~셀 전체 높이를 채우는지(그리드 stretch 의존).
4. gap 골드 틴트 채도가 의도와 맞는지 — 조정 시 `.mg-chart__gap` 배경 또는
   `--mg-hi` 토큰.
5. 효과 dots 위치, 계제 단독 행 모양.

## 5. 남은/후속 작업 (오픈)

- 효과 dots에 실제 토글 기능이 필요하면 데이터 필드 + action 추가.
- 계제 행을 가로형(라벨 좌·값 우)으로 원하면 전용 modifier 필요
  (기존 스탯 `width:100%`와 충돌 처리 동반).
- 장서/관계 등 비활성("준비 중") 탭 구현.
- 라이트 테마(`theme-light`) 미이식(시안 토큰에는 존재).

## 6. 참고 경로

- 디자인 시안: `docs/design/`(`example.html`, `styles/`, `templates/`)
- 시스템 SCSS 엔트리: `scss/magicalogia.scss` → `dist/magicalogia.css`
- 시트 클래스: `module/sheets/actor-sheet.mjs`, `item-sheet.mjs`
