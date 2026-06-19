# 설계 — 새 시안 적용 로드맵 + Stage 1 (토큰/폰트/프레임)

> 2026-06-19 · 브랜치 `develop` · 시안 출처: `docs/design/new/`(gitignore — `example.html` + `styles/magicalogia.css`가 시각 기준).
> 단계분해로 진행. 이 문서 = 공통 결정 + 스테이지 로드맵 + **Stage 1 상세**. S2~S5는 각자 spec→plan 사이클.

## 배경

`docs/design/new/`에 새 고해상도 시안(전체 액터 시트 목업)이 올라옴. 핵심 발견: **현재 시트가 이미 이 디자인의 `--mg-*` 토큰 체계와 구조 상당 부분을 구현**하고 있어, 새 시안은 처음부터 재작성이 아니라 **현재 디자인의 진화판**이다. 따라서 컴포넌트 단위 추가/교체를 단계적으로 적용한다.

## 공통 결정 (모든 스테이지에 적용)

- **데이터 모델 유지 + 템플릿 재바인딩** (마이그레이션 없음). 시안의 `system.*` 경로는 예시이므로 기존 경로에 매핑한다.
- **SCSS 분할 + Vite 파이프라인 유지**. 시안의 단일 `magicalogia.css`를 그대로 쓰지 않고, 기존 `scss/`의 토큰/컴포넌트 내용만 새 디자인으로 재작성.
- **V1 관용구 → V2 액션**: 시안의 `data-edit="img"`/`data-toggle="…"`는 ApplicationV2 `data-action`으로 변환.
- **토큰은 `.magicalogia`(다크 기본)에 스코프**. 라이트 테마는 S5에서 `.theme-light` 오버라이드로 분리.
- **폰트**: 본문/디스플레이 → `Pretendard`, 라틴 강조 → `Cinzel` (Nanum Myeongjo/Gowun Batang 제거).
- 커밋 메시지: 영어 한 줄, co-author 없음.

### 데이터 경로 매핑 (시안 → 현재 모델)

| 시안 경로                                                                | 현재 모델 경로                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| `system.attack` / `system.defense` / `system.source`                     | `system.abilities.attack` / `.defense` / `.source` |
| `system.mana.value` / `system.mana.max`                                  | `system.mp.value` / `system.mp.max`                |
| `system.tempMana`                                                        | `system.tempMp`                                    |
| `system.maHwa`                                                           | `system.mabloom`                                   |
| `system.memo`                                                            | `system.biography` (HTMLField — editor)            |
| `system.trueFormRevealed`                                                | 동일 (존재)                                        |
| `system.career` / `system.organization` / `system.effectType`            | 동일 (존재)                                        |
| `system.player` / `system.socialStatus` / `system.gender` / `system.age` | 동일 (존재, 입력 UI는 S4)                          |
| `rankTitle` 헬퍼 / `config.rankTitles`                                   | S2에서 신설                                        |

## 스테이지 로드맵

각 스테이지는 끝나면 시트가 정상 렌더되는 상태를 유지한다.

- **S1 (이 문서): 토큰 델타 + Pretendard 폰트 + 골드 프레임 모서리.** 토대 새로고침. 구조 변경 최소.
- **S2: 헤더밴드 델타.** 초상화 SVG 필리그리(`mg-pcorner`/`mg-svg-pcorner`), divider.png, 계제 등급명(`rankTitle`)+플로리시(`mg-svg-rankflr`), 게이지 head/body, 스탯 타일 골드헤더.
- **S3: 상태칩 컬러 마크 + 마법표.** `mg-status__mark`, 마법표 열 SVG 아이콘, 푸터 플로리시(`mg-svg-miniflr`).
- **S4: 탭 재편 + 정보 탭.** 장서·관계 탭 제거 → 캐릭터 시트 하단 아코디언(`mg-accordion`), 탭을 `main/info/속성(비활성)`으로, 정보 탭(플레이어/신분/성별/연령 입력) 추가.
- **S5: 라이트 테마.** `.magicalogia.theme-light` 토큰 오버라이드 + 테마 토글.

## Stage 1 상세 설계

