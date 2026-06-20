# Stage 5 (라이트 테마 + 클라이언트 설정 토글) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다크 외에 라이트(양피지) 테마를 추가하고, Foundry 게임 설정(클라이언트 범위)에서 다크/라이트를 전환하면 열린 모든 마기카로기아 시트(액터·아이템)에 즉시 반영한다.

**Architecture:** 모든 컴포넌트 SCSS가 `--mg-*` custom property 기반이라 라이트는 `.magicalogia.theme-light` 토큰 오버라이드만으로 전환된다. 테마 값은 `game.settings`(client scope)에 저장하고, 신설 `theme.mjs`의 `applyTheme(element)`가 시트 `_onRender`에서 루트 element에 테마 클래스를 부여한다. 설정 `onChange`는 열린 시트의 클래스만 교체(리렌더 없음)해 즉시 전환한다.

**Tech Stack:** Foundry VTT V13 ApplicationV2, `game.settings`, SCSS(Vite), vitest(`npm test`).

## Global Constraints

- 데이터 모델·마이그레이션 변경 금지.
- 다크가 기본(`.magicalogia` 토큰). 라이트는 `.magicalogia.theme-light` 오버라이드만. 비색상 토큰(`--mg-radius`/`--mg-row-h`/`--mg-head-h`)은 테마 공통 — 오버라이드하지 않는다.
- 테마 저장: `game.settings`, `scope: "client"`, `config: true`(설정 메뉴 노출), `default: "dark"`. 시트 내 별도 토글 버튼 없음.
- 적용 범위: 액터 시트 + 아이템 시트 모두.
- 라이트 토큰 값은 시안 `example.html`의 `.magicalogia.theme-light` 그대로 이식(아래 Task 1에 전체 값 명시). 8자리 hex(알파 포함) 보존.
- `onChange`는 `render()`가 아니라 element 클래스만 교체(폼 입력·아코디언 상태 보존).
- 커밋 메시지: 영어 한 줄, co-author 없음. lint-staged(prettier/eslint) 자동 정렬은 정상.
- 검증: 시트 UI 단위테스트 인프라 없음 → Foundry 통합 부분의 test cycle은 `npm run build` + `npm test` 무회귀 + 육안. 단 라이트 토큰 완전성은 정적 테스트로 검증(Task 1).

---

## File Structure

- **Modify** `scss/theme/_tokens.scss` — `.magicalogia.theme-light` 라이트 토큰 오버라이드 블록 추가. (Task 1)
- **Create** `test/theme-tokens.test.mjs` — 라이트가 다크의 모든 색상 토큰을 오버라이드하는지 정적 검증. (Task 1)
- **Create** `module/helpers/theme.mjs` — `applyTheme(element)` + `registerThemeSetting()`. (Task 2)
- **Modify** `module/magicalogia.mjs` — init hook에서 `registerThemeSetting()` 호출. (Task 2)
- **Modify** `lang/ko.json` — `MAGICALOGIA.settings.theme` i18n. (Task 2)
- **Modify** `module/sheets/actor-sheet.mjs` — classes에서 `theme-dark` 제거 + `_onRender`에서 `applyTheme`. (Task 2)
- **Modify** `module/sheets/item-sheet.mjs` — `_onRender` 신설 + `applyTheme`. (Task 2)
- **Modify** `module/helpers/config.mjs` — `themes` 주석 정정. (Task 2)

---

## Task 1: 라이트 토큰 + 완전성 회귀 테스트

라이트 토큰을 추가하고, 라이트가 다크의 모든 색상 토큰을 빠짐없이 오버라이드하는지 정적 테스트로 보장한다. 이 테스트는 향후 다크에 토큰을 추가했을 때 라이트에 누락되는 회귀(라이트 모드에서 해당 요소만 다크 색 잔존)를 잡는다.

**Files:**

- Create: `test/theme-tokens.test.mjs`
- Modify: `scss/theme/_tokens.scss` (기존 `.magicalogia { … }` 블록 뒤에 추가)

**Interfaces:**

- Consumes: 없음(정적 파일 분석).
- Produces: CSS 셀렉터 `.magicalogia.theme-light`와 그 안의 라이트 토큰 값들. Task 2의 시트가 `theme-light` 클래스를 부여하면 이 토큰들이 적용된다.

