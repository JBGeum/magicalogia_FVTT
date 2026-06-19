# 새 시안 Stage 1 (토큰/폰트/골드 프레임) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 새 시안의 토대(토큰 미세조정·Pretendard 폰트·외곽 이중 골드 프레임 + 모서리 필리그리)를 현재 시트에 적용하되, 마크업 변경은 프레임 모서리 span 추가로 한정하고 시트는 계속 정상 렌더되게 한다.

**Architecture:** 데이터 모델·시트 구조는 그대로. SCSS 토큰/변수/컴포넌트만 새 디자인으로 재작성하고, 템플릿엔 장식용 span 4개만 추가한다. 핵심 결정: 현재 `.mg-content::before`가 점유하던 소환진 deco 배경을 `.mg-content`의 `background` 다중 레이어로 병합(`var(--mg-deco), var(--mg-paper)`)하여 `::before`/`::after`를 시안의 이중 골드 inset 선에 해방한다. 자식 콘텐츠는 `> * { z-index: 1 }`로 deco 위·장식 아래에 위치.

**Tech Stack:** Dart Sass(`scss/` @use 모듈) → Vite 빌드 → `dist/magicalogia.css`(minified 1줄). 테스트는 Vitest(모델 단위 48개). Foundry VTT ApplicationV2 시트.

## Global Constraints

- 데이터 모델 유지 + 마이그레이션 없음. (이 스테이지는 모델/템플릿 바인딩 미변경 — 순수 스타일 + 장식 마크업.)
- 토큰은 `.magicalogia`(다크 기본)에 스코프. 라이트 테마는 S5.
- 폰트: 본문/디스플레이 → `Pretendard`, 라틴 강조 → `Cinzel`. Nanum Myeongjo/Gowun Batang 완전 제거.
- 커밋 메시지: 영어 한 줄, co-author 없음.
- 각 Task 종료 시 `npm run build` 성공(SCSS 에러 0) + `dist/magicalogia.css` 생성 유지.
- 빌드 산출물은 minified 1줄이므로 검증은 문자열 grep으로 한다.
- deco 충돌 해소 방식은 **background 병합**으로 확정됨(소환진 배경 유지 + 골드선 확보).

---

## File Structure

- `scss/theme/_tokens.scss` — `.magicalogia` CSS 커스텀 프로퍼티(다크 토큰). Task 1에서 델타.
- `scss/theme/_vars.scss` — 테마 비의존 Sass 변수(폰트/치수). Task 2에서 폰트 변수.
- `scss/magicalogia.scss` — 엔트리(@use 집합 + 폰트 @import). Task 2에서 @import 교체.
- `scss/global/_base.scss` — `.mg-content` 셸·deco·타이포·masthead. **`.mg-content` 정의는 여기 있음**(스펙은 `_components.scss`라 했으나 부정확). Task 3에서 프레임 추가.
- `templates/actor/character-sheet.hbs` — 메인 시트 템플릿. Task 4에서 모서리 span.

---

## Task 1: 토큰 델타

**Files:**

- Modify: `scss/theme/_tokens.scss:7,29-32`

**Interfaces:**

- Consumes: 없음.
- Produces: CSS 변수 `--mg-soft`(밝아진 보라), `--mg-row-h: 21px`, `--mg-head-h: 30px`, 신규 `--mg-head-bg`(골드 그라데이션), `--mg-head-ink`(짙은 보라). `--mg-head-*`는 S2/S3에서 스탯 타일·차트 헤더가 소비. S1에선 정의만.

- [ ] **Step 1: `--mg-soft` 값 변경**

`scss/theme/_tokens.scss:7` 의

```scss
--mg-soft: #c3b0ec;
```

를

```scss
--mg-soft: #d4c8f6;
```

로.

- [ ] **Step 2: 치수 토큰 변경 + head 토큰 신설**

`scss/theme/_tokens.scss:29-32` 의

