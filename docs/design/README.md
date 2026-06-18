# Handoff: 마기카로기아 (Magicalogia) — Foundry VTT 액터 시트

## Overview
파토서대전 TRPG **「마기카로기아」**의 Foundry VTT **액터 시트** 디자인입니다. 마법사·마법서·도서관 테마의 그리모어풍 시트로, 핵심은 6속성(별·짐승·힘·노래·꿈·어둠) **마법표(특기 표)**입니다. 표준 Foundry 창 폭(720px)·세로 스크롤을 기준으로 하며, 3개 탭(**캐릭터 시트 · 장서 · 관계**)과 비활성 자리(개요·정보 / 속성·능력)를 둡니다.

## About the Design Files
이 번들의 파일들은 **HTML/CSS로 만든 디자인 레퍼런스**입니다 — 의도한 외형·구성을 보여주는 프로토타입이며, 그대로 납품하는 프로덕션 코드가 아닙니다. 목표는 이 디자인을 **대상 코드베이스(여기서는 Foundry VTT 시스템)의 기존 패턴**으로 재현하는 것입니다. 제공된 `.scss`/`.hbs`/`.js`는 바로 쓸 수 있는 출발점에 가깝지만, **시스템 ID·데이터 모델(template.json)·Foundry 버전**(ApplicationV1 vs. ApplicationV2/Handlebars)에 맞게 조정해야 합니다.

## Fidelity
**High-fidelity.** 색·타이포·간격·테두리·상태 하이라이트까지 최종값으로 명시되어 있습니다. 픽셀에 가깝게 재현하되, 데이터 바인딩·이벤트는 Foundry 시스템 규약에 맞춰 구현하세요.

## 테마 결정 (중요)
- **다크 모드 = `theme-dark` (마법진 · 바이올렛)** — 딥 바이올렛 + 골드, 배경에 동심원/팔각 **소환진** 문양.
- **라이트 모드 = `theme-light` (장서 · 양피지)** — 따뜻한 양피지 + 갈색/골드, 배경에 고서 **결·빛바램** 텍스처.
- 두 테마는 **루트 클래스만** 다릅니다(`.magicalogia.theme-dark` / `.magicalogia.theme-light`). 각 테마는 `--mg-*` CSS 커스텀 프로퍼티만 재정의하고, 모든 컴포넌트가 그 토큰을 읽으므로 클래스 한 줄로 전체가 리스킨됩니다. 배경 장식은 `--mg-deco`로 주입되어 `.magicalogia::before`에 깔립니다.

## Layout (기준: C / 대시보드)
캐릭터 시트 탭은 **밀집 헤더 밴드 → 상태이상 스트립 → 특기/설정 서브탭 → 마법표 → 메모·각종 표** 순서입니다.

```
┌ 마스트헤드 (마기카로기아 / CHARACTER SHEET) ─────────────┐
├ 탭: 캐릭터 시트 · 장서 · 관계 · (개요·정보) · (속성·능력) ┤
│ ┌헤더밴드: grid 118px | 1fr | 132px ───────────────────┐ │
│ │ 초상화 │ 정보필드(2열) │ 능력치/마력/공적점·마화 레일 │ │
│ └──────────────────────────────────────────────────────┘ │
│ [상태이상 스트립 — 봉인·타짐·…·소멸]                       │
│ [특기|설정]                                                │
│ ┌ 마법표: 치(2–12) | 별 | 짐승 | 힘 | 노래 | 꿈 | 어둠 ──┐ │
│ │ 셀 = 체크박스 + 특기명 + 코스트 / 어둠열은 취소선        │ │
│ │ 푸터: ❖ 혼의 특기 [폭렬]            영역 [짐승 ▾]       │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌ 메모 ──────────┐ ┌ 주사위 및 각종 표 (2×3 카드) ─────┐ │
└───────────────────────────────────────────────────────────┘
```
> 프로토타입에는 다른 배치(B 카드형/세로, D 가로 2단, E 가로 상단밴드)도 있으나, 이 핸드오프는 **C만** 구현합니다. `_layout.scss` 하단 주석에 다른 배치의 그리드 값이 남아 있습니다.

