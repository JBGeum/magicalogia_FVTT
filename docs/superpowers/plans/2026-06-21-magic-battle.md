# 마법전 (다이스 대결) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GM이 마법전 패널에서 선공/후공을 지정해 다이스 대결을 진행하고(공격/방어 1:1 상쇄·대미지), PC는 소켓 다이얼로그로 참여하며 부스트로 추가 다이스를 표시한다.

**Architecture:** 순수 해결 로직(`magic-battle.mjs`)을 Foundry 비의존으로 분리해 단위 테스트하고, 채팅 카드(템플릿+SCSS)·다이얼로그(ApplicationV2)·GM 패널(ApplicationV2)·소켓 레이어(`game.socket`)를 그 위에 얹는다. 기존 `spell-charge.mjs`(순수+Foundry 동거)·`specialty-picker.mjs`(ApplicationV2) 패턴을 미러링한다.

**Tech Stack:** FoundryVTT V13(ApplicationV2, `foundry.applications.handlebars`, `foundry.documents.collections`), Handlebars, SCSS(Vite 번들), vitest(node, Foundry 비의존).

**Spec:** `docs/superpowers/specs/2026-06-21-magic-battle-design.md`

## Global Constraints

- 커밋 메시지: **영어 한 줄 conventional, co-author 없음**. lint-staged(prettier/eslint)가 md/scss/hbs/mjs를 커밋 시 자동 정렬(정상).
- 신규 템플릿은 `module/helpers/templates.mjs`의 `loadTemplates([...])`에 **반드시 등록**(`test/template-partials.test.mjs` 가드).
- 시안 CSS의 토큰 블록(`--mg-*`/`.theme-*`)·폰트 `@import`는 **이식 금지** — `scss/theme/_tokens.scss` 재사용. 컴포넌트 규칙만 `.magicalogia {}` 중첩. **신규 색 토큰 0**.
- 채팅 카드는 **라이트 고정**(루트 `class="magicalogia theme-light"`).
- 순수 로직만 vitest 단위 테스트. Foundry 의존부(post\*/apply/소켓/앱/훅/씬버튼)는 `npm run build` 통과 + **F5 육안**(모델/훅/씬컨트롤/소켓 등록 변경 → **서버 재시작 후 F5**).
- 데이터 모델 변경 없음: 근원력 = `actor.system.abilities.source`(정수), 생명력 = `actor.system.health.value`(min 0).
- 검증 명령: `npm test`(현재 77 통과 기준 → 본 plan 후 +pure 케이스), `npm run build`.

---

## File Structure

**신규**

- `module/system/magic-battle.mjs` — 순수(`resolveExchange`/`renderBattleDie`/`buildBattleCard`/`buildBoostCard`) + Foundry(`postBattleCard`/`postBoostCard`/`applyBattleDamage`).
- `module/system/battle-socket.mjs` — `game.socket` 요청/응답 + `ready` 등록.
- `module/apps/battle-dice-dialog.mjs` — 다이스 선택/부스트 다이얼로그(ApplicationV2, 공용).
- `module/apps/magic-battle-panel.mjs` — GM 패널(ApplicationV2, 오케스트레이션).
- `templates/apps/battle-dice-dialog.hbs`, `templates/apps/magic-battle-panel.hbs`.
- `templates/chat/battle-card.hbs`, `templates/chat/boost-card.hbs`.
- `scss/component/_battle-ui.scss` — 패널/다이얼로그.
- `test/magic-battle.test.mjs` — 순수 단위 테스트.

**수정**

- `module/magicalogia.mjs` — `getSceneControlButtons`(GM 버튼)·`ready`(소켓)·`renderChatMessageHTML`(적용 버튼) 훅.
- `module/helpers/templates.mjs` — 신규 템플릿 4종 등록.
- `scss/component/_chat-card.scss` — 배틀/부스트 카드 규칙 추가(장서충전 카드 선례대로 이 파일에 모음 — 신규 chat SCSS 파일 X).
- `scss/magicalogia.scss` — `@use "component/battle-ui"` 1줄 추가.

> **스펙과의 차이**: 스펙 §5.6은 `_battle-card.scss`를 신규로 들었으나, `.mg-card`/`.mg-die`/pip `i`가 이미 `_chat-card.scss`에 존재하고 장서충전 카드도 같은 파일에 모았으므로 **배틀 카드 규칙은 `_chat-card.scss`에 추가**(DRY·컨벤션). 패널/다이얼로그만 신규 `_battle-ui.scss`.

---

## Task 1: 순수 — resolveExchange (1:1 비대칭 상쇄)

**Files:**

- Create: `module/system/magic-battle.mjs`
- Test: `test/magic-battle.test.mjs`

**Interfaces:**

- Consumes: (없음)
- Produces: `resolveExchange(attack: number[], defense: number[]) => { attackMarks: {v,st}[], defenseMarks: {v,st}[], surviving: number[], damage: number }` — `st`는 attack에서 `"valid"|"cancel"`, defense에서 `"cancel"|"leftover"`.

- [ ] **Step 1: 실패 테스트 작성**

`test/magic-battle.test.mjs` 생성:

```js
import { describe, it, expect } from "vitest";
import { resolveExchange } from "../module/system/magic-battle.mjs";

describe("resolveExchange", () => {
  it("기본: [4,4,2] vs [4,5] → 유효 [4,2], 대미지 2", () => {
    const r = resolveExchange([4, 4, 2], [4, 5]);
    expect(r.surviving).toEqual([4, 2]);
    expect(r.damage).toBe(2);
    expect(r.attackMarks).toEqual([
      { v: 4, st: "cancel" },
      { v: 4, st: "valid" },
      { v: 2, st: "valid" },
    ]);
    expect(r.defenseMarks).toEqual([
      { v: 4, st: "cancel" },
      { v: 5, st: "leftover" },
    ]);
  });

  it("전부 상쇄: [3,3] vs [3,3] → 대미지 0", () => {
    const r = resolveExchange([3, 3], [3, 3]);
    expect(r.surviving).toEqual([]);
    expect(r.damage).toBe(0);
    expect(r.defenseMarks.every((m) => m.st === "cancel")).toBe(true);
  });

  it("전부 통과: [1,2] vs [] → 대미지 2", () => {
    const r = resolveExchange([1, 2], []);
    expect(r.surviving).toEqual([1, 2]);
    expect(r.damage).toBe(2);
  });

  it("방어 과잉: [5] vs [5,5,1] → 대미지 0, 방어 5 하나만 cancel", () => {
    const r = resolveExchange([5], [5, 5, 1]);
    expect(r.damage).toBe(0);
    expect(r.defenseMarks).toEqual([
      { v: 5, st: "cancel" },
      { v: 5, st: "leftover" },
      { v: 1, st: "leftover" },
    ]);
  });

  it("중복 부분 매칭: [6,6,6] vs [6,6] → 유효 [6], 대미지 1", () => {
    const r = resolveExchange([6, 6, 6], [6, 6]);
    expect(r.surviving).toEqual([6]);
    expect(r.damage).toBe(1);
  });

  it("빈 공격: [] vs [3] → 대미지 0", () => {
    const r = resolveExchange([], [3]);
    expect(r.damage).toBe(0);
    expect(r.attackMarks).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/magic-battle.test.mjs`
Expected: FAIL — `resolveExchange is not a function` (또는 import 실패).

- [ ] **Step 3: 최소 구현**

`module/system/magic-battle.mjs` 생성:

```js
/**
 * 마법전 다이스 대결 — 순수 해결 로직 + Foundry 발행.
 * 공격/방어 비대칭 1:1 상쇄: 공격 다이스를 방어 다이스와 같은 눈끼리 1:1 매칭,
 * 남은(매칭 안 된) 공격 다이스 수 = 방어측 대미지.
 */

/**
 * 1:1 비대칭 상쇄. 소모된 방어 인덱스를 추적해 중복 눈도 정확히 1:1 소거.
 * @returns {{attackMarks:{v:number,st:string}[], defenseMarks:{v:number,st:string}[], surviving:number[], damage:number}}
 */
export function resolveExchange(attack, defense) {
  const usedIdx = new Set();
  const attackMarks = attack.map((v) => {
    const i = defense.findIndex((dv, idx) => dv === v && !usedIdx.has(idx));
    if (i > -1) {
      usedIdx.add(i);
      return { v, st: "cancel" };
    }
    return { v, st: "valid" };
  });
  const defenseMarks = defense.map((v, idx) =>
    usedIdx.has(idx) ? { v, st: "cancel" } : { v, st: "leftover" },
  );
  const surviving = attackMarks.filter((m) => m.st === "valid").map((m) => m.v);
  return { attackMarks, defenseMarks, surviving, damage: surviving.length };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/magic-battle.test.mjs`