**목표:** 새 시안의 토대(토큰 미세조정·Pretendard 폰트·외곽 골드 프레임 장식)를 적용하되, 마크업/구조 변경은 프레임 모서리 추가로 한정. 시트는 계속 정상 렌더.

### 변경 파일·내용

**① `scss/theme/_tokens.scss` — 토큰 델타**

- `--mg-soft`: `#c3b0ec` → `#d4c8f6`
- `--mg-row-h`: `22px` → `21px`
- `--mg-head-h`: `36px` → `30px`
- 신규: `--mg-head-bg: linear-gradient(180deg, #e8d196, #d2b061)`
- 신규: `--mg-head-ink: #241544`
  (`--mg-head-*`는 S2/S3에서 스탯 타일·차트 헤더가 소비. S1에선 정의만.)

**② `scss/theme/_vars.scss` — 폰트 변수**

- `$mg-font-body: "Pretendard", sans-serif` (was `"Nanum Myeongjo", serif`)
- `$mg-font-display: "Pretendard", sans-serif` (was `"Gowun Batang", serif`)
- `$mg-font-latin: "Cinzel", serif` (유지)

**③ `scss/magicalogia.scss` — 폰트 @import 교체**

- 기존 Google Fonts(`Cinzel`+`Gowun Batang`+`Nanum Myeongjo`) @import를 제거하고:
  - Pretendard CDN: `@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");`
  - Cinzel: `@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap");`
- (배포 시 오프라인 `@font-face` 동봉은 후속 — 지금은 CDN 유지.)

**④ `scss/component/_components.scss` — 프레임 장식**

- `.mg-content`에 이중 골드 inset 라인(현재 없으면 추가):
  - `::before { inset: 3px; border: 1px solid var(--mg-gold); opacity: .55; }`
  - `::after { inset: 7px; border: 1px solid var(--mg-gold); opacity: .3; }`
  - 둘 다 `pointer-events: none; position: absolute;`. `.mg-content` 자식은 `position: relative; z-index: 1`로 위에.
- `.mg-fcorner`(절대배치 24×24, `::before` 가로 2px·`::after` 세로 2px 골드 막대) + 변형자 `--tl/--tr(scaleX-1)/--bl(scaleY-1)/--br(scale-1)`, 위치 `7px`.
- `.mg-fdia`(9×9 골드 다이아몬드 `rotate(45deg)`, `::before` inset 2.5px `--mg-bar-ink` 0.65).
  (정확한 규칙은 `docs/design/new/styles/magicalogia.css`의 `.mg-fcorner`/`.mg-fdia` 블록을 이식.)

**⑤ `templates/actor/character-sheet.hbs` — 프레임 모서리 마크업**

- `.mg-content` 여는 태그 직후에 4개 span 추가:
  ```hbs
  <span class="mg-fcorner mg-fcorner--tl"><span class="mg-fdia"></span></span>
  <span class="mg-fcorner mg-fcorner--tr"><span class="mg-fdia"></span></span>
  <span class="mg-fcorner mg-fcorner--bl"><span class="mg-fdia"></span></span>
  <span class="mg-fcorner mg-fcorner--br"><span class="mg-fdia"></span></span>
  ```

### 검증

- `npm run build` 성공(SCSS 에러 없음, `dist/magicalogia.css` 생성).
- `npm test` 무회귀(SCSS/템플릿 변경이라 모델 테스트 영향 없음 — 48 통과 유지).
- Foundry 실렌더: 골드 프레임 모서리 4개 표시, 본문 폰트 Pretendard 적용, 기존 헤더/탭/차트 레이아웃 깨지지 않음.

### 비목표 (후속 스테이지)

SVG 필리그리(초상화/계제/마법표), divider.png, 계제 등급명, 상태칩 마크, 마법표 아이콘/푸터, 탭→아코디언, 정보 탭, 라이트 테마.

## 함정 / 참고

- 시안은 ApplicationV1 예시라 데이터 경로·이벤트 관용구가 다름 — 위 매핑/변환 결정을 따른다.
- `docs/design/`(신/구 시안)은 gitignore 대상이라 커밋에 포함되지 않음.
- 프레임 모서리는 `.mg-content { overflow: hidden }` 안에 있어 잘리지 않도록 `inset 7px` 위치 확인.
