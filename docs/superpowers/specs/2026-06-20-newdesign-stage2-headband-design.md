# 설계 — 새 시안 Stage 2 (헤더밴드 델타)

> 2026-06-20 · 브랜치 `develop` · 시안 출처: `docs/design/new/`(gitignore — `actor-sheet.hbs` + `styles/magicalogia.css` + `templates/partials/` + `assets/divider.png`가 시각·구조 기준).
> S1(토큰/폰트/프레임) 완료·푸시(`449d348..7482485`). 이 문서 = Stage 2 상세. 공통 결정은 S1 로드맵 스펙(`2026-06-19-newdesign-roadmap-and-stage1-design.md`)을 계승.

## 배경

S1이 토대(토큰·Pretendard·골드 프레임)를 깔았다. S2는 헤더밴드(캐릭터 시트 상단부)를 시안 수준으로 끌어올린다. 시안은 `docs/design/new/templates/actor-sheet.hbs`(Foundry 변환판)와 `styles/magicalogia.css`로 명확한 청사진을 제공하므로, 컴포넌트별로 마크업 재바인딩 + 시안 SCSS 이식을 적용한다. 핵심 차이: 현재 헤더밴드는 평면적 스탯/게이지·빈 초상화 모서리·숫자만 있는 계제인데, 시안은 골드헤더 스탯/게이지·SVG 필리그리 초상화·등급명+플로리시 계제·divider를 갖는다.

## 공통 결정 (S1 계승)

- **데이터 모델 유지 + 템플릿 재바인딩** (마이그레이션 없음). 시안 `system.*` 경로는 예시 — 기존 경로에 매핑.
- **SCSS 분할 + Vite 유지**. 시안 단일 CSS를 그대로 쓰지 않고 `scss/`에 내용만 이식.
- **V1 관용구 → V2 액션**. 시안 `data-edit="img"` → 현행 `data-action="editImg"`(이미 적용됨).
- **폰트/토큰**은 S1 결과 사용. `--mg-head-bg`/`--mg-head-ink`(S1에서 정의만 함)를 S2에서 소비.
- 커밋 메시지: 영어 한 줄, co-author 없음.

### 데이터 경로 매핑 (시안 → 현재 모델)

| 시안 경로                                  | 현재 모델 경로                                     |
| ------------------------------------------ | -------------------------------------------------- |
| `system.attack` / `.defense` / `.source`   | `system.abilities.attack` / `.defense` / `.source` |
| `system.mana.value` / `.max`               | `system.mp.value` / `.max`                         |
| `system.tempMana`                          | `system.tempMp`                                    |
| `system.rank`                              | 동일 (NumberField, initial 1)                      |
| `{{rankTitle}}` 헬퍼 / `config.rankTitles` | **S2에서 신설** (아래 ①)                           |

## Stage 2 상세 설계

**목표:** 헤더밴드의 6개 컴포넌트를 시안 구조로 재작성하되 데이터는 현행 경로에 재바인딩. 시트는 계속 정상 렌더.

### ① 데이터 계층 — `rankTitle`

- `module/helpers/config.mjs`: `CONFIG.MAGICALOGIA.rankTitles` 객체 신설(시안 `magicalogia-config.js` 값 그대로):
  ```js
  rankTitles: {
    1:"입문자 (Neophyte)", 2:"열성자 (Zelator)", 3:"이론자 (Theoricus)",
    4:"실천자 (Practicus)", 5:"철학자 (Philosophus)", 6:"소관문 (Adeptus Minor)",
    7:"대관문 (Adeptus Major)", 8:"면관문 (Adeptus Exemptus)", 9:"대사 (Magister)", 10:"마도사 (Magus)"
  }
  ```
- `module/sheets/actor-sheet.mjs` `_prepareContext`: 기존 `context.statuses`/`context.careerOptions` 주입 옆에 추가:
  ```js
  context.rankTitle = CONFIG.MAGICALOGIA.rankTitles[Number(sys.rank)] ?? "";
  ```
  (시안 V1의 `ctx.rankTitle = …[Number(ctx.system.rank)] ?? ""`와 동치.)