## Screens / Views

### 1) 캐릭터 시트 (main)
- **목적**: 능력치·마력·마법표 등 전투/판정 핵심 정보.
- **컴포넌트**
  - **마스트헤드**: 바 배경 `--mg-bar`, 하단 2px `--mg-gold`. 제목 `Gowun Batang` 28px/700, 라틴 `Cinzel` 11px(자간 .32em). 우측 ✶ 30px(opacity .55).
  - **탭바**: 활성 탭은 `--mg-bar-ink`+700+하단 2px 골드, 비활성 `--mg-faint` opacity .55.
  - **초상화(`.mg-portrait`)**: `aspect-ratio:1/1.05`, 골드 테두리, 네 모서리 L자 장식(`.mg-corner`). Foundry에서는 `data-edit="img"`로 이미지 교체.
  - **정보 필드(`.mg-field`)**: 라벨(`--mg-soft` 11.5px) + 밑줄 값. 빈 값은 `--mg-faint`의 `—`. ❖ 마커는 `--mg-gold`.
  - **능력치(`.mg-stat`)**: 공격/방어/근원. 숫자 `Gowun Batang` 16px/700. 계제는 `--mg-rank`(골드).
  - **게이지(`.mg-gauge`)**: 마력 `value/max`, 일시 마력. ◈/◇ 골드 아이콘.
  - **카운터(`.mg-counter`)**: 공적점·마화.
  - **상태이상(`.mg-status`)**: 8개 칩(봉인·타짐·허약·병마·차단·불운·사망·소멸). 활성 시 `.is-active`(골드/700).
  - **마법표**: 아래 별도 표 참조.
  - **메모(`.mg-memo`)** + **주사위·각종 표(`.mg-tables`)**: 가변특기(셀렉트), 운명 변전/장면/펌블/사건(⚙ 버튼), 주사위(D6).

### 2) 장서 (grimoire)
- 배너 「장 서」. 표 컬럼: **마법 이름 · 타입 · 지정특기 · 목표 · 코스트 · 충전 · 수정치 · 낭독(체크)**. 각 행 아래 “마법 효과 · 주구” 메모행. 하단 `＋` 추가 버튼. 그리드: `24px 2.4fr 1fr 1.1fr 0.9fr 0.8fr 0.7fr 0.8fr 24px`.

### 3) 관계 (relations)
- 배너 「관 계」. 표 컬럼: **앵커 이름 · 운명 · 속성 · (체크)**. 최대폭 440px. 하단에 **사명 / 수집 장서** 필드. 그리드: `24px 2fr 0.8fr 1.1fr 24px`.

## Magic Chart (마법표 / 특기 표)
- **고정 레퍼런스 데이터** — 액터마다 같음. `scripts/magicalogia-config.js`의 `MAGICALOGIA.chart`(6열×11행 `{name, cost}`) + `chartIndex`(2–12).
- 구조: 좌측 **치(출목) 열 30px** + 6속성 열(`flex:1`). 헤더 36px(속성 활성 체크 + 번호 + 이름), 데이터 행 22px.
- 셀 = 활성 체크박스 + 특기명 + 코스트. **체크된 셀**은 `.is-on` → `--mg-hi` 워시 + 채워진 체크.
- **어둠 열(`.mg-chart__col--dark`)**: 특기명 **취소선** + `--mg-dark-ink`(저주 속성 표현).
- 열 테두리·헤더 하단은 `--mg-gold`. 푸터: 혼의 특기 / 영역.
- 액터 저장 예시: 활성 특기 `system.skills["song.5"]=true` (열키.출목), 속성 활성 `system.attributes.song.active=true`.