```scss
  --mg-radius: 3px;
  --mg-row-h: 22px;
  --mg-head-h: 36px;
}
```

를

```scss
  --mg-radius: 3px;
  --mg-row-h: 21px;
  --mg-head-h: 30px;
  // S2/S3에서 스탯 타일·차트 헤더가 소비. S1은 정의만.
  --mg-head-bg: linear-gradient(180deg, #e8d196, #d2b061);
  --mg-head-ink: #241544;
}
```

- [ ] **Step 3: 빌드 + 토큰 반영 검증**

Run: `npm run build && grep -o "d4c8f6\|--mg-head-bg\|--mg-head-ink\|--mg-row-h:21px" dist/magicalogia.css`
Expected: 빌드 성공, 출력에 `d4c8f6`, `--mg-head-bg`, `--mg-head-ink`, `--mg-row-h:21px`(또는 `--mg-row-h: 21px`) 모두 등장.

- [ ] **Step 4: 회귀 테스트**

Run: `npm test`
Expected: `Tests 48 passed (48)`.

- [ ] **Step 5: 커밋**

```bash
git add scss/theme/_tokens.scss
git commit -m "style: refresh design tokens for new mockup (soft/row/head)"
```

---

## Task 2: Pretendard 폰트

**Files:**

- Modify: `scss/theme/_vars.scss:2-4`
- Modify: `scss/magicalogia.scss:10-12`

**Interfaces:**

- Consumes: 없음.
- Produces: Sass 변수 `$mg-font-body`/`$mg-font-display` → `"Pretendard", sans-serif`, `$mg-font-latin` → `"Cinzel", serif`(유지). `_base.scss` 등이 `@use "../theme/vars" as *`로 이미 참조 중 — 값만 교체되므로 소비처 수정 불필요.

- [ ] **Step 1: 폰트 변수 교체**

`scss/theme/_vars.scss:2-4` 의

```scss
$mg-font-body: "Nanum Myeongjo", serif;
$mg-font-display: "Gowun Batang", serif;
$mg-font-latin: "Cinzel", serif;
```

를

```scss
$mg-font-body: "Pretendard", sans-serif;
$mg-font-display: "Pretendard", sans-serif;
$mg-font-latin: "Cinzel", serif;
```

- [ ] **Step 2: @import 교체**

`scss/magicalogia.scss:10-12` 의 주석 2줄 + @import 1줄

```scss
// 폰트 — 시안 지정(본문 Nanum Myeongjo / 디스플레이 Gowun Batang / 라틴 Cinzel).
// 오프라인/사설 서버용 @font-face 번들은 후속 작업.
@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Gowun+Batang:wght@400;700&family=Nanum+Myeongjo:wght@400;700&display=swap");
```

를

```scss
// 폰트 — 본문/디스플레이 Pretendard, 라틴 강조 Cinzel.
// 오프라인/사설 서버용 @font-face 번들은 후속 작업(지금은 CDN).
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap");
```

(Cinzel weight는 시안 `example.html` 기준 `400;600`. `@import url(...)`은 `@use` 블록 뒤 동일 위치 유지 — 현행이 그 패턴으로 빌드되므로 안전.)

- [ ] **Step 3: 빌드 + 폰트 반영 검증**

Run: `npm run build && grep -o "pretendard.min.css\|family=Cinzel:wght@400;600\|Nanum\|Gowun" dist/magicalogia.css`
Expected: `pretendard.min.css`와 `family=Cinzel:wght@400;600` 등장, `Nanum`/`Gowun` **미등장**(아무 줄도 안 나오면 제거 성공).

- [ ] **Step 4: 회귀 테스트**

Run: `npm test`
Expected: `Tests 48 passed (48)`.

- [ ] **Step 5: 커밋**

```bash
git add scss/theme/_vars.scss scss/magicalogia.scss
git commit -m "style: switch body/display fonts to Pretendard, keep Cinzel"
```

---

## Task 3: 골드 프레임 SCSS (deco 병합 + 이중 골드선 + 모서리 필리그리)