Expected: PASS (6 케이스).

- [ ] **Step 5: 커밋**

```bash
git add module/system/magic-battle.mjs test/magic-battle.test.mjs
git commit -m "feat: add resolveExchange for magic battle 1:1 cancellation"
```

---

## Task 2: 순수 — renderBattleDie (pip 면 markup)

**Files:**

- Modify: `module/system/magic-battle.mjs`
- Test: `test/magic-battle.test.mjs`

**Interfaces:**

- Consumes: (모듈 내 `PIPS`)
- Produces: `renderBattleDie(v: number, st: "valid"|"cancel"|"leftover") => string` — `.mg-die-wrap.is-${st}` > `.mg-die[ mg-die--valid|--cancel]` (leftover=플레인) + `.mg-die-num`.

- [ ] **Step 1: 실패 테스트 작성**

`test/magic-battle.test.mjs`에 describe 추가(상단 import에 `renderBattleDie` 합치기):

```js
import { resolveExchange, renderBattleDie } from "../module/system/magic-battle.mjs";

describe("renderBattleDie", () => {
  it("valid: 골드 클래스 + pip 개수(4→4개)", () => {
    const h = renderBattleDie(4, "valid");
    expect(h).toContain("mg-die--valid");
    expect(h).toContain("is-valid");
    expect((h.match(/<i><\/i>/g) || []).length).toBe(4);
    expect(h).toContain(">4</span>");
  });
  it("cancel: 상쇄 클래스", () => {
    const h = renderBattleDie(3, "cancel");
    expect(h).toContain("mg-die--cancel");
    expect(h).toContain("is-cancel");
  });
  it("leftover: 모디파이어 없는 플레인 면", () => {
    const h = renderBattleDie(5, "leftover");
    expect(h).toContain("is-leftover");
    expect(h).not.toContain("mg-die--valid");
    expect(h).not.toContain("mg-die--cancel");
  });
});
```

> 기존 `import { resolveExchange } from ...` 줄을 위 한 줄로 교체(중복 import 금지).

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/magic-battle.test.mjs`
Expected: FAIL — `renderBattleDie is not a function`.

- [ ] **Step 3: 최소 구현**

`module/system/magic-battle.mjs` 상단(파일 첫 주석 블록 다음)에 추가:

```js
// d6 pip 배치 (0..8 = 3×3 셀 인덱스). 시안 chat-card-helpers.js와 동일.
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/**
 * 다이스 한 면을 pip 그리드 markup으로. st: "valid"|"cancel"|"leftover".
 * leftover=중립 플레인 면(.mg-die만). 공개 카드 전용(시안 "back"은 v1 미사용).
 */