## Interactions & Behavior
- **탭 전환**: Foundry `Tabs`(`navSelector:".mg-tabs"`, `contentSelector:".mg-tab-content"`).
- **마법표 셀 토글**: `.mg-chart__cell .mg-check` 클릭 → `system.skills[열.출목]` 부정 토글.
- **상태이상 토글**: `.mg-status__chip` 클릭 → `system.statuses[key]` 토글.
- **행 추가**: `[data-action="add-spell"]` / `[data-action="add-anchor"]` → 배열 push 후 update.
- **표 굴림**: `data-action="roll-*"`(운명/장면/펌블/사건/주사위)에 시스템 롤테이블 연결.
- **이미지 교체**: 초상화 `data-edit="img"`(Foundry FilePicker).
- 호버/포커스: 인터랙티브 요소는 `cursor:pointer`. 별도 강한 호버 효과는 두지 않음(클릭 시 즉시 반영).

## State Management
Foundry 액터 도큐먼트(`actor.system`)에 저장. 시트는 `ActorSheet#getData`에서 가공:
- 마법표는 `getData`에서 `system.skills`/`system.attributes`를 합쳐 `ctx.chart`(셀별 `on`/열별 `active`)로 펼침.
- 상태이상은 `MAGICALOGIA.statuses`에 `system.statuses[key]`를 매핑해 `active` 부여.
- 장서/관계는 `system.spells`/`system.anchors` 배열 그대로 `{{#each}}`.

## Design Tokens

### 구조(테마 공통)
| 토큰 | 값 |
|---|---|
| 본문/라벨 폰트 | `'Nanum Myeongjo', serif` |
| 디스플레이/숫자 | `'Gowun Batang', serif` |
| 라틴 강조 | `'Cinzel', serif` |
| radius / radius-sm | `3px` / `2px` |
| 마법표 행 높이 / 헤더 | `22px` / `36px` |
| 시트 폭(C) | `720px` |
| 본문 패딩 | `16px`(상하) · `18px`(좌우) |

### 다크 — 마법진 바이올렛
| 변수 | 값 |
|---|---|
| `--mg-paper` | `radial-gradient(120% 80% at 50% 0%, #271745, #170e2c 72%)` |
| `--mg-panel` / `--mg-panel-2` | `#231640` / `#2c1c50` |
| `--mg-ink` / `--mg-soft` / `--mg-faint` | `#f1e9ff` / `#c3b0ec` / `#7d6aa8` |
| `--mg-bar` / `--mg-bar-ink` | `linear-gradient(180deg,#4a2c84,#321f5e)` / `#f0e3b8` |
| `--mg-gold` / `--mg-line` | `#e0c074` / `rgba(224,192,116,.26)` |
| `--mg-field` / `--mg-field-ink` | `#2a1b4c` / `#ece2ff` |
| `--mg-hi` / `--mg-check` / `--mg-dark-ink` | `rgba(224,192,116,.18)` / `#e0c074` / `#a98fd0` |
| `--mg-deco` | 골드 소환진 SVG(중앙) + 보라 글로우 |

### 라이트 — 장서 양피지
| 변수 | 값 |
|---|---|
| `--mg-paper` | `radial-gradient(130% 90% at 50% 0%, #f1e7cc, #e6d8b6 75%)` |
| `--mg-panel` / `--mg-panel-2` | `#e8dabb` / `#ddcca1` |
| `--mg-ink` / `--mg-soft` / `--mg-faint` | `#3a2c18` / `#6e5a38` / `#9c8a64` |
| `--mg-bar` / `--mg-bar-ink` | `linear-gradient(180deg,#6a4a2c,#4f3520)` / `#f1e4c4` |
| `--mg-gold` / `--mg-line` | `#9a7430` / `rgba(90,61,36,.34)` |
| `--mg-field` / `--mg-field-ink` | `#f5eed9` / `#3a2c18` |
| `--mg-hi` / `--mg-check` / `--mg-dark-ink` | `rgba(154,116,48,.20)` / `#7a5524` / `#9c5a3a` |
| `--mg-deco` | 양피지 결(repeating-linear) + 비네팅 |