- 등급명은 한국어+라틴 풀텍스트 그대로 노출(좁은 타일이지만 `.mg-rank__sub` 9.5px + 줄바꿈 허용으로 수용 — 사용자 결정).

### ② 초상화 SVG 필리그리

- 신규 partial `templates/actor/parts/mg-svg-pcorner.hbs` — 시안 `templates/partials/mg-svg-pcorner.hbs` SVG 그대로(60×60 viewBox, `stroke="currentColor"`).
- `module/helpers/templates.mjs` `loadTemplates` 배열에 partial 경로 추가.
- `templates/actor/character-sheet.hbs` 초상화(`.mg-portrait`): 현재 빈 `.mg-corner` 4개를 `.mg-pcorner` 4개로 교체, 각 안에 `{{> "systems/magicalogia/templates/actor/parts/mg-svg-pcorner.hbs"}}`. **img 유무와 무관하게 항상 표시**(`{{#if actor.img}}img{{else}}glyph/hint{{/if}}`는 유지, pcorner는 그 바깥에 항상).
- `scss/component/_components.scss`: 기존 `.mg-corner*` 규칙 제거, 시안 `.mg-portrait .mg-pcorner`(30×30, z-index 2, `--tl/--tr/--bl/--br` 변형자 3px 오프셋 + scaleX/Y/scale 플립) + `.mg-pcorner svg` 이식. `.mg-portrait` box-shadow(이중 inset 골드선)도 시안값으로 갱신.

### ③ 게이지 head/body 재구조화

- 마크업(`.mg-statrail`의 마력/일시마력): 평면 게이지 → 시안 2분할
  ```hbs
  <div class="mg-gauge">
    <div class="mg-gauge__head"><span class="mg-gauge__icon">◈</span>마력</div>
    <div class="mg-gauge__body">
      <input class="mg-gauge__value" name="system.mp.value" value="{{system.mp.value}}" />
      <span class="mg-gauge__sep">/</span>
      <input class="mg-gauge__max" name="system.mp.max" value="{{system.mp.max}}" />
    </div>
  </div>
  ```
  일시마력은 `__head`(◇ 일시 마력) + `__body`(`system.tempMp` input 1개, sep/max 없음).
- 현행 `.mg-gauge--key`/`.mg-gauge--muted` 변형자는 제거(시안은 단일 스타일). 데이터 경로 현행 유지.
- `_components.scss`: 시안 `.mg-gauge`(골드테두리) / `.mg-gauge__head`(`--mg-head-bg`/`--mg-head-ink`) / `.mg-gauge__body`(`--mg-field`) / `__icon`/`__value`/`__sep`/`__max` 이식. 현재 평면 게이지 스타일 교체. value/max는 `<input>`이라 width/배경 정규화 필요(현 statrail input 패턴 계승).

### ④ 스탯 타일 골드헤더

- 마크업(공격/방어/근원): 현 마크업 그대로 유지 — `<label class="mg-stat mg-stat--key">` + `.mg-stat__label` + `.mg-stat__value` input. `--key` 클래스 유지(큰 값 폰트 트리거). 변경 없음.
- `_components.scss`(핵심): `.mg-stat`(골드테두리, flex column) / `.mg-stat__label`(`--mg-head-bg`/`--mg-head-ink`, 골드헤더) / `.mg-stat__value`(`--mg-field`) 시안값 이식. 현재 `--key`에만 있던 골드테두리를 `.mg-stat` 기본으로 올려 전 스탯 통일. `.mg-stat--key .mg-stat__value` 큰 폰트(시안 20px)는 유지. 즉 S2 ④는 사실상 SCSS-only 변경.

### ⑤ 계제 타일 재구조화 — `.mg-rank`

- 마크업: 현재 `.mg-stat--rank`(숫자 input) → 시안 `.mg-rank`:
  ```hbs
  <div class="mg-rank">
    <div class="mg-rank__label">계제</div>
    <div class="mg-rank__body">
      <div class="mg-rank__flourish">{{> "systems/magicalogia/templates/actor/parts/mg-svg-rankflr.hbs"}}</div>
      <input class="mg-rank__value" name="system.rank" value="{{system.rank}}" />
      <div class="mg-rank__sub">{{rankTitle}}</div>
    </div>
  </div>
  ```
