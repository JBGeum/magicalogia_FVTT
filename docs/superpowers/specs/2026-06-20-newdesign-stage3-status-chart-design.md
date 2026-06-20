# 설계 — 새 시안 적용 Stage 3 (상태칩 마크 + 마법표 아이콘 + 푸터 플로리시)

> 2026-06-20 · 브랜치 `develop` · 시안 출처: `docs/design/new/`(gitignore — `example.html` + `styles/magicalogia.css`가 시각 기준).
> 로드맵: `2026-06-19-newdesign-roadmap-and-stage1-design.md`. 직전 단계: S2(`2026-06-20-newdesign-stage2-headband-design.md`).

## 목표

새 시안의 S3 델타 세 가지를 적용한다. 모두 시안을 충실히 이식하며, **데이터 모델·토큰 변경 없음**. 마크업/SCSS/SVG partial만 수정한다.

1. 상태이상 칩에 골드 체크박스 마크(`mg-status__mark`).
2. 마법표 6열 헤더에 속성 SVG 아이콘(별/짐승/힘/노래/꿈/어둠).
3. 마법표 푸터 라벨에 플로리시 SVG(`mg-svg-miniflr`).

끝나면 시트는 계속 정상 렌더된다.

## 공통 결정 적용 (로드맵 §공통결정)