export function renderBattleDie(v, st) {
  let cells = "";
  for (let i = 0; i < 9; i++) cells += PIPS[v].includes(i) ? "<i></i>" : "<span></span>";
  const mod = st === "valid" ? " mg-die--valid" : st === "cancel" ? " mg-die--cancel" : "";
  return `<span class="mg-die-wrap is-${st}"><span class="mg-die${mod}">${cells}</span><span class="mg-die-num">${v}</span></span>`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/magic-battle.test.mjs`
Expected: PASS (resolveExchange 6 + renderBattleDie 3).

- [ ] **Step 5: 커밋**

```bash
git add module/system/magic-battle.mjs test/magic-battle.test.mjs
git commit -m "feat: add renderBattleDie pip markup for battle cards"
```

---

## Task 3: 순수 — buildBattleCard (전투 카드 데이터)

**Files:**

- Modify: `module/system/magic-battle.mjs`
- Test: `test/magic-battle.test.mjs`

**Interfaces:**

- Consumes: `resolveExchange`, `renderBattleDie`
- Produces: `buildBattleCard({round, exchange, attacker, defender, attack, defense}) => {round, exchange, attacker, defender, damage, attackDiceHtml, defenseDiceHtml}`

- [ ] **Step 1: 실패 테스트 작성**

`test/magic-battle.test.mjs`에 추가(import에 `buildBattleCard` 합치기):

```js
import {
  resolveExchange,
  renderBattleDie,
  buildBattleCard,
} from "../module/system/magic-battle.mjs";

describe("buildBattleCard", () => {
  it("[4,4,2] vs [4,5]: damage 2, 라벨 패스스루, dieHtml 클래스", () => {
    const c = buildBattleCard({
      round: 1,
      exchange: 1,
      attacker: "이졸데",
      defender: "고블린",
      attack: [4, 4, 2],
      defense: [4, 5],
    });
    expect(c).toMatchObject({
      round: 1,
      exchange: 1,
      attacker: "이졸데",
      defender: "고블린",
      damage: 2,
    });
    expect(c.attackDiceHtml).toContain("mg-die--valid");
    expect(c.attackDiceHtml).toContain("mg-die--cancel");
    expect(c.defenseDiceHtml).toContain("mg-die--cancel");
    expect(c.defenseDiceHtml).toContain("is-leftover");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/magic-battle.test.mjs`
Expected: FAIL — `buildBattleCard is not a function`.

- [ ] **Step 3: 최소 구현**

`module/system/magic-battle.mjs`의 `renderBattleDie` 다음에 추가:

```js
/** 전투 카드 템플릿 데이터(순수). 공개 시 발행 전제. */
export function buildBattleCard({ round, exchange, attacker, defender, attack, defense }) {
  const { attackMarks, defenseMarks, damage } = resolveExchange(attack, defense);
  return {
    round,
    exchange,
    attacker,
    defender,
    damage,
    attackDiceHtml: attackMarks.map((m) => renderBattleDie(m.v, m.st)).join(""),
    defenseDiceHtml: defenseMarks.map((m) => renderBattleDie(m.v, m.st)).join(""),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/magic-battle.test.mjs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add module/system/magic-battle.mjs test/magic-battle.test.mjs
git commit -m "feat: add buildBattleCard template data builder"
```

---

## Task 4: 순수 — buildBoostCard (부스트 카드 데이터)

**Files:**

- Modify: `module/system/magic-battle.mjs`
- Test: `test/magic-battle.test.mjs`

**Interfaces:**

- Consumes: `renderBattleDie`
- Produces: `buildBoostCard({who, n, dice, struck}) => {who, n, dice: {v,st}[], diceHtml}` — `struck` 값과 1:1 소거(중복 포함)해 매칭=cancel·나머지=valid.

- [ ] **Step 1: 실패 테스트 작성**

`test/magic-battle.test.mjs`에 추가(import에 `buildBoostCard` 합치기):

```js
import {
  resolveExchange,
  renderBattleDie,
  buildBattleCard,
  buildBoostCard,
} from "../module/system/magic-battle.mjs";

describe("buildBoostCard", () => {
  it("struck 1:1 소거: dice [5,3], struck [3] → 3=cancel, 5=valid", () => {
    const c = buildBoostCard({ who: "이졸데", n: 2, dice: [5, 3], struck: [3] });
    expect(c.dice).toEqual([
      { v: 5, st: "valid" },
      { v: 3, st: "cancel" },
    ]);
    expect(c.who).toBe("이졸데");
    expect(c.n).toBe(2);
    expect(c).not.toHaveProperty("sum");
  });
  it("중복 struck: dice [4,4,2], struck [4,4] → 4·4 cancel, 2 valid", () => {
    const c = buildBoostCard({ who: "x", n: 3, dice: [4, 4, 2], struck: [4, 4] });
    expect(c.dice.map((d) => d.st)).toEqual(["cancel", "cancel", "valid"]);
  });
  it("n 미지정 시 dice.length", () => {
    expect(buildBoostCard({ who: "x", dice: [1, 2] }).n).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/magic-battle.test.mjs`
Expected: FAIL — `buildBoostCard is not a function`.

- [ ] **Step 3: 최소 구현**

`module/system/magic-battle.mjs`의 `buildBattleCard` 다음에 추가:

```js
/**
 * 부스트 카드 데이터(순수, 표시 전용). dice=굴린 nD6, struck=상대 잔여(1:1 소거).
 * 시안 buildBoostCard 이식. 자동 합산/합계 없음.
 */
export function buildBoostCard({ who, n, dice, struck = [] }) {
  const used = [...struck];
  const marked = dice.map((v) => {
    const k = used.indexOf(v);
    if (k > -1) {
      used.splice(k, 1);
      return { v, st: "cancel" };
    }
    return { v, st: "valid" };
  });
  return {
    who,
    n: n ?? dice.length,
    dice: marked,
    diceHtml: marked.map((d) => renderBattleDie(d.v, d.st)).join(""),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/magic-battle.test.mjs`
Expected: PASS (전체).

- [ ] **Step 5: 커밋**

```bash
git add module/system/magic-battle.mjs test/magic-battle.test.mjs
git commit -m "feat: add buildBoostCard display-only data builder"
```

---

## Task 5: 전투 카드 템플릿 + SCSS

**Files:**

- Create: `templates/chat/battle-card.hbs`
- Modify: `module/helpers/templates.mjs` (loadTemplates 등록)
- Modify: `scss/component/_chat-card.scss` (배틀 카드 규칙 추가)

**Interfaces:**

- Consumes: `buildBattleCard` 데이터(`round/exchange/attacker/defender/damage/attackDiceHtml/defenseDiceHtml`)
- Produces: `systems/magicalogia/templates/chat/battle-card.hbs` 렌더 가능. 적용 버튼 `[data-action="apply-battle-damage"]`.

- [ ] **Step 1: 템플릿 생성**

`templates/chat/battle-card.hbs`:

```hbs
{{!
  마법전 다이스 대결 카드 (공개·라이트 고정). 데이터: buildBattleCard()
  공격(red)/방어(gold) 양측 다이스 + 유효 공격 수 = 대미지 + GM 적용 버튼.
}}
<div class="magicalogia theme-light">
  <div class="mg-card">
    <div class="mg-card__head">
      <span class="mg-card__sigil"><svg viewBox="0 0 16 16" fill="currentColor"><path
            d="M9.5 1L3 9h3.2l-1 6 6.3-9H8.3z"
          /></svg></span>
      <span class="mg-card__who">마법전 · {{round}}라운드 · 교전{{exchange}}</span>
    </div>
    <div class="mg-card__body">
      <div class="mg-side">
        <span class="mg-side__tag mg-side__tag--atk">공격</span>
        <span class="mg-side__name">{{attacker}}</span>
        <span class="mg-side__dice">{{{attackDiceHtml}}}</span>
      </div>
      <div class="mg-side">
        <span class="mg-side__tag">방어</span>
        <span class="mg-side__name">{{defender}}</span>
        <span class="mg-side__dice">{{{defenseDiceHtml}}}</span>
      </div>
      <div class="mg-result">
        <span class="mg-result__icon"><svg viewBox="0 0 16 16" fill="currentColor"><path
              d="M8 1l1.7 4 4.3.3-3.3 2.8 1 4.2L8 12.2 4.3 12.3l1-4.2L2 5.3 6.3 5z"
            /></svg></span>
        <span>공격 유효 <b>{{damage}}</b> → {{defender}}에게 <b>{{damage}}</b> 대미지</span>
        <button type="button" class="mg-apply" data-action="apply-battle-damage">적용</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: loadTemplates 등록**

`module/helpers/templates.mjs`의 배열에서 `"systems/magicalogia/templates/chat/charge-card.hbs",` 다음 줄에 추가:

```js
    "systems/magicalogia/templates/chat/battle-card.hbs",
```

- [ ] **Step 3: SCSS 규칙 추가**

`scss/component/_chat-card.scss` **맨 끝**(파일 마지막 `}` 다음)에 새 블록 추가:

```scss
// =============================================================
//  Battle card (.mg-side / .mg-die--valid/--cancel / .mg-result / .mg-apply)
//  Source: docs/design/마법전/styles/magicalogia-battlecard.css
//  Reuses .mg-card / .mg-die / .mg-die i from above. Token blocks excluded.
// =============================================================
.magicalogia {
  .mg-side {
    display: flex;
    align-items: center;
    gap: 9px;
    background: var(--mg-field);
    border: 1px solid var(--mg-line);
    border-radius: 4px;
    padding: 7px 10px;

    &__tag {
      flex: none;
      width: 42px;
      text-align: center;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: var(--mg-bar-ink);
      background: var(--mg-bar);
      border: 1px solid var(--mg-gold);
      border-radius: 3px;
      padding: 3px 0;

      &--atk {
        background: linear-gradient(180deg, #b5454e, #9c343f);
      }
      &--pc {
        background: linear-gradient(180deg, #b58a3e, #9c7430);
      }
    }
    &__name {
      flex: none;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--mg-soft);
      white-space: nowrap;
    }
    &__dice {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      flex: 1;
    }
  }

  .mg-die-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .mg-die-num {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--mg-faint);
    line-height: 1;
  }

  .mg-die--cancel {
    position: relative;
    opacity: 0.42;
    border-style: dashed;

    i {
      background: var(--mg-faint);
    }
    &::after {
      content: "";
      position: absolute;
      left: 3px;
      right: 3px;
      top: 50%;
      height: 1.5px;
      background: var(--mg-bad);
      transform: rotate(-22deg);
      transform-origin: center;
    }
  }
  .mg-die-wrap.is-cancel .mg-die-num {
    color: var(--mg-bad);
    text-decoration: line-through;
  }

  .mg-die--valid {
    border-color: var(--mg-gold);
    background: var(--mg-hi);
    box-shadow: 0 0 0 1.5px var(--mg-gold) inset;

    i {
      background: var(--mg-gold);
    }
  }
  .mg-die-wrap.is-valid .mg-die-num {
    color: var(--mg-gold);
    font-weight: 800;
  }

  .mg-result {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12px;
    font-weight: 700;
    color: var(--mg-soft);
    background: var(--mg-good-bg);
    border: 1px solid var(--mg-gold);
    border-left: 3px solid var(--mg-gold);
    border-radius: 3px;
    padding: 6px 10px;

    &__icon {
      flex: none;
      color: var(--mg-gold);
      display: flex;

      svg {
        width: 13px;
        height: 13px;
        display: block;
      }
    }
    b {
      color: var(--mg-gold);
      font-weight: 800;
    }
  }

  .mg-apply {
    margin-left: auto;
    flex: none;
    font-size: 11.5px;
    font-weight: 800;
    color: var(--mg-bar-ink);
    background: var(--mg-bar);
    border: 1px solid var(--mg-gold);
    border-radius: 4px;
    padding: 4px 13px;
    cursor: pointer;
    transition: filter 0.12s;

    &:hover {
      filter: brightness(1.08);
    }
    &:disabled {
      opacity: 0.55;
      cursor: default;
    }
  }
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공(SCSS 컴파일 에러 없음, `dist/` 갱신).

- [ ] **Step 5: 커밋**

```bash
git add templates/chat/battle-card.hbs module/helpers/templates.mjs scss/component/_chat-card.scss
git commit -m "feat: add battle card template and styles"
```

> F5 육안은 Task 7(발행 함수) 이후 콘솔 스니펫으로 확인.

---

## Task 6: 부스트 카드 템플릿

**Files:**

- Create: `templates/chat/boost-card.hbs`
- Modify: `module/helpers/templates.mjs`

**Interfaces:**

- Consumes: `buildBoostCard` 데이터(`who/n/diceHtml`)
- Produces: `systems/magicalogia/templates/chat/boost-card.hbs` 렌더 가능. (SCSS는 Task 5의 `.mg-side`/`.mg-die*` 재사용 — 추가 없음.)

- [ ] **Step 1: 템플릿 생성**

`templates/chat/boost-card.hbs`:

```hbs
{{!
  마법전 부스트 카드 (표시 전용·라이트 고정). 데이터: buildBoostCard()
  +nD6 가산 다이스. 이전 결과 상대 잔여와 1:1 상쇄(cancel) 표시. 합계 없음.
}}
<div class="magicalogia theme-light">
  <div class="mg-card">
    <div class="mg-card__head">
      <span class="mg-card__sigil"><svg viewBox="0 0 16 16" fill="currentColor"><path
            d="M9.5 1L3 9h3.2l-1 6 6.3-9H8.3z"
          /></svg></span>
      <span class="mg-card__who">{{who}} · 부스트</span>
    </div>
    <div class="mg-card__body">
      <div class="mg-side">
        <span class="mg-side__tag mg-side__tag--pc">+{{n}}D6</span>
        <span class="mg-side__dice">{{{diceHtml}}}</span>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: loadTemplates 등록**

`module/helpers/templates.mjs`의 `battle-card.hbs` 줄 다음에 추가:

```js
    "systems/magicalogia/templates/chat/boost-card.hbs",
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: 커밋**

```bash
git add templates/chat/boost-card.hbs module/helpers/templates.mjs
git commit -m "feat: add boost card template"
```

---

## Task 7: 발행 함수 + 대미지 적용 + 채팅 훅

**Files:**

- Modify: `module/system/magic-battle.mjs` (`postBattleCard`/`applyBattleDamage`)
- Modify: `module/magicalogia.mjs` (`renderChatMessageHTML` 훅 + import)

**Interfaces:**

- Consumes: `buildBattleCard`, `ChatMessage`, `foundry.applications.handlebars.renderTemplate`
- Produces:
  - `postBattleCard(attackerActor, defenderActor, {round, exchange, attack, defense}) => Promise<void>` — flags `magicalogia.battle = {defenderId, damage, applied:false}`.
  - `applyBattleDamage(message) => Promise<void>` — 멱등(`applied`).
  - `bindBattleCardActions(message, html)` — 적용 버튼 바인딩(GM 전용, applied면 비활성).

- [ ] **Step 1: 발행/적용 함수 구현**

`module/system/magic-battle.mjs` **맨 끝**에 추가:

```js
/* ===== Foundry 의존부 (F5 육안) ===== */

/** 공개된 전투 카드를 채팅에 발행. 라이트 고정. 적용 버튼용 flag 포함. */
export async function postBattleCard(
  attackerActor,
  defenderActor,
  { round, exchange, attack, defense },
) {
  const speaker = ChatMessage.getSpeaker({ actor: attackerActor });
  const data = buildBattleCard({
    round,
    exchange,
    attacker: attackerActor.name,
    defender: defenderActor.name,
    attack,
    defense,
  });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/battle-card.hbs",
    data,
  );
  await ChatMessage.create({
    speaker,
    content,
    flags: {
      magicalogia: {
        battle: { defenderId: defenderActor.id, damage: data.damage, applied: false },
      },
    },
  });
}

/** 부스트 카드 발행(표시 전용). */
export async function postBoostCard(actor, { n, dice, struck }) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const data = buildBoostCard({ who: actor.name, n, dice, struck });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/boost-card.hbs",
    data,
  );
  await ChatMessage.create({ speaker, content });
}

/** 전투 카드 대미지를 방어측 생명력에 적용(멱등). GM만 호출. */
export async function applyBattleDamage(message) {
  const f = message.getFlag("magicalogia", "battle");
  if (!f || f.applied) return;
  const actor = game.actors.get(f.defenderId);
  if (!actor) {
    ui.notifications.warn("대미지 적용 대상 액터를 찾을 수 없습니다.");
    return;
  }
  const cur = actor.system.health.value ?? 0;
  await actor.update({ "system.health.value": Math.max(0, cur - f.damage) });
  await message.setFlag("magicalogia", "battle", { ...f, applied: true });
}

/** 채팅 카드의 적용 버튼 바인딩(renderChatMessageHTML 훅에서 호출). */
export function bindBattleCardActions(message, html) {
  const btn = html.querySelector('[data-action="apply-battle-damage"]');
  if (!btn) return;
  if (!game.user.isGM) {
    btn.style.display = "none";
    return;
  }
  const f = message.getFlag("magicalogia", "battle");
  if (f?.applied) {
    btn.textContent = "적용됨";
    btn.disabled = true;
    return;
  }
  btn.addEventListener("click", () => applyBattleDamage(message));
}
```

> `postBoostCard`도 여기서 함께 정의(Task 11에서 사용). buildBoostCard는 Task 4에서 export됨.

- [ ] **Step 2: 채팅 훅 등록**

`module/magicalogia.mjs` 상단 import 블록(Helpers 아래)에 추가:

```js
import { bindBattleCardActions } from "./system/magic-battle.mjs";
```

그리고 `Hooks.once("init", ...)` 블록 **다음**(파일 끝)에 추가:

```js
// 채팅 카드 적용 버튼 위임 바인딩. V13: renderChatMessageHTML(html=HTMLElement).
Hooks.on("renderChatMessageHTML", (message, html) => {
  bindBattleCardActions(message, html);
});
```

> **버전 주의**: 일부 V13 빌드는 `renderChatMessage`(html=jQuery)만 발화. F5에서 적용 버튼 미동작 시 `Hooks.on("renderChatMessage", (m, html) => bindBattleCardActions(m, html[0]))`로 대체.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: F5 육안 (서버 재시작 후)**

Foundry 콘솔(GM)에서 임시 발행:

```js
const [a, b] = game.actors.contents;
game.system?.id; // "magicalogia" 확인
import("/systems/magicalogia/dist/module/magicalogia.mjs"); // 이미 로드됨 — 생략 가능
// 발행:
(await import("/systems/magicalogia/module/system/magic-battle.mjs")).postBattleCard(a, b, {
  round: 1,
  exchange: 1,
  attack: [4, 4, 2],
  defense: [4, 5],
});
```

확인:

- 채팅에 라이트 전투 카드: 공격(red 태그)·방어(gold) 다이스, 공격 4 하나 점선상쇄·나머지 유효(골드), "→ {b}에게 2 대미지", **적용** 버튼.
- **적용** 클릭 → `b`의 생명력 2 감소, 버튼 "적용됨"·비활성. 재클릭/재F5에도 추가 차감 없음(멱등).
- 비-GM 클라이언트에선 적용 버튼 미표시.

> 경로 import가 막히면, Task 10 패널 완성 후 전체 흐름에서 확인해도 됨.

- [ ] **Step 5: 커밋**

```bash
git add module/system/magic-battle.mjs module/magicalogia.mjs
git commit -m "feat: post battle card and apply damage via chat button"
```

---

## Task 8: 다이스 선택 다이얼로그 (ApplicationV2)

**Files:**

- Create: `module/apps/battle-dice-dialog.mjs`
- Create: `templates/apps/battle-dice-dialog.hbs`
- Create: `scss/component/_battle-ui.scss`
- Modify: `module/helpers/templates.mjs`, `scss/magicalogia.scss`

**Interfaces:**

- Consumes: `applyTheme`
- Produces: `new BattleDiceDialog({mode:"attack"|"defense"|"boost", max, prompt, onSubmit})` — attack/defense는 `onSubmit(dice:number[])`, boost는 `onSubmit(dice:number[], n)`(nD6 굴림 결과).

- [ ] **Step 1: 다이얼로그 클래스 생성**

`module/apps/battle-dice-dialog.mjs`:

```js
import { applyTheme } from "../helpers/theme.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * 마법전 다이스 선택/부스트 다이얼로그. 본인 화면에만 표시(타인 숨김).
 * 옵션: { mode:"attack"|"defense"|"boost", max, prompt, onSubmit }
 *   - attack/defense: 눈 1~6을 최대 max개 선택 → onSubmit(dice[])
 *   - boost: nD6 개수 선택 → 굴림 → onSubmit(rolledDice[], n)
 */
export class BattleDiceDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "battle-dice-dialog"],
    window: { title: "마법전 — 다이스" },
    position: { width: 340, height: "auto" },
    actions: {
      addDie: BattleDiceDialog.#onAddDie,
      removeDie: BattleDiceDialog.#onRemoveDie,
      incN: BattleDiceDialog.#onIncN,
      decN: BattleDiceDialog.#onDecN,
      submit: BattleDiceDialog.#onSubmit,
    },
  };

  static PARTS = {
    dialog: { template: "systems/magicalogia/templates/apps/battle-dice-dialog.hbs" },
  };

  constructor(options = {}) {
    super(options);
    this.mode = options.mode ?? "attack";
    this.max = options.max ?? 0;
    this.prompt = options.prompt ?? "";
    this.onSubmit = options.onSubmit ?? null;
    this.dice = [];
    this.n = 1;
  }

  get isBoost() {
    return this.mode === "boost";
  }

  get label() {
    if (this.isBoost) return "부스트 — 추가 다이스";
    return `${this.mode === "attack" ? "공격" : "방어"} 다이스 선택 (최대 ${this.max})`;
  }

  async _prepareContext() {
    return {
      isBoost: this.isBoost,
      label: this.label,
      prompt: this.prompt,
      faces: [1, 2, 3, 4, 5, 6],
      dice: this.dice,
      count: this.dice.length,
      max: this.max,
      atMax: !this.isBoost && this.dice.length >= this.max,
      n: this.n,
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    applyTheme(this.element);
  }

  static #onAddDie(_event, target) {
    if (!this.isBoost && this.dice.length >= this.max) return;
    this.dice.push(Number(target.dataset.value));
    this.render();
  }

  static #onRemoveDie(_event, target) {
    this.dice.splice(Number(target.dataset.index), 1);
    this.render();
  }

  static #onIncN() {
    this.n += 1;
    this.render();
  }

  static #onDecN() {
    if (this.n > 1) this.n -= 1;
    this.render();
  }

  static async #onSubmit() {
    let result, n;
    if (this.isBoost) {
      n = this.n;
      const roll = await new Roll(`${n}d6`).evaluate();
      result = roll.dice[0]?.results.map((r) => r.result) ?? [];
    } else {
      result = this.dice;
    }
    await this.onSubmit?.(result, n);
    this.close();
  }
}
```

- [ ] **Step 2: 템플릿 생성**

`templates/apps/battle-dice-dialog.hbs`:

```hbs
<div class="mg-bdd">
  <div class="mg-bdd__label">{{label}}</div>
  {{#if prompt}}<div class="mg-bdd__prompt">{{prompt}}</div>{{/if}}

  {{#if isBoost}}
  <div class="mg-bdd__boost">
    <button type="button" class="mg-bdd__step" data-action="decN">−</button>
    <span class="mg-bdd__n">{{n}}D6</span>
    <button type="button" class="mg-bdd__step" data-action="incN">＋</button>
  </div>
  {{else}}
  <div class="mg-bdd__faces">
    {{#each faces}}
    <button type="button" class="mg-bdd__face" data-action="addDie" data-value="{{this}}" {{#if ../atMax}}disabled{{/if}}>{{this}}</button>
    {{/each}}
  </div>
  <div class="mg-bdd__chosen">
    {{#each dice}}
    <button type="button" class="mg-bdd__chip" data-action="removeDie" data-index="{{@index}}">{{this}} ✕</button>
    {{else}}
    <span class="mg-bdd__empty">선택한 다이스 없음</span>
    {{/each}}
  </div>
  <div class="mg-bdd__count">{{count}} / {{max}}</div>
  {{/if}}

  <button type="button" class="mg-bdd__submit" data-action="submit">확정</button>
</div>
```

- [ ] **Step 3: SCSS 생성 + @use 등록**

`scss/component/_battle-ui.scss`:

```scss
@use "../theme/vars" as *;

// 다이스 선택/부스트 다이얼로그
.magicalogia .mg-bdd {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  background: var(--mg-paper);
  color: var(--mg-ink);

  &__label {
    font-size: 13px;
    font-weight: 800;
    color: var(--mg-gold);
  }
  &__prompt {
    font-size: 11.5px;
    color: var(--mg-soft);
  }
  &__faces {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 5px;
  }
  &__face {
    height: 34px;
    font-size: 15px;
    font-weight: 800;
    color: var(--mg-ink);
    background: var(--mg-field);
    border: 1px solid var(--mg-line);
    border-radius: 4px;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: var(--mg-hi);
      border-color: var(--mg-gold);
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
  &__chosen {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    min-height: 26px;
  }
  &__chip {
    font-size: 12px;
    font-weight: 800;
    color: var(--mg-gold);
    background: var(--mg-hi);
    border: 1px solid var(--mg-gold);
    border-radius: 999px;
    padding: 2px 9px;
    cursor: pointer;
  }
  &__empty {
    font-size: 11px;
    color: var(--mg-faint);
  }
  &__count {
    font-size: 11px;
    font-weight: 700;
    color: var(--mg-soft);
    text-align: right;
  }
  &__boost {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  &__step {
    width: 30px;
    height: 30px;
    font-size: 16px;
    font-weight: 800;
    color: var(--mg-gold);
    background: var(--mg-field);
    border: 1px solid var(--mg-gold);
    border-radius: 4px;
    cursor: pointer;
  }
  &__n {
    font-size: 18px;
    font-weight: 800;
    color: var(--mg-ink);
    min-width: 54px;
    text-align: center;
  }
  &__submit {
    margin-top: 2px;
    height: 32px;
    font-size: 13px;
    font-weight: 800;
    color: var(--mg-bar-ink);
    background: var(--mg-bar);
    border: 1px solid var(--mg-gold);
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      filter: brightness(1.08);
    }
  }
}

// GM 마법전 패널 (Task 10)
.magicalogia .mg-mbp {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--mg-paper);
  color: var(--mg-ink);

  &__field {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;

    span {
      flex: none;
      width: 42px;
      color: var(--mg-soft);
    }
    select {
      flex: 1;
      background: var(--mg-field);
      color: var(--mg-ink);
      border: 1px solid var(--mg-line);
      border-radius: 4px;
      padding: 4px 6px;
    }
  }
  &__round {
    font-size: 14px;
    font-weight: 800;
    color: var(--mg-gold);
  }
  &__roles {
    font-size: 12px;
    color: var(--mg-soft);

    b {
      color: var(--mg-ink);
    }
  }
  &__chips {
    display: flex;
    gap: 8px;
  }
  &__chip {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--mg-soft);
    background: var(--mg-field);
    border: 1px solid var(--mg-line);
    border-radius: 4px;
    padding: 5px 8px;

    &.is-done {
      color: var(--mg-good);
      border-color: var(--mg-good-line);
      background: var(--mg-good-bg);
    }
    button {
      margin-left: auto;
      font-size: 10.5px;
      color: var(--mg-gold);
      background: transparent;
      border: 1px solid var(--mg-gold);
      border-radius: 3px;
      cursor: pointer;
    }
  }
  &__after {
    display: flex;
    gap: 8px;
  }
  &__btn {
    height: 30px;
    font-size: 12.5px;
    font-weight: 800;
    color: var(--mg-ink);
    background: var(--mg-field);
    border: 1px solid var(--mg-line);
    border-radius: 4px;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: var(--mg-gold);
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
    &--go {
      color: var(--mg-bar-ink);
      background: var(--mg-bar);
      border-color: var(--mg-gold);
    }
    &--end {
      color: var(--mg-bad);
      border-color: var(--mg-bad-line);
    }
  }
  &__boostbar {
    display: flex;
    gap: 8px;

    button {
      flex: 1;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--mg-gold);
      background: var(--mg-hi);
      border: 1px solid var(--mg-gold);
      border-radius: 4px;
      padding: 5px 0;
      cursor: pointer;
    }
  }
}
```

`scss/magicalogia.scss`의 `@use "component/specialty-picker";` 다음 줄에 추가:

```scss
@use "component/battle-ui";
```

- [ ] **Step 4: loadTemplates 등록**

`module/helpers/templates.mjs`의 `"systems/magicalogia/templates/apps/specialty-picker.hbs",` 다음에 추가:

```js
    "systems/magicalogia/templates/apps/battle-dice-dialog.hbs",
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 6: F5 육안 (서버 재시작 후)**

콘솔(GM):

```js
(await import("/systems/magicalogia/module/apps/battle-dice-dialog.mjs")).BattleDiceDialog;
new (await import("/systems/magicalogia/module/apps/battle-dice-dialog.mjs")).BattleDiceDialog({
  mode: "attack",
  max: 3,
  prompt: "테스트",
  onSubmit: (d) => console.log("picked", d),
}).render(true);
```

확인:

- 다이얼로그: 1~6 버튼, 클릭 시 칩 추가(중복 허용), max 도달 시 face 비활성, 칩 클릭 제거, `현재/최대` 카운터.
- 확정 → 콘솔에 선택 배열. 다크/라이트 테마 적용(`applyTheme`).
- boost 모드(`mode:"boost"`): −/＋로 nD6 조절, 확정 시 굴림 결과 배열.

- [ ] **Step 7: 커밋**

```bash
git add module/apps/battle-dice-dialog.mjs templates/apps/battle-dice-dialog.hbs scss/component/_battle-ui.scss scss/magicalogia.scss module/helpers/templates.mjs
git commit -m "feat: add battle dice selection dialog"
```

---

## Task 9: 소켓 레이어 (battle-socket.mjs)

**Files:**

- Create: `module/system/battle-socket.mjs`
- Modify: `module/magicalogia.mjs` (`ready` 훅 등록)

**Interfaces:**

- Consumes: `game.socket`, `MagicBattlePanel`(Task 10에서 생성 — call-time 참조이므로 순환 import 허용)
- Produces:
  - `CHANNEL = "system.magicalogia"`
  - `requestPick({reqId, userId, actorId, role, max, prompt})`, `requestBoost({reqId, userId, side, max, prompt})`
  - `sendPickResult({reqId, dice})`, `sendBoostResult({reqId, n, dice})`
  - `registerBattleSocket()` — `ready`에서 호출.

- [ ] **Step 1: 소켓 모듈 생성**

`module/system/battle-socket.mjs`:

```js
import { BattleDiceDialog } from "../apps/battle-dice-dialog.mjs";
import { MagicBattlePanel } from "../apps/magic-battle-panel.mjs";

export const CHANNEL = "system.magicalogia";

/** GM → PL: 다이스 선택 요청. */
export function requestPick({ reqId, userId, actorId, role, max, prompt }) {
  game.socket.emit(CHANNEL, { t: "battle:pick", reqId, userId, actorId, role, max, prompt });
}

/** GM → PL: 부스트 요청. */
export function requestBoost({ reqId, userId, side, max, prompt }) {
  game.socket.emit(CHANNEL, { t: "battle:boost", reqId, userId, side, max, prompt });
}

/** PL → GM: 선택 결과. */
export function sendPickResult({ reqId, dice }) {
  game.socket.emit(CHANNEL, { t: "battle:pick-result", reqId, dice });
}

/** PL → GM: 부스트 결과. */
export function sendBoostResult({ reqId, n, dice }) {
  game.socket.emit(CHANNEL, { t: "battle:boost-result", reqId, n, dice });
}

/** 수신 디스패치. PL은 본인 userId 요청만 다이얼로그, GM은 결과만 수신. */
function onSocket(msg) {
  switch (msg?.t) {
    case "battle:pick":
      if (game.user.id === msg.userId) {
        new BattleDiceDialog({
          mode: msg.role,
          max: msg.max,
          prompt: msg.prompt,
          onSubmit: (dice) => sendPickResult({ reqId: msg.reqId, dice }),
        }).render(true);
      }
      break;
    case "battle:boost":
      if (game.user.id === msg.userId) {
        new BattleDiceDialog({
          mode: "boost",
          max: msg.max,
          prompt: msg.prompt,
          onSubmit: (dice, n) => sendBoostResult({ reqId: msg.reqId, n, dice }),
        }).render(true);
      }
      break;
    case "battle:pick-result":
      if (game.user.isGM) MagicBattlePanel.deliverPick(msg);
      break;
    case "battle:boost-result":
      if (game.user.isGM) MagicBattlePanel.deliverBoost(msg);
      break;
  }
}

/** ready 훅에서 호출. */
export function registerBattleSocket() {
  game.socket.on(CHANNEL, onSocket);
}
```

> 순환 import(`battle-socket` ↔ `magic-battle-panel`)는 양쪽 모두 **함수 본문(call-time)**에서만 상대를 참조하므로 ES 모듈에서 안전.

- [ ] **Step 2: ready 훅 등록**

`module/magicalogia.mjs` import 블록에 추가:

```js
import { registerBattleSocket } from "./system/battle-socket.mjs";
```

`renderChatMessageHTML` 훅 등록부 다음에 추가:

```js
Hooks.once("ready", registerBattleSocket);
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공(이 시점엔 `magic-battle-panel.mjs`가 아직 없으면 import 에러 — **Task 10과 함께 빌드**되도록, 이 Task의 빌드는 Task 10 직후 합쳐서 확인).

> **순서 메모**: `battle-socket.mjs`가 `magic-battle-panel.mjs`를 import하므로, 빌드 성공은 Task 10에서 패널 파일 생성 후 확정된다. 본 Task에서는 파일 작성·커밋만 하고, `npm run build`는 Task 10 Step에서 함께 통과시킨다.

- [ ] **Step 4: 커밋**

```bash
git add module/system/battle-socket.mjs module/magicalogia.mjs
git commit -m "feat: add battle socket request/response layer"
```

---

## Task 10: GM 패널 + 씬 컨트롤 버튼 (NPC 로컬 + PC 소켓 흐름)

**Files:**

- Create: `module/apps/magic-battle-panel.mjs`
- Create: `templates/apps/magic-battle-panel.hbs`
- Modify: `module/helpers/templates.mjs`, `module/magicalogia.mjs` (`getSceneControlButtons`)

**Interfaces:**

- Consumes: `applyTheme`, `resolveExchange`/`postBattleCard`(magic-battle), `BattleDiceDialog`, `requestPick`(battle-socket)
- Produces:
  - `class MagicBattlePanel` (ApplicationV2)
  - static `MagicBattlePanel.deliverPick(msg)` / `deliverBoost(msg)` — 소켓 수신 라우팅
  - 씬 컨트롤 GM 버튼 → `new MagicBattlePanel().render(true)`

- [ ] **Step 1: 패널 클래스 생성 (부스트 제외 — Task 11에서 추가)**

`module/apps/magic-battle-panel.mjs`:

```js
import { applyTheme } from "../helpers/theme.mjs";
import { resolveExchange, postBattleCard } from "../system/magic-battle.mjs";
import { BattleDiceDialog } from "./battle-dice-dialog.mjs";
import { requestPick } from "../system/battle-socket.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM 마법전 패널. 선공/후공 지정 → 라운드(2교전) 오케스트레이션.
 * 교전: 공격자=공격 다이스, 방어자=방어 다이스(각 ≤ 근원력) 수집 → 공개 → 카드 발행.
 * 상태는 인스턴스 메모리(새로고침 시 소실 → 재개시).
 */
export class MagicBattlePanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "magic-battle-panel"],
    window: { title: "마법전" },
    position: { width: 400, height: "auto" },
    actions: {
      start: MagicBattlePanel.#onStart,
      reveal: MagicBattlePanel.#onReveal,
      requestPick: MagicBattlePanel.#onRequestPick,
      nextExchange: MagicBattlePanel.#onNextExchange,
      end: MagicBattlePanel.#onEnd,
    },
  };

  static PARTS = {
    panel: { template: "systems/magicalogia/templates/apps/magic-battle-panel.hbs" },
  };

  static _active = null;
  static deliverPick(msg) {
    MagicBattlePanel._active?._receivePick(msg);
  }
  static deliverBoost(msg) {
    MagicBattlePanel._active?._receiveBoost?.(msg);
  }

  constructor(options = {}) {
    super(options);
    this._reset();
  }

  _reset() {
    this.started = false;
    this.round = 0;
    this.exchange = 0;
    this.revealed = false;
    this.firstId = null;
    this.secondId = null;
    this.picks = { attack: null, defense: null };
    this.reqs = { attack: null, defense: null };
    this.lastResult = null;
    this.lastRoles = null;
  }

  get _attacker() {
    return game.actors.get(this.exchange === 1 ? this.firstId : this.secondId);
  }
  get _defender() {
    return game.actors.get(this.exchange === 1 ? this.secondId : this.firstId);
  }

  _ownerUser(actor) {
    return (
      game.users.find((u) => u.active && !u.isGM && actor.testUserPermission(u, "OWNER")) ?? null
    );
  }

  async _prepareContext() {
    const actors = game.actors
      .filter((a) => a.type === "character")
      .map((a) => ({ id: a.id, name: a.name }));
    return {
      actors,
      started: this.started,
      round: this.round,
      exchange: this.exchange,
      revealed: this.revealed,
      firstId: this.firstId,
      secondId: this.secondId,
      attacker: this.started ? this._attacker?.name : null,
      defender: this.started ? this._defender?.name : null,
      attackReady: this.picks.attack !== null,
      defenseReady: this.picks.defense !== null,
      bothReady: this.picks.attack !== null && this.picks.defense !== null,
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    MagicBattlePanel._active = this;
    applyTheme(this.element);
  }

  async close(options) {
    if (MagicBattlePanel._active === this) MagicBattlePanel._active = null;
    return super.close(options);
  }

  static async #onStart() {
    const root = this.element;
    this.firstId = root.querySelector('[name="first"]').value;
    this.secondId = root.querySelector('[name="second"]').value;
    if (!this.firstId || !this.secondId) {
      ui.notifications.warn("선공/후공 액터를 모두 선택하세요.");
      return;
    }
    this.started = true;
    this.round = 1;
    await this._beginExchange(1);
  }

  async _beginExchange(n) {
    this.exchange = n;
    this.revealed = false;
    this.picks = { attack: null, defense: null };
    this.reqs = { attack: null, defense: null };
    this.render();
    await this._requestPick("attack", this._attacker);
    await this._requestPick("defense", this._defender);
  }

  async _requestPick(role, actor) {
    const max = actor.system.abilities.source ?? 0;
    const prompt = `${actor.name} — ${role === "attack" ? "공격" : "방어"} 다이스`;
    const owner = this._ownerUser(actor);
    if (owner) {
      const reqId = foundry.utils.randomID();
      this.reqs[role] = reqId;
      requestPick({ reqId, userId: owner.id, actorId: actor.id, role, max, prompt });
    } else {
      this.reqs[role] = "local";
      new BattleDiceDialog({
        mode: role,
        max,
        prompt,
        onSubmit: (dice) => this._setPick(role, dice),
      }).render(true);
    }
  }

  _receivePick(msg) {
    for (const role of ["attack", "defense"]) {
      if (this.reqs[role] && this.reqs[role] === msg.reqId) {
        this._setPick(role, msg.dice);
        return;
      }
    }
  }

  _setPick(role, dice) {
    this.picks[role] = Array.isArray(dice) ? dice : [];
    this.render();
  }

  static #onRequestPick(_event, target) {
    const role = target.dataset.role;
    this._requestPick(role, role === "attack" ? this._attacker : this._defender);
  }

  static async #onReveal() {
    if (this.picks.attack === null || this.picks.defense === null) return;
    const attacker = this._attacker;
    const defender = this._defender;
    await postBattleCard(attacker, defender, {
      round: this.round,
      exchange: this.exchange,
      attack: this.picks.attack,
      defense: this.picks.defense,
    });
    this.lastResult = resolveExchange(this.picks.attack, this.picks.defense);
    this.lastRoles = { attackerId: attacker.id, defenderId: defender.id };
    this.revealed = true;
    this.render();
  }

  static async #onNextExchange() {
    if (this.exchange === 1) {
      await this._beginExchange(2);
    } else {
      this.round += 1;
      await this._beginExchange(1);
    }
  }

  static async #onEnd() {
    this._reset();
    this.render();
  }
}
```

- [ ] **Step 2: 템플릿 생성**

`templates/apps/magic-battle-panel.hbs`:

```hbs
<div class="mg-mbp">
  {{#unless started}}
  <label class="mg-mbp__field">
    <span>선공</span>
    <select name="first">
      <option value="">—</option>
      {{#each actors}}<option value="{{id}}" {{selected (eq id ../firstId)}}>{{name}}</option>{{/each}}
    </select>
  </label>
  <label class="mg-mbp__field">
    <span>후공</span>
    <select name="second">
      <option value="">—</option>
      {{#each actors}}<option value="{{id}}" {{selected (eq id ../secondId)}}>{{name}}</option>{{/each}}
    </select>
  </label>
  <button type="button" class="mg-mbp__btn mg-mbp__btn--go" data-action="start">개시</button>
  {{else}}
  <div class="mg-mbp__round">{{round}}라운드 · 교전{{exchange}}</div>
  <div class="mg-mbp__roles">공격 <b>{{attacker}}</b> · 방어 <b>{{defender}}</b></div>
  <div class="mg-mbp__chips">
    <span class="mg-mbp__chip {{#if attackReady}}is-done{{/if}}">공격 {{#if attackReady}}제출✓{{else}}대기…{{/if}}{{#unless attackReady}}<button type="button" data-action="requestPick" data-role="attack">재요청</button>{{/unless}}</span>
    <span class="mg-mbp__chip {{#if defenseReady}}is-done{{/if}}">방어 {{#if defenseReady}}제출✓{{else}}대기…{{/if}}{{#unless defenseReady}}<button type="button" data-action="requestPick" data-role="defense">재요청</button>{{/unless}}</span>
  </div>
  {{#unless revealed}}
  <button type="button" class="mg-mbp__btn mg-mbp__btn--go" data-action="reveal" {{#unless bothReady}}disabled{{/unless}}>공개</button>
  {{else}}
  <div class="mg-mbp__after">
    <button type="button" class="mg-mbp__btn" data-action="nextExchange">{{#if (eq exchange 1)}}다음 교전{{else}}다음 라운드{{/if}}</button>
  </div>
  {{/unless}}
  <button type="button" class="mg-mbp__btn mg-mbp__btn--end" data-action="end">종료</button>
  {{/unless}}
</div>
```

> `eq`/`selected` 헬퍼는 이미 등록됨(`module/helpers/templates.mjs`).

- [ ] **Step 3: loadTemplates 등록**

`module/helpers/templates.mjs`의 `battle-dice-dialog.hbs` 줄 다음에 추가:

```js
    "systems/magicalogia/templates/apps/magic-battle-panel.hbs",
```

- [ ] **Step 4: 씬 컨트롤 버튼 등록**

`module/magicalogia.mjs` import 블록에 추가:

```js
import { MagicBattlePanel } from "./apps/magic-battle-panel.mjs";
```

`Hooks.once("ready", registerBattleSocket);` 다음에 추가:

```js
// 씬 컨트롤 GM 전용 마법전 버튼. V13: controls/tools는 객체(Record).
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;
  const tokens = controls.tokens ?? controls.token;
  if (!tokens?.tools) return;
  tokens.tools.magicBattle = {
    name: "magicBattle",
    title: "마법전",
    icon: "fa-solid fa-dice-d6",
    button: true,
    order: 90,
    onChange: () => new MagicBattlePanel().render(true),
  };
});
```

> **버전 주의**: 씬 컨트롤 구조는 Foundry 버전 민감. F5에서 버튼 미표시/미동작 시: (a) `controls` 인자가 배열이면 `controls.find(c => c.name==="tokens").tools.push({...})`, (b) 버튼 콜백이 `onClick`인 빌드면 `onChange`→`onClick`로 교체. 설치된 V13 API로 검증.

- [ ] **Step 5: 빌드 확인 (Task 9 소켓 포함)**

Run: `npm run build`
Expected: 성공(이제 `magic-battle-panel.mjs` 존재 → `battle-socket.mjs` import 해소).

- [ ] **Step 6: F5 육안 (서버 재시작 후)**

- 씬 좌측 컨트롤에 **마법전** 버튼(GM만). 클릭 → 패널.
- **NPC vs NPC**(소유 PL 없는 액터 2개): 개시 → 공격/방어 로컬 다이얼로그 순차 → 각각 선택 확정 → 패널 제출 칩 ✓ → **공개** → 채팅 전투 카드(상쇄·대미지)·적용 버튼 → **다음 교전**(역할 교대) 반복 → 교전2 후 **다음 라운드**.
- **PC 참가**(소유 PL 접속): 해당 측 다이얼로그가 **그 PL 화면**에 자동 팝업 → 제출 → GM 패널 칩 ✓ → 공개.
- 0개 선택(전부 통과/풀 대미지), 중복 눈, 다이얼로그 취소 후 **재요청** 버튼.
- 종료 → 초기 셋업 화면.

- [ ] **Step 7: 커밋**

```bash
git add module/apps/magic-battle-panel.mjs templates/apps/magic-battle-panel.hbs module/helpers/templates.mjs module/magicalogia.mjs
git commit -m "feat: add GM magic battle panel with scene control and socket orchestration"
```

---

## Task 11: 부스트 흐름 (패널/다이얼로그/소켓 통합)

**Files:**

- Modify: `module/apps/magic-battle-panel.mjs` (부스트 액션·메서드)
- Modify: `templates/apps/magic-battle-panel.hbs` (부스트 버튼 — 공개 후)

**Interfaces:**

- Consumes: `postBoostCard`(Task 7), `requestBoost`(Task 9), `lastResult`/`lastRoles`(Task 10)
- Produces: 공개 후 공격/방어 부스트 → nD6 굴림 → `struck`(상대 잔여 1:1) 계산 → 부스트 카드 발행(표시 전용). `MagicBattlePanel.deliverBoost` 동작.

- [ ] **Step 1: 패널 import·액션 확장**

`module/apps/magic-battle-panel.mjs` 상단 import 수정(`postBattleCard` 줄을 교체):

```js
import { resolveExchange, postBattleCard, postBoostCard } from "../system/magic-battle.mjs";
```

`requestPick` import 줄을 교체:

```js
import { requestPick, requestBoost } from "../system/battle-socket.mjs";
```

`static DEFAULT_OPTIONS`의 `actions`에 `boost` 추가(`end` 앞):

```js
      boost: MagicBattlePanel.#onBoost,
```

- [ ] **Step 2: 부스트 메서드 추가**

`module/apps/magic-battle-panel.mjs`의 `static async #onEnd()` **앞**에 추가:

```js
  static async #onBoost(_event, target) {
    if (!this.lastResult || !this.lastRoles) return;
    const side = target.dataset.side; // "attack" | "defense"
    // 상대 잔여: 공격측 부스트→방어 leftover, 방어측 부스트→공격 surviving
    const struck =
      side === "attack"
        ? this.lastResult.defenseMarks.filter((m) => m.st === "leftover").map((m) => m.v)
        : [...this.lastResult.surviving];
    const actorId = side === "attack" ? this.lastRoles.attackerId : this.lastRoles.defenderId;
    const actor = game.actors.get(actorId);
    if (!actor) return;
    const owner = this._ownerUser(actor);
    if (owner) {
      const reqId = foundry.utils.randomID();
      this._boostCtx = { reqId, actorId, struck };
      requestBoost({
        reqId,
        userId: owner.id,
        side,
        max: actor.system.abilities.source ?? 0,
        prompt: `${actor.name} 부스트`,
      });
    } else {
      new BattleDiceDialog({
        mode: "boost",
        max: actor.system.abilities.source ?? 0,
        prompt: `${actor.name} 부스트`,
        onSubmit: async (dice, n) => {
          await postBoostCard(actor, { n: n ?? dice.length, dice, struck });
        },
      }).render(true);
    }
  }

  async _receiveBoost(msg) {
    const ctx = this._boostCtx;
    if (!ctx || ctx.reqId !== msg.reqId) return;
    const actor = game.actors.get(ctx.actorId);
    if (actor) await postBoostCard(actor, { n: msg.n, dice: msg.dice, struck: ctx.struck });
    this._boostCtx = null;
  }
```

- [ ] **Step 3: 템플릿에 부스트 버튼 추가**

`templates/apps/magic-battle-panel.hbs`의 `revealed` 블록 — `mg-mbp__after` div **다음**, `종료` 버튼 앞에 추가:

```hbs
<div class="mg-mbp__boostbar">
  <button type="button" data-action="boost" data-side="attack">공격 부스트</button>
  <button type="button" data-action="boost" data-side="defense">방어 부스트</button>
</div>
```

(즉 `{{else}} ... {{/unless}}` 의 `else`(revealed) 분기 안, `mg-mbp__after` 다음.)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 5: F5 육안 (서버 재시작 후)**

- 교전 공개 후 패널에 **공격 부스트 / 방어 부스트** 버튼 노출.
- **방어 부스트**(NPC): boost 다이얼로그 → nD6 → 부스트 카드 발행. 굴린 눈 중 **공격 유효 다이스(surviving)**와 같은 값은 `cancel`(상쇄)·나머지 `valid`. 합계 없음.
- **공격 부스트**(NPC): 굴린 눈 중 **방어 leftover**와 같은 값은 `cancel`·나머지 `valid`.
- **PC 부스트**: 해당 PL 화면에 boost 다이얼로그 자동 팝업 → 굴림 → GM이 부스트 카드 발행.
- 부스트는 **표시 전용**(대미지 자동 재계산/적용 없음 — 기존 적용 버튼은 공개 카드 그대로).

- [ ] **Step 6: 커밋**

```bash
git add module/apps/magic-battle-panel.mjs templates/apps/magic-battle-panel.hbs
git commit -m "feat: add boost flow to magic battle"
```

---

## Self-Review (작성자 점검 결과)

**1. Spec coverage**

| 스펙 요구                                     | 태스크                                    |
| --------------------------------------------- | ----------------------------------------- |
| 1:1 비대칭 상쇄·대미지                        | T1 `resolveExchange`                      |
| pip 다이스 markup                             | T2 `renderBattleDie`                      |
| 전투/부스트 카드 데이터                       | T3 `buildBattleCard`, T4 `buildBoostCard` |
| 전투 카드 + SCSS(라이트)                      | T5                                        |
| 부스트 카드                                   | T6                                        |
| 발행·대미지 적용(멱등)·채팅 훅                | T7                                        |
| 다이스 선택 다이얼로그(공격/방어/부스트)      | T8                                        |
| 소켓 요청/응답(PC)                            | T9                                        |
| GM 패널·씬버튼·라운드(2교전)·NPC 로컬+PC 소켓 | T10                                       |
| 부스트(소유자/PC 소켓·struck·표시 전용)       | T11                                       |
| 근원력=abilities.source, 생명력 차감          | T1/T10/T7                                 |
| 엣지(0개·중복·미접속 폴백·취소 재요청·멱등)   | T1 테스트 + T7/T10 F5                     |

누락 없음.

**2. Placeholder scan**: "TBD/TODO/대충" 없음. 모든 코드 스텝에 실제 코드. F5 스텝은 구체 콘솔 스니펫·확인 항목 포함.

**3. Type consistency**:

- `resolveExchange` 반환 `{attackMarks, defenseMarks, surviving, damage}` — T3/T10/T11에서 동일 키 사용(`surviving`, `defenseMarks[].st==="leftover"`).
- `renderBattleDie(v, st)` st ∈ `valid|cancel|leftover` — T2 정의, T3 사용 일치.
- `postBattleCard(attacker, defender, {round,exchange,attack,defense})` — T7 정의, T10 호출 일치.
- `buildBoostCard({who,n,dice,struck})` / `postBoostCard(actor,{n,dice,struck})` — T4/T7 정의, T11 호출 일치.
- 소켓 `requestPick/requestBoost/sendPickResult/sendBoostResult/deliverPick/deliverBoost` — T9 정의, T10/T11 사용 일치.
- 패널 `_active`/`deliverPick`/`deliverBoost`/`_receivePick`/`_receiveBoost` — T10/T11 일치(`deliverBoost`는 T10에서 옵셔널 체이닝 `_receiveBoost?.`로 안전, T11에서 실제 구현).

이상 없음.

## Execution Handoff

(plan 저장 후 실행 방식 선택을 사용자에게 제시.)