- [ ] **Step 1: 완전성 테스트 작성**

`test/theme-tokens.test.mjs` 생성:

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 라이트 테마가 다크의 모든 "색상" 토큰을 오버라이드하는지 정적 검증.
// 배경: 컴포넌트 SCSS는 --mg-* 기반이라, 라이트가 어떤 색상 토큰을 빠뜨리면
// 라이트 모드에서 그 요소만 다크 색으로 남는다(build로는 안 잡힘).
// 비색상 토큰(radius/row-h/head-h)은 테마 공통이라 오버라이드 대상이 아니다.

const tokensPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "scss",
  "theme",
  "_tokens.scss",
);
const NON_COLOR = new Set(["mg-radius", "mg-row-h", "mg-head-h"]);
const tokenKeys = (s) => new Set([...s.matchAll(/--(mg-[\w-]+)\s*:/g)].map((m) => m[1]));

describe("테마 토큰 완전성", () => {
  const text = readFileSync(tokensPath, "utf8");

  it(".magicalogia.theme-light 블록이 존재한다", () => {
    expect(text).toContain(".magicalogia.theme-light");
  });

  it("라이트가 다크의 모든 색상 토큰을 오버라이드한다", () => {
    const idx = text.indexOf(".magicalogia.theme-light");
    const darkKeys = tokenKeys(text.slice(0, idx));
    const lightKeys = tokenKeys(text.slice(idx));
    const missing = [...darkKeys].filter((k) => !NON_COLOR.has(k) && !lightKeys.has(k));
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실행 → RED 확인**

Run: `npx vitest run test/theme-tokens.test.mjs`
Expected: FAIL — `.magicalogia.theme-light` 블록이 아직 없어 첫 테스트가 "expected … to contain '.magicalogia.theme-light'"로 실패.

- [ ] **Step 3: 라이트 토큰 추가**

`scss/theme/_tokens.scss`의 닫는 `}`(다크 `.magicalogia` 블록 끝, 현재 35행) **뒤에** 추가:

```scss
// 라이트(양피지) 테마 — 다크 토큰을 덮어쓴다. 출처: 시안 example.html .magicalogia.theme-light
.magicalogia.theme-light {
  --mg-paper: radial-gradient(130% 90% at 50% 0%, #f1e7cc, #e6d8b6 75%);
  --mg-panel: #e8dabb;
  --mg-panel-2: #ddcca1;
  --mg-ink: #3a2c18;
  --mg-soft: #6e5a38;
  --mg-faint: #9c8a64;
  --mg-bar: linear-gradient(180deg, #6a4a2c, #4f3520);
  --mg-bar-ink: #f1e4c4;
  --mg-gold: #9a7430;
  --mg-line: #5a3d2457;
  --mg-field: #f5eed9;
  --mg-field-ink: #3a2c18;
  --mg-hi: #9a74302e;
  --mg-hi-soft: #9a74301a;
  --mg-hi-strong: #9a743070;
  --mg-check: #7a5524;
  --mg-dark-ink: #9c5a3a;
  --mg-head-bg: linear-gradient(180deg, #b58a3e, #9c7430);
  --mg-head-ink: #fbf3dc;
  --mg-deco:
    repeating-linear-gradient(112deg, #5a3d240d 0 2px, transparent 2px 8px),
    repeating-linear-gradient(28deg, #5a3d240a 0 2px, transparent 2px 9px),
    radial-gradient(150% 130% at 50% -15%, transparent 58%, #3c281433);
}
```

- [ ] **Step 4: 테스트 실행 → GREEN 확인**

Run: `npx vitest run test/theme-tokens.test.mjs`
Expected: PASS (2 tests). 라이트가 다크 색상 토큰(paper/panel/panel-2/ink/soft/faint/bar/bar-ink/gold/line/field/field-ink/hi/hi-soft/hi-strong/check/dark-ink/head-bg/head-ink/deco)을 전부 포함.

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 성공, `.magicalogia.theme-light`가 `dist/magicalogia.css`에 컴파일됨.

- [ ] **Step 6: 커밋**

```bash
git add scss/theme/_tokens.scss test/theme-tokens.test.mjs
git commit -m "feat: add light theme token overrides with completeness test"
```

---

## Task 2: 테마 토글 기능 (설정 등록 + 시트 적용)

테마를 클라이언트 설정으로 등록하고, 액터·아이템 시트가 렌더 시 설정값에 따라 테마 클래스를 부여하도록 한다. 설정 변경 시 열린 시트에 즉시 반영한다.

**Files:**

- Create: `module/helpers/theme.mjs`
- Modify: `module/magicalogia.mjs` (import 추가 + init hook 내 `registerHandlebarsHelpers();` 부근)
- Modify: `lang/ko.json`
- Modify: `module/sheets/actor-sheet.mjs` (classes 12행, import, `_onRender`)
- Modify: `module/sheets/item-sheet.mjs` (import, `_onRender` 신설)
- Modify: `module/helpers/config.mjs` (themes 주석)

**Interfaces:**

- Consumes: `MAGICALOGIA.themes = { dark: "theme-dark", light: "theme-light" }`(config.mjs 기존). Task 1의 `.magicalogia.theme-light` 토큰.
- Produces: `applyTheme(element)` — element에 `theme-dark`/`theme-light` 클래스 부여. `registerThemeSetting()` — `game.settings` "magicalogia"/"theme" 등록.

- [ ] **Step 1: `module/helpers/theme.mjs` 생성**

```js
import { MAGICALOGIA } from "./config.mjs";

/** 현재 테마 설정을 읽어 시트 루트 element에 테마 클래스를 부여한다. */
export function applyTheme(element) {
  if (!element) return;
  const theme = game.settings.get("magicalogia", "theme");
  element.classList.remove(MAGICALOGIA.themes.dark, MAGICALOGIA.themes.light);
  element.classList.add(MAGICALOGIA.themes[theme] ?? MAGICALOGIA.themes.dark);
}

/** 테마 클라이언트 설정 등록(init hook에서 호출). 변경 시 열린 시트에 즉시 반영. */
export function registerThemeSetting() {
  game.settings.register("magicalogia", "theme", {
    name: "MAGICALOGIA.settings.theme.name",
    hint: "MAGICALOGIA.settings.theme.hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      dark: "MAGICALOGIA.settings.theme.dark",
      light: "MAGICALOGIA.settings.theme.light",
    },
    default: "dark",
    onChange: () => {
      for (const app of foundry.applications.instances.values()) {
        if (app.element?.classList.contains("magicalogia")) applyTheme(app.element);
      }
    },
  });
}
```

- [ ] **Step 2: `module/magicalogia.mjs` — 설정 등록 호출**

상단 import 블록(현재 17행 `import { preloadHandlebarsTemplates, … }` 부근)에 추가:

```js
import { registerThemeSetting } from "./helpers/theme.mjs";
```

init hook 안에서 `registerHandlebarsHelpers();`(현재 48행) **앞**에 추가:

```js
registerThemeSetting();
```

- [ ] **Step 3: `lang/ko.json` — i18n 추가**

`MAGICALOGIA` 객체 안(예: `"type"` 항목 뒤)에 `settings` 키 추가. 최종 형태:

```json
{
  "MAGICALOGIA": {
    "actor": {
      "health": "생명력",
      "biography": "설정"
    },
    "item": {
      "description": "설명"
    },
    "type": {
      "character": "캐릭터",
      "generic": "일반 아이템"
    },
    "settings": {
      "theme": {
        "name": "테마",
        "hint": "캐릭터/아이템 시트의 색 테마를 선택합니다. (이 클라이언트에만 적용)",
        "dark": "다크 (마법진)",
        "light": "라이트 (양피지)"
      }
    }
  },
  "TYPES": {
    "Actor": {
      "character": "캐릭터"
    },
    "Item": {
      "generic": "일반 아이템"
    }
  }
}
```

- [ ] **Step 4: `module/sheets/actor-sheet.mjs` — 테마 적용**

(a) 상단 import(현재 1-2행 import 뒤)에 추가:

```js
import { applyTheme } from "../helpers/theme.mjs";
```

(b) `DEFAULT_OPTIONS.classes`(현재 12행)에서 `"theme-dark"` 제거:

```js
    classes: ["magicalogia", "sheet", "actor"],
```

(c) `_onRender`(현재 231행)의 아코디언 복원 `for` 루프가 끝난 직후, 메서드 닫는 `}` **앞**에 추가:

```js
applyTheme(this.element);
```

- [ ] **Step 5: `module/sheets/item-sheet.mjs` — 테마 적용**

(a) 상단 import에 추가:

```js
import { applyTheme } from "../helpers/theme.mjs";
```

(b) 클래스 본문에 `_onRender` 메서드 신설(기존에 없음):

```js
  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
  }
```

(`classes`에는 theme 클래스가 없으므로 제거할 것 없음 — `applyTheme`가 부여.)

- [ ] **Step 6: `module/helpers/config.mjs` — 주석 정정**

`MAGICALOGIA.themes` 위 주석(현재 107행 "테마 루트 클래스 (액터 flag로 선택).")을 교체:

```js
// 테마 루트 클래스 (클라이언트 설정으로 선택).
```

- [ ] **Step 7: 빌드·테스트 검증**

Run: `npm run build`
Expected: 성공.

Run: `npm test`
Expected: 무회귀 — Task 1의 theme-tokens 테스트 포함 전부 통과(데이터 모델 변경 없음).

- [ ] **Step 8: 커밋**

```bash
git add module/helpers/theme.mjs module/magicalogia.mjs lang/ko.json module/sheets/actor-sheet.mjs module/sheets/item-sheet.mjs module/helpers/config.mjs
git commit -m "feat: add client-scoped theme setting applied to actor and item sheets"
```

**육안 검증(서버 재시작 — 설정 등록·시트 클래스 변경):**

- 게임 설정 메뉴에 "테마" 드롭다운(다크/라이트) 노출. 기본 다크.
- 라이트 선택 → 열린 액터·아이템 시트가 즉시 양피지(밝은 배경, 갈색 골드, 어두운 잉크)로 전환. 다크로 되돌리면 복귀.
- 전환 시 폼 입력값·아코디언 펼침 상태 보존(클래스만 교체, 리렌더 없음).
- 라이트 모드에서 헤더밴드·마법표·상태칩·아코디언·정보탭·아이템 시트 모두 가독성 유지.
- 시트를 닫았다 다시 열어도 설정 테마 유지.

---

## Self-Review

**1. Spec coverage:**

- ① 라이트 토큰 SCSS → Task 1 Step 3. ✓
- ② theme.mjs(applyTheme + registerThemeSetting) → Task 2 Step 1. ✓
- ③ magicalogia.mjs init 등록 → Task 2 Step 2. ✓
- ④ ko.json i18n → Task 2 Step 3. ✓
- ⑤ actor-sheet(classes에서 theme-dark 제거 + \_onRender) → Task 2 Step 4. ✓
- ⑥ item-sheet(\_onRender 신설) → Task 2 Step 5. ✓
- ⑦ config.mjs 주석 → Task 2 Step 6. ✓
- 클라이언트 설정/설정메뉴/onChange 클래스 교체/액터·아이템 모두 → Global Constraints + Task 2. ✓
- 라이트 토큰 완전성(누락 방지) → Task 1 테스트. ✓

**2. Placeholder scan:** TBD/TODO/"적절히 처리" 없음. 모든 코드 step에 완전한 코드. ✓

**3. Type consistency:**

- `applyTheme(element)` 시그니처 — theme.mjs 정의(Task 2 Step 1)와 actor/item 시트 호출(Step 4c/5b) 일치. ✓
- `registerThemeSetting()` — theme.mjs 정의와 magicalogia.mjs 호출(Step 2) 일치. ✓
- 설정 키 `"magicalogia"`/`"theme"` — register(Step 1)와 get(applyTheme) 일치. ✓
- i18n 키 `MAGICALOGIA.settings.theme.{name,hint,dark,light}` — register choices/name/hint(Step 1)와 ko.json(Step 3) 일치. ✓
- `MAGICALOGIA.themes.{dark,light}` — config.mjs 기존 정의와 applyTheme 사용 일치. ✓
- 테스트의 `NON_COLOR` 집합(radius/row-h/head-h) — \_tokens.scss 비색상 토큰과 일치. ✓
