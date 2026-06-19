# 핸드오프 — 탭 시스템 · 장서/관계 탭 (2026-06-19, 오후)

> 같은 날 오전 핸드오프(`2026-06-19-sheet-redesign.md`)의 후속.
> 브랜치: `develop`. 새 세션/다른 PC에서 이어가기 위한 노트.

## 0. 새 세션에서 먼저 할 일

`dist/`·`node_modules/`는 git 추적 대상이 아니다(`.gitignore`). 클론/풀 후:

```bash
npm install
npm run build      # vite + 팩 빌드 → dist/ 생성 (Foundry가 읽는 dist/magicalogia.css)
npm test           # 31개 통과 확인
```

`docs/design/`도 이제 **추적 제외**(이번 세션에 `.gitignore` 추가). 디자인 시안은
로컬에만 있으니 다른 PC에는 없을 수 있다.

## 1. 이 세션 작업 요약 (커밋)

| 해시      | 내용                                                                    |
| --------- | ----------------------------------------------------------------------- |
| `eaff3d0` | fix: `.mg-content` flex-shrink로 잘리던 시트 스크롤 복구                |
| `b09b594` | feat: 매직 차트 소속영역 양옆 gap 강조(`--mg-hi-soft`/`--mg-hi-strong`) |
| `1f279f3` | feat: spell 스키마에 `active` 플래그 추가(TDD)                          |
| `3514262` | feat: **V2 네이티브 탭 도입** + 게이지 값 잘림 수정                     |
| `1660a86` | style: 장서 테이블 스타일                                               |
| `a83f250` | feat: 장서 탭 + 새 시안 정렬(용어 "마도서대전 TRPG" 등)                 |
| `e04adcd` | docs: `example.html`을 현재 시트와 동기화                               |
| `6df27ba` | chore: `docs/design/` 추적 제외                                         |
| `24e3078` | feat: 관계 탭 + 데이터테이블 SCSS 일원화                                |

설계/계획 문서: `docs/superpowers/specs/2026-06-19-grimoire-tab-design.md`,
`docs/superpowers/plans/2026-06-19-grimoire-tab.md`.

## 2. 핵심 구현 & 함정 (다음 작업자 필독)

### 탭 시스템 (Foundry v13 네이티브)

- `actor-sheet.mjs`의 `static TABS = { primary: { tabs:[main, grimoire, relations], initial:"main" } }`.
- `_prepareContext`에서 `context.tabs.{id}.active`를 직접 만들어 템플릿이 `active` 클래스를 판단.
- **함정 1**: nav 컨테이너에 반드시 **`tabs` 클래스**가 있어야 한다(`<nav class="mg-tabs tabs" data-group="primary">`).
  코어 `changeTab`이 `.tabs > [data-group][data-tab]`로 nav 요소를 찾기 때문 — 없으면
  "No matching tab element" 오류.
- **함정 2**: 활성 표시는 **`active` 클래스**다(`is-active` 아님). `changeTab`이 `active`를 토글한다.
  초기 템플릿도 `active`를 부여(`{{#if tabs.x.active}}active{{/if}}`). 표시/숨김 규칙은
  `scss/sheet/_sheet.scss`의 `.mg-tab-content > .tab(.active)`.

### 장서/관계 탭 (현재 ArrayField 기반)

- 데이터는 `character` DataModel의 `spells` / `anchors` ArrayField. UI는 시트 내 인라인 편집.
- CRUD는 모두 **배열 deepClone → 전체 `actor.update`** 패턴(폼 인덱스 바인딩 회피).
  - 액션: `add-spell`/`toggle-spell-flag`/`set-charge`/`add-anchor`/`toggle-anchor`.
  - 행 삭제는 **우클릭 `ContextMenu`**(`_onRender`에서 `.mg-grimoire`/`.mg-relations` 행에 각각 바인딩).
- 장서 충전은 **링(동그라미) 클릭으로 증감**(별점식). `_prepareContext`에서 `rings` 표시 데이터를
  미리 만들고, `set-charge`가 `charge` 값을 갱신(`CHARGE_SLOTS = 6`).
- 효과는 인라인 컬럼이 아니라 **행 아래 note row**로 유지(의도적 결정).
- 타입은 `소환/주문/장비` select(`CONFIG.MAGICALOGIA.spellTypes`). 속성(anchor)은 자유 텍스트.
- **장서/관계는 추후 Item 문서 방식으로 전환 예정** — 그래서 위 CRUD는 더 정교화하지 않는다.
  (메모리: `grimoire-item-migration`. 디자인 안정 후 별도 spec/plan으로 진행.)

### SCSS 데이터테이블 일원화

- 데이터테이블(`.mg-table*`)은 `scss/component/_grimoire.scss` **한 곳**으로 통합했다.
  (이전엔 `_components.scss`에도 중복 존재 → 제거함.)

## 3. 현재 상태

- 빌드 성공, **테스트 31개 통과**.
- 동작 탭: **캐릭터 시트 / 장서 / 관계** (3개). 개요·정보 / 속성·능력은 `is-disabled` 유지.
- Foundry 실렌더 확인 완료(스크롤·탭 전환·장서/관계 CRUD·게이지·gap 강조).
- `example.html`은 현재 시트(다크) 스냅샷으로 동기화됨 — 디자이너 전달용.

## 4. 남은/후속 작업 (오픈)

- **개요·정보 / 속성·능력 탭** 구현(현재 비활성).
- **라이트 테마(`theme-light`) 이식** — 시안 토큰엔 존재, 시스템 미이식. `example.html`도 다크만.
- **효과 dots 토글** — 헤더 효과 영역의 정적 dots를 데이터 연동(현재 장식).
- **장서/관계 Item 전환** — 디자인 안정 후(위 메모리 참조).
- 전역 `.mg-check`(`_components.scss`)와 `.mg-table .mg-check`(`_grimoire.scss`) 중복 여부 점검(소소).

## 5. 참고 경로

- 시트 클래스: `module/sheets/actor-sheet.mjs` (탭/CRUD/ContextMenu)
- 데이터 모델: `module/data/actors/character.mjs`
- 템플릿: `templates/actor/character-sheet.hbs`, `parts/grimoire.hbs`, `parts/relations.hbs`, `parts/magic-chart.hbs`
- 스타일 엔트리: `scss/magicalogia.scss` → `dist/magicalogia.css`
- 설정 상수: `module/helpers/config.mjs` (attributes/statuses/spellTypes/anchorAttrs)