- SVG는 `templates/actor/parts/`의 partial로 분리(S2 패턴 `mg-svg-pcorner`/`mg-svg-rankflr`와 일관). config.mjs에 SVG 문자열을 넣지 않는다.
- partial 신설 시 `module/helpers/templates.mjs` `loadTemplates`에 경로 등록 필수(누락 시 `{{> …}}`가 조용히 빈 출력 — S2 함정).
- 토큰은 이미 정의됨(`--mg-faint` #7d6aa8, `--mg-check` #e0c074, `--mg-line`, `--mg-gold`, `--mg-panel`). 신설 없음.
- `eq` 헬퍼는 이미 마법표에서 사용 중(존재 확인됨).

## 변경 파일·내용

### ① 상태칩 골드 체크박스 마크

**마크업 — `templates/actor/character-sheet.hbs`** (상태칩, 현재 line 136~143)

각 칩의 label 텍스트 앞에 mark span을 추가한다. `data-action="toggleStatus"`·`data-status`·구조는 그대로(마크는 순수 시각 요소).

```hbs
<span
  class="mg-status__chip {{#if this.active}}is-active{{/if}}"
  data-action="toggleStatus"
  data-status="{{this.key}}"
>
  <span class="mg-status__mark">✓</span>{{this.label}}
</span>
```

**SCSS — `scss/component/_components.scss`** (`.mg-status` 블록 확장, 현재 line 301~334)

시안 `magicalogia.css`의 `.mg-status__chip`/`.mg-status__mark` 규칙을 이식한다.

- `.mg-status__chip`: `display:inline-flex; align-items:center; gap:5px`(마크↔라벨 간격). 기본 `color:var(--mg-faint)`(현행 유지), 비활성 시 마크 안의 ✓는 숨김.
- `.mg-status__mark`: `width:14px; height:14px; flex:none; border:1.5px solid var(--mg-line); border-radius:4px; display:inline-flex; align-items:center; justify-content:center; font-size:9px; line-height:1; color:transparent; transition:background .15s ease, border-color .15s ease, color .15s ease`.
- `.mg-status__chip:hover` → `color:var(--mg-soft)`; `.mg-status__chip:hover .mg-status__mark` → `border-color:var(--mg-gold)`.
- `.mg-status__chip.is-active` → `color:var(--mg-gold); font-weight:700`(현행 유지); `.is-active .mg-status__mark` → `background:var(--mg-check); border-color:var(--mg-check); color:var(--mg-panel)`(✓ 노출).

### ② 마법표 헤더 SVG 아이콘

**신규 partial — `templates/actor/parts/mg-svg-chart-icon.hbs`**

`key`를 hash param으로 받아 6분기로 해당 속성 SVG 하나를 출력한다(13px 기준 viewBox 16×16). 시안 `ICON` 객체의 path를 그대로 이식.

```hbs
{{#if (eq key "star")}}<svg viewBox="0 0 16 16"><path
      fill="currentColor"
      d="M8 1l1.8 4.1 4.5.4-3.4 3 1 4.4L8 12.6 4.1 13.3l1-4.4-3.4-3 4.5-.4z"
    /></svg>
{{else if (eq key "beast")}}<svg viewBox="0 0 16 16" fill="currentColor"><ellipse
      cx="8"
      cy="11"
      rx="3.4"
      ry="2.6"
    /><circle cx="3.4" cy="7.6" r="1.5" /><circle cx="12.6" cy="7.6" r="1.5" /><circle
      cx="6"
      cy="4.4"
      r="1.4"
    /><circle cx="10" cy="4.4" r="1.4" /></svg>
{{else if (eq key "force")}}<svg viewBox="0 0 16 16"><path
      fill="currentColor"
      d="M9.5 1L3 9h3.2l-1 6 6.3-9H8.3z"
    /></svg>
{{else if (eq key "song")}}<svg viewBox="0 0 16 16" fill="currentColor"><path
      d="M6 2.2l7-1.6v8.7a2.4 2.4 0 1 1-1.4-2.2V3.1L7.4 4v6.6A2.4 2.4 0 1 1 6 8.4z"
    /></svg>
{{else if (eq key "dream")}}<svg viewBox="0 0 16 16"><path
      fill="currentColor"
      d="M11.2 1A6 6 0 1 0 15 11.4 6.5 6.5 0 0 1 11.2 1z"
    /></svg>
{{else if (eq key "dark")}}<svg viewBox="0 0 16 16"><path
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      d="M1.3 8S4 3.6 8 3.6 14.7 8 14.7 8 12 12.4 8 12.4 1.3 8 1.3 8z"
    /><circle cx="8" cy="8" r="2" fill="currentColor" /></svg>
{{/if}}
```

**등록 — `module/helpers/templates.mjs`**: `loadTemplates` 배열에 `"systems/magicalogia/templates/actor/parts/mg-svg-chart-icon.hbs"` 추가.

**마크업 — `templates/actor/parts/magic-chart.hbs`** (`.mg-chart__head`, 현재 num 앞)

```hbs
<div class="mg-chart__head">
  <span class="ico">{{> mg-svg-chart-icon key=this.key}}</span>
  <span class="num">{{this.num}}</span>
  <span class="title">{{this.title}}</span>
</div>
```

(데이터 변경 없음 — `attributes`에 `key`(star/beast/force/song/dream/dark) 이미 존재.)

**SCSS — `scss/component/_magic-chart.scss`** (`.mg-chart__head`)

- `.mg-chart__head`: `gap:5px`, `justify-content:center; align-items:center`(아이콘·번호·제목 가로 정렬). 기존 height(`--mg-head-h`)·border-bottom 유지.
- `.mg-chart__head .ico`: `color:var(--mg-gold); display:flex; align-items:center; line-height:1`.
- `.mg-chart__head .ico svg`: `display:block; width:13px; height:13px`.

### ③ 푸터 플로리시

**신규 partial — `templates/actor/parts/mg-svg-miniflr.hbs`** (시안 `example.html` miniflr 그대로)

```hbs
<svg viewBox="0 0 40 16" width="32" height="13" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
    <path d="M2 8 c8 0 8 -5 14 -5 c5 0 5 6 -1 6" />
    <path d="M38 8 c-8 0 -8 -5 -14 -5 c-5 0 -5 6 1 6" />
  </g>
  <path d="M20 4 l4 4 l-4 4 l-4 -4 z" fill="currentColor" />
</svg>
```

**등록 — `module/helpers/templates.mjs`**: `"systems/magicalogia/templates/actor/parts/mg-svg-miniflr.hbs"` 추가.

**마크업 — `templates/actor/parts/magic-chart.hbs`** (`.mg-chart__footer`의 "소속영역"·"혼의 특기" 두 label)

각 label 텍스트 앞에 삽입:

```hbs
<label><span class="mg-flourish">{{> mg-svg-miniflr}}</span>소속영역 …</label>
<label><span class="mg-flourish">{{> mg-svg-miniflr}}</span>혼의 특기 …</label>
```

**SCSS** (`_magic-chart.scss` 또는 `_components.scss` — 푸터 인접 위치 권장)

- `.mg-flourish`: `color:var(--mg-gold); display:inline-flex; align-items:center`.
- `.mg-flourish svg`: `display:block`.

## 검증

- `npm run build` 성공(SCSS 에러 없음, `dist/magicalogia.css` 생성).
- `npm test` 48 통과 유지(SCSS/템플릿/partial 변경 — 모델 테스트 무관).
- Foundry 실렌더(F5 — partial 신설이라 템플릿 재로드 필요, documentTypes 미변경이므로 서버 재시작 불필요):
  - 상태칩: 각 칩 앞 골드 체크박스. 비활성=빈 테두리, hover=골드 테두리, 클릭(toggleStatus)→`--mg-check` 채움 + ✓ 노출. 토글 동작 무손상.
  - 마법표: 6열 헤더에 골드 SVG 아이콘(별/짐승/힘/노래/꿈/어둠) + 번호 + 제목 가로 정렬. is-domain 강조·셀·체크 무손상.
  - 푸터: "소속영역"·"혼의 특기" 라벨 앞 골드 플로리시.
  - 헤더밴드(S2)·프레임 모서리(S1)·탭·카운터 무손상.

## 비목표 (후속 스테이지)

- 탭 재편·장서/관계 아코디언화·정보 탭(S4).
- 라이트 테마(S5).
- 상태칩 외 다른 칩, 마법표 셀 동작/롤 변경.

## 함정 / 참고

- partial 신규 등록을 `loadTemplates`에 빠뜨리면 `{{> …}}`가 조용히 빈 출력(실렌더에서 SVG 안 보임) — S2에서 겪은 함정.
- 마법표 SCSS는 `scss/component/_magic-chart.scss`에 집중(S2 statrail처럼 `_layout.scss`로 분산되지 않음 — 확인됨).
- 상태칩 SCSS는 `scss/component/_components.scss`의 `.mg-status` 블록에 위치.
- `docs/design/`은 gitignore — 시안 SVG는 partial 신설로 시스템에 들여와야 배포 포함.
- 커밋 메시지: 영어 한 줄, co-author 없음. lint-staged(prettier)가 커밋 시 md·SCSS·hbs 자동 정렬(정상).