**Files:**

- Modify: `scss/global/_base.scss:23-39`

**Interfaces:**

- Consumes: `--mg-deco`, `--mg-paper`, `--mg-gold`, `--mg-bar-ink`(Task 1 이전부터 존재).
- Produces: 클래스 `.mg-fcorner`(+ `--tl/--tr/--bl/--br` 변형자)와 `.mg-fdia`. Task 4의 템플릿 span이 이 클래스들을 소비. `.mg-content`의 `::before`(inset 3px, opacity .55)·`::after`(inset 7px, opacity .3)는 이중 골드 inset 선. deco는 `.mg-content` `background`로 이동.

- [ ] **Step 1: `.mg-content` 블록을 프레임 사양으로 교체**

`scss/global/_base.scss:23-39` 의 현재 블록

```scss
// All real content sits above the decorative layer
.mg-content {
  position: relative;
  z-index: 1;
  overflow: hidden;
  background: var(--mg-paper);
  border: 1px solid var(--mg-gold);

  // Decorative background lives behind everything (see --mg-deco per theme)
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background: var(--mg-deco);
  }
}
```

를 아래로 교체한다(deco를 background로 병합하고 ::before/::after를 골드선으로, 모서리 필리그리 신설):

```scss
// All real content sits above the decorative layer
.mg-content {
  position: relative;
  z-index: 1;
  overflow: hidden;
  // deco was on ::before; merged into background so ::before/::after
  // are free to draw the new double gold inset frame lines.
  background: var(--mg-deco), var(--mg-paper);
  border: 1px solid var(--mg-gold);

  // Double gold inset frame lines
  &::before {
    content: "";
    position: absolute;
    inset: 3px;
    z-index: 6;
    pointer-events: none;
    border: 1px solid var(--mg-gold);
    opacity: 0.55;
  }
  &::after {
    content: "";
    position: absolute;
    inset: 7px;
    z-index: 6;
    pointer-events: none;
    border: 1px solid var(--mg-gold);
    opacity: 0.3;
  }

  // Real content above deco/frame
  > * {
    position: relative;
    z-index: 1;
  }
}

// ---- Corner filigree (gold L-bars + diamond stud) ----
.mg-fcorner {
  position: absolute;
  z-index: 7;
  width: 24px;
  height: 24px;
  pointer-events: none;

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    background: var(--mg-gold);
  }
  &::before {
    width: 24px;
    height: 2px;
  }
  &::after {
    width: 2px;
    height: 24px;
  }

  &--tl {
    top: 7px;
    left: 7px;
  }
  &--tr {
    top: 7px;
    right: 7px;
    transform: scaleX(-1);
  }
  &--bl {
    bottom: 7px;
    left: 7px;
    transform: scaleY(-1);
  }
  &--br {
    bottom: 7px;
    right: 7px;
    transform: scale(-1);
  }
}

.mg-fdia {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 9px;
  height: 9px;
  background: var(--mg-gold);
  transform: rotate(45deg);
  box-shadow: 0 0 0 2px var(--mg-paper-edge, transparent);

  &::before {
    content: "";
    position: absolute;
    inset: 2.5px;
    background: var(--mg-bar-ink);
    opacity: 0.65;
  }
}
```

(`--mg-paper-edge`는 현재 토큰에 없으므로 fallback `transparent`가 적용된다 — 시안과 동일. 신설은 S2 헤더밴드 작업으로 미룬다.)

- [ ] **Step 2: 빌드 + 프레임 CSS 반영 검증**

Run: `npm run build && grep -o "mg-fcorner\|mg-fdia\|mg-content::after\|var(--mg-deco),var(--mg-paper)\|var(--mg-deco), var(--mg-paper)" dist/magicalogia.css`
Expected: `mg-fcorner`, `mg-fdia`, deco+paper 다중 배경 문자열이 등장.

- [ ] **Step 3: 회귀 테스트**