- 신규 partial `templates/actor/parts/mg-svg-rankflr.hbs` — 시안 `mg-svg-rankflr.hbs`(120×12 viewBox) 그대로. `templates.mjs`에 등록.
- `_components.scss`: 시안 `.mg-rank`/`__label`(골드헤더)/`__body`(field)/`__flourish`(골드 SVG, height 11px)/`__value`(골드 22px input)/`__sub`(`--mg-soft` 9.5px, 풀텍스트) 이식. `__value`는 `<input>`이라 폭/배경 정규화.

### ⑥ divider

- 에셋: `docs/design/new/assets/divider.png` → `assets/divider.png` 복사 후 **git 커밋**(바이너리; 시안 폴더는 gitignore라 따로 동봉해야 배포됨).
- 마크업: 헤더밴드(`.mg-headband`)와 상태이상(`.mg-status`) 사이에 삽입:
  ```hbs
  <div class="mg-divider"><img src="systems/magicalogia/assets/divider.png" alt="" /></div>
  ```
- `_components.scss`: 시안 `.mg-divider`(flex center, margin 6px 0 4px) / `.mg-divider img`(width 100%, max-width 560px) 이식.

## 검증

- `npm run build` 성공(SCSS 에러 0, `dist/magicalogia.css` 생성).
- `npm test` 무회귀(48 통과 유지 — config/시트 컨텍스트 추가가 기존 모델 테스트에 영향 없어야 함; rankTitle 주입 로직에 단위 테스트가 적합하면 plan에서 추가 고려).
- Foundry 실렌더: 초상화 4모서리 SVG 필리그리, 골드헤더 스탯/게이지, 계제 타일에 등급명(`{{rankTitle}}`)+플로리시 SVG, divider 이미지 표시. 기존 정체성 그리드/마법표/탭 레이아웃 무손상.

## 비목표 (후속 스테이지)

- `mg-svg-miniflr` 푸터 플로리시, 상태칩 색 마크(`mg-status__mark`), 마법표 열 SVG 아이콘 → **S3**.
- 탭 재편(main/info/속성)·장서·관계 아코디언화·정보 탭 → **S4**.
- 라이트 테마 → **S5**.

## 함정 / 참고

- `docs/design/`은 gitignore — 시안 SVG/asset은 partial 신설·에셋 복사로 시스템에 들여와야 배포에 포함됨.
- `system.rank`는 NumberField(initial 1). `rankTitle` 헬퍼는 `Number(sys.rank)`로 조회, 범위 밖(0·11+)이면 빈 문자열(시안과 동일 `?? ""`).
- partial 신설 시 `templates.mjs` 등록 누락하면 `{{> …}}`가 조용히 빈 출력 → 실렌더에서 SVG 안 보임. 등록 확인.
- 게이지/계제 `<input>`은 시안 `<div>`와 달리 브라우저 기본 폭/배경이 있어 정규화 필요(현 `.mg-statrail input` 패턴 계승).
- Foundry 스타일/템플릿 변경은 F5로 충분(documentTypes 변경 아님). partial 신규 등록은 시스템 리로드(F5) 후 반영.

## 참고 경로

- 시안(gitignore): `docs/design/new/{templates/actor-sheet.hbs, templates/partials/mg-svg-{pcorner,rankflr}.hbs, styles/magicalogia.css, scripts/magicalogia-config.js, assets/divider.png}`
- 현재 템플릿: `templates/actor/character-sheet.hbs`(헤더밴드 line 27~136), partial 디렉토리 `templates/actor/parts/`
- 현재 SCSS: `scss/component/_components.scss`(`.mg-stat` 97~, `.mg-gauge` 147~, `.mg-portrait`/`.mg-corner` 277~)
- 현재 데이터/시트: `module/helpers/config.mjs`, `module/helpers/templates.mjs`, `module/sheets/actor-sheet.mjs`(`_prepareContext` 61~)