## Assets
- **폰트**: Google Fonts — Nanum Myeongjo / Gowun Batang / Cinzel. (시스템 배포 시 폰트를 패키지에 동봉하고 `@font-face`로 로드 권장 — Foundry는 오프라인/사설 서버가 많음.)
- **장식 배경**: 외부 이미지 없음. 인라인 SVG data-URI(소환진) + CSS 그라디언트(별/결/비네팅)로 구현. 색은 `--mg-gold` 등에 맞춰져 있음.
- **아이콘 글리프**: ❖ ✶ ◈ ◇ ⚙ ▾ ＋ (유니코드). 필요 시 시스템 아이콘 폰트/SVG로 교체 가능.

## Files (이 번들)
```
design_handoff_magicalogia_sheet/
├─ README.md                         ← 이 문서
├─ example.html                      ← 다크/라이트 양쪽을 한 화면에 보여주는 정적 레퍼런스 (브라우저로 바로 열기)
├─ styles/
│  ├─ _tokens.scss                   ← 테마 팔레트 + 구조 토큰 (출발점)
│  ├─ _base.scss                     ← 셸/장식 레이어/마스트헤드/탭
│  ├─ _layout.scss                   ← C 레이아웃 그리드
│  ├─ _components.scss               ← 필드/스탯/게이지/상태/표/메모 등
│  ├─ _magic-chart.scss              ← 마법표
│  └─ magicalogia.scss               ← @use 엔트리 (sass 컴파일)
├─ templates/
│  ├─ actor-sheet.hbs                ← 메인 템플릿 (탭 + C 레이아웃)
│  └─ partials/
│     ├─ mg-field.hbs                ← 라벨+값 필드 partial
│     ├─ mg-magic-chart.hbs          ← 마법표 partial
│     ├─ mg-grimoire.hbs             ← 장서 표 partial
│     └─ mg-relations.hbs            ← 관계 표 partial
└─ scripts/
   ├─ magicalogia-config.js          ← 마법표/상태이상/옵션 상수 (CONFIG.MAGICALOGIA)
   └─ magicalogia-actor-sheet.js     ← ActorSheet 스켈레톤 (getData/리스너 가이드)
```

## Foundry 연동 메모
1. **스타일 빌드**: `sass styles/magicalogia.scss systems/<id>/styles/magicalogia.css`. `system.json`의 `styles`에 등록.
2. **템플릿 등록**: `actor-sheet.hbs`를 시트 클래스 `template`에 지정하고, partial은 `loadTemplates([...])`로 프리로드(`{{> mg-magic-chart}}` 식으로 참조).
3. **테마 클래스**: 액터/월드 플래그(`actor.getFlag("magicalogia","theme")`)로 `theme-dark`/`theme-light`를 루트에 부여(예시는 `_render`에서 처리).
4. **데이터 모델**: `system.*` 경로는 예시입니다 — `template.json`을 먼저 정의하고 `.hbs`의 `name="system.…"`/`getData`를 맞추세요.
5. **버전**: 예시는 ApplicationV1(`ActorSheet`) 기준. v12+에서 ApplicationV2를 쓰면 렌더/리스너 훅 이름이 다릅니다(구조·CSS는 그대로 재사용 가능).

## 원본 디자인 파일(이 대화의 프로토타입)
- `Sheet.dc.html` — 레이아웃 B/C/D/E + 테마 + 배경 장식 프로토타입(런타임 컴포넌트).
- `MagicChart.dc.html` — 마법표 공용 컴포넌트.
- `마기카로기아 테마 시안.dc.html` — C 레이아웃 기준 테마 4종(다크/라이트 포함) 비교.
> 위 `.dc.html`은 사내 프리뷰 런타임용이라 단독 실행되지 않습니다. **시각 기준은 `example.html`**(단독 실행 가능)을 보세요.