Run: `npm test`
Expected: `Tests 48 passed (48)`.

- [ ] **Step 4: 커밋**

```bash
git add scss/global/_base.scss
git commit -m "style: add double gold frame lines and corner filigree to mg-content"
```

---

## Task 4: 프레임 모서리 마크업

**Files:**

- Modify: `templates/actor/character-sheet.hbs:2-3`

**Interfaces:**

- Consumes: Task 3의 `.mg-fcorner`/`.mg-fcorner--{tl,tr,bl,br}`/`.mg-fdia`.
- Produces: 시각적으로만 변경(모서리 4개). 데이터 바인딩·액션 없음.

- [ ] **Step 1: `.mg-content` 직후 모서리 span 4개 추가**

`templates/actor/character-sheet.hbs:2-3` 의

```hbs
  <div class="mg-content">
    <header class="mg-masthead">
```

를

```hbs
  <div class="mg-content">
    <span class="mg-fcorner mg-fcorner--tl"><span class="mg-fdia"></span></span>
    <span class="mg-fcorner mg-fcorner--tr"><span class="mg-fdia"></span></span>
    <span class="mg-fcorner mg-fcorner--bl"><span class="mg-fdia"></span></span>
    <span class="mg-fcorner mg-fcorner--br"><span class="mg-fdia"></span></span>
    <header class="mg-masthead">
```

- [ ] **Step 2: 빌드 + 회귀 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, `Tests 48 passed (48)`.

- [ ] **Step 3: Foundry 실렌더 검증 (수동)**

Foundry에서 캐릭터 시트를 열어 육안 확인:

- 네 모서리에 골드 L자 막대 + 다이아몬드 4개 표시.
- `.mg-content` 외곽 안쪽으로 이중 골드선(밝은 선 + 옅은 선) 보임.
- 본문 폰트가 Pretendard(고딕)로 바뀜.
- 소환진 배경(circle/rect SVG)이 여전히 콘텐츠 뒤에 보임(deco 병합 정상).
- 기존 masthead/탭/마법표 차트/장서·관계 레이아웃이 깨지지 않음.

(주의: Foundry documentTypes 변경이 아니라 스타일/템플릿 변경이므로 F5 새로고침으로 충분 — 서버 재시작 불필요.)

- [ ] **Step 4: 커밋**

```bash
git add templates/actor/character-sheet.hbs
git commit -m "feat: render frame corner filigree on character sheet"
```

---

## Self-Review (스펙 대조)

- **스펙 ① 토큰 델타** → Task 1 (soft/row-h/head-h + head-bg/head-ink). ✓
- **스펙 ② 폰트 변수** → Task 2 Step 1. ✓
- **스펙 ③ @import 교체** → Task 2 Step 2. ✓ (Cinzel weight는 시안 example.html 기준 400;600으로 보정.)
- **스펙 ④ 프레임 장식** → Task 3. ✓ 단 위치는 `_components.scss`가 아니라 실제 정의처인 `_base.scss`로 보정. `::before` deco 충돌은 background 병합으로 해소(사용자 승인).
- **스펙 ⑤ 모서리 마크업** → Task 4. ✓ `{{cssClass}}` 래퍼 안의 `.mg-content`(line 2) 기준.
- **스펙 검증(build/test/실렌더)** → 각 Task의 검증 스텝 + Task 4 Step 3. ✓
- **비목표**(SVG 필리그리·divider·등급명·상태칩·탭 재편·라이트 테마) → 미포함. ✓

**스펙과의 의도적 차이(보정):**

1. 프레임 SCSS 위치: 스펙 `_components.scss` → 실제 `_base.scss`(`.mg-content` 정의처).
2. deco 처리: 스펙은 충돌 미인지. background 다중 레이어 병합으로 해소.
3. Cinzel weight: 스펙 `400;700` → 시안 `400;600`.
4. `.mg-content` border: 시안은 2px이나 스펙 미언급이라 현행 1px 유지(변경 최소화).
