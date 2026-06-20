# 설계 — Stage 5 (라이트 테마 + 클라이언트 설정 토글)

> 2026-06-20 · 브랜치 `develop` · 시안 출처: `docs/design/new/`(gitignore — `example.html`의 `.magicalogia.theme-light` 블록이 라이트 토큰 기준).
> 로드맵의 마지막 스테이지 S5. S1~S4 완료(로컬 develop). 이 문서 = S5 상세 설계. 다음 단계는 자체 plan→subagent-driven 사이클.

## 배경

로드맵의 마지막 단계. 다크(마법진 바이올렛) 외에 라이트(양피지) 테마를 추가하고, 사용자가 Foundry 게임 설정에서 전환할 수 있게 한다.

핵심 전제: **모든 컴포넌트 SCSS가 `--mg-*` custom property 기반(theme-agnostic)**이다. 따라서 라이트 테마는 토큰 값만 오버라이드하면 전체가 전환된다. 시안 `example.html`에 `.magicalogia.theme-light` 오버라이드 블록이 이미 디자인 목표로 존재한다.

기존 인프라: `config.mjs`에 `MAGICALOGIA.themes = { dark: "theme-dark", light: "theme-light" }`가 정의돼 있다(주석은 "액터 flag"라 적혀 있으나 본 설계에서 클라이언트 설정으로 변경한다). `actor-sheet.mjs`의 `DEFAULT_OPTIONS.classes`에 `"theme-dark"`가 하드코딩돼 있다.

## 핵심 결정

- **저장 범위: 클라이언트 설정**(`game.settings`, `scope: "client"`). 보는 사람(개인) 기준으로 모든 마기카로기아 시트에 동일 테마 적용.
- **토글 UI: Foundry 게임 설정 메뉴**(`config: true`). 시트 내 별도 버튼 없음 — 설정 드롭다운(다크/라이트)에서 선택.
- **적용 범위: 액터 시트 + 아이템 시트 모두.** 라이트 모드에서 아이템 시트만 다크로 남는 불일치를 막는다.
- 다크가 기본(`.magicalogia` 토큰). 라이트는 `.magicalogia.theme-light` 오버라이드. `theme-dark` 클래스는 일관성을 위해 부여하되 실제 오버라이드는 `theme-light`만 한다.
- 데이터 모델·마이그레이션 변경 없음. 커밋 메시지: 영어 한 줄, co-author 없음.

## 변경 파일·내용

### ① `scss/theme/_tokens.scss` — 라이트 토큰 오버라이드

기존 `.magicalogia { … }`(다크 기본) 블록 뒤에 추가. 시안 `example.html`의 `.magicalogia.theme-light` 값을 그대로 이식:

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

(`--mg-radius`/`--mg-row-h`/`--mg-head-h` 등 비색상 토큰은 테마 공통이므로 오버라이드하지 않는다.)

### ② `module/helpers/theme.mjs` (신설) — 설정 등록 + 적용 헬퍼

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

> `onChange`는 `render()` 대신 element 클래스만 교체한다 — 테마는 순수 CSS 변수라 DOM 재생성 없이 즉시 전환된다(가볍고 폼 입력 상태도 보존).

### ③ `module/magicalogia.mjs` — init hook에서 설정 등록

상단 import에 추가:

```js
import { registerThemeSetting } from "./helpers/theme.mjs";
```

init hook 안, `registerHandlebarsHelpers();` 호출 부근에 추가:

```js
registerThemeSetting();
```

### ④ `lang/ko.json` — i18n

`MAGICALOGIA` 객체 안에 추가:

```json
"settings": {
  "theme": {
    "name": "테마",
    "hint": "캐릭터/아이템 시트의 색 테마를 선택합니다. (이 클라이언트에만 적용)",
    "dark": "다크 (마법진)",
    "light": "라이트 (양피지)"
  }
}
```

### ⑤ `module/sheets/actor-sheet.mjs` — 테마 클래스 동적 적용

- `DEFAULT_OPTIONS.classes`에서 `"theme-dark"` 제거: `classes: ["magicalogia", "sheet", "actor"]`.
- 상단 import에 `import { applyTheme } from "../helpers/theme.mjs";` 추가.
- `_onRender` 끝(아코디언 복원 뒤)에 `applyTheme(this.element);` 추가.

### ⑥ `module/sheets/item-sheet.mjs` — 테마 클래스 동적 적용

- 상단 import에 `import { applyTheme } from "../helpers/theme.mjs";` 추가.
- `_onRender` 메서드 신설(없으므로):

```js
  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
  }
```

(`classes`에는 theme 클래스가 없으므로 제거할 것 없음 — `applyTheme`가 부여.)

### ⑦ `module/helpers/config.mjs` — 주석 정정

`MAGICALOGIA.themes` 주석을 "테마 루트 클래스 (액터 flag로 선택)" → "테마 루트 클래스 (클라이언트 설정으로 선택)"로 수정.

## 검증

- `npm run build` 성공 — `.magicalogia.theme-light` 컴파일, `dist/magicalogia.css` 생성.
- `npm test` 무회귀 — 데이터 모델·로직 변경 없음, 50개 통과 유지.
- **Foundry 실렌더:**
  - 게임 설정 메뉴에 "테마" 드롭다운(다크/라이트) 노출. 기본 다크.
  - 라이트 선택 → 열린 액터·아이템 시트가 즉시 양피지(밝은 배경, 갈색 골드, 어두운 잉크)로 전환. 다시 다크 → 복귀.
  - 전환 시 폼 입력값·아코디언 펼침 상태 보존(클래스만 교체).
  - 라이트 모드에서 헤더밴드·마법표·상태칩·아코디언·정보탭·아이템 시트 모두 가독성 유지.
  - 시트를 닫았다 다시 열어도 설정 테마 유지.

## 비목표 (후속)

- 속성·능력 탭 활성화(별도 작업).
- 채팅 카드·다이얼로그 등 시트 외 UI 테마.
- 액터별/시트별 개별 테마(클라이언트 전역 단일 테마로 한정).
- 시안 라이트 토큰의 세부 색 튜닝(시안 값 그대로 이식 — 육안 후 필요 시 후속).

## 함정 / 참고

- `game.settings.get`은 `ready` 이후 유효. `applyTheme`는 시트 `_onRender`(렌더 시점)에서만 호출하므로 안전.
- `choices` 값에 i18n 키를 주면 Foundry V13이 설정 UI 렌더 시 자동 localize한다.
- `foundry.applications.instances`는 열린 ApplicationV2 인스턴스 Map. magicalogia 클래스 보유 여부로 시트를 식별한다.
- 라이트 토큰의 `--mg-line: #5a3d2457` 등 8자리 hex(알파 포함)는 시안 원본 그대로 — prettier/SCSS가 보존한다.
- `docs/design/`은 gitignore — 라이트 토큰은 본 SCSS 이식으로 시스템에 들어와야 배포에 포함된다.
