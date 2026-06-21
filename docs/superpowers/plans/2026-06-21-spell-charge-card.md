# 장서 충전 변동 카드 + 마름모 슬롯 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 장서 충전 수(`system.charge`)가 바뀔 때마다 채팅에 컴팩트 변동 카드를 발행하고, 그리모어 충전 슬롯을 마름모로 통일한다.

**Architecture:** 기존 `spell-cast.mjs`(순수 + Foundry 의존 동거) 패턴을 미러. 순수 `buildChargeCard`는 단위 테스트, Foundry 의존 `postChargeCard`는 시트 핸들러(`#onSetCharge`)가 호출. 카드는 라이트 고정 템플릿, 슬롯 마름모는 순수 SCSS.

**Tech Stack:** Foundry VTT V13 (ApplicationV2), Handlebars, SCSS, vitest.

## Global Constraints

- 커밋 메시지: 영어 한 줄 conventional, **co-author 없음**. (lint-staged가 md/scss/hbs/mjs 자동 정렬 — 정상)
- 채팅 카드는 **라이트 고정**(루트 `class="magicalogia theme-light"`).
- 시안 토큰(`--mg-*`)·`.theme-*` 블록·폰트 `@import` **이식 금지** — 우리 `scss/theme/_tokens.scss` 재사용. 신규 색 토큰 **0**.
- 신규 템플릿은 `module/helpers/templates.mjs`의 `loadTemplates([...])`에 등록.
- partial 참조는 전체 경로(`{{> "systems/magicalogia/…"}}`) — 단, 이 카드는 partial include 없음(인라인 SVG).
- 순수 로직만 단위 테스트, Foundry 의존(`postChargeCard`/핸들러/렌더/SCSS)은 F5 육안.
- 모델 변경 없음(`charge` 필드 기존, `max:6`). max는 `CHARGE_SLOTS=6` 호출부 전달.

---

## File Structure

- `module/system/spell-charge.mjs` (신규) — 순수 `buildChargeCard` + Foundry `postChargeCard`. 충전 카드 로직 단일 책임.
- `test/spell-charge.test.mjs` (신규) — `buildChargeCard` 단위 테스트.
- `templates/chat/charge-card.hbs` (신규) — `.mg-cc` 컴팩트 카드 마크업(라이트 고정).
- `module/helpers/templates.mjs` (수정) — `loadTemplates`에 charge-card 등록.
- `module/sheets/actor-sheet.mjs` (수정) — `#onSetCharge`에서 before/after 캡처 + `postChargeCard` 호출, import 추가.
- `scss/component/_chat-card.scss` (수정) — `.mg-cc*` 규칙 추가(컨벤션상 모든 chat 카드 규칙 이 파일).
- `scss/component/_grimoire.scss` (수정) — `.mg-ring` 동그라미 → 마름모.

---

## Task 1: 순수 `buildChargeCard` + 단위 테스트

**Files:**

- Create: `module/system/spell-charge.mjs`
- Test: `test/spell-charge.test.mjs`

**Interfaces:**

- Consumes: 없음(순수 함수).
- Produces: `buildChargeCard({ who, name, max, before, after }) → { who, name, max, before, after, delta, up, deltaText, ready, spent }`. `delta = after - before`, `up = delta >= 0`, `deltaText = "▲ +N"|"▼ N"`, `ready = after >= max`, `spent = delta < 0`. Task 2의 `postChargeCard`가 사용.

- [ ] **Step 1: 실패 테스트 작성**

`test/spell-charge.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { buildChargeCard } from "../module/system/spell-charge.mjs";

describe("buildChargeCard", () => {
  it("증가: 2→4 → delta +2, up, ▲ +2, 미완료", () => {
    expect(
      buildChargeCard({ who: "이졸데", name: "조우", max: 6, before: 2, after: 4 }),
    ).toMatchObject({ delta: 2, up: true, deltaText: "▲ +2", ready: false, spent: false });
  });

  it("완료: 5→6(max 6) → ready, ▲ +1", () => {
    expect(
      buildChargeCard({ who: "이졸데", name: "폭렬", max: 6, before: 5, after: 6 }),
    ).toMatchObject({ delta: 1, up: true, deltaText: "▲ +1", ready: true, spent: false });
  });

  it("소비: 3→0 → delta -3, down, ▼ 3, spent", () => {
    expect(
      buildChargeCard({ who: "이졸데", name: "대마법", max: 6, before: 3, after: 0 }),
    ).toMatchObject({ delta: -3, up: false, deltaText: "▼ 3", ready: false, spent: true });
  });

  it("경계: after===max → ready true", () => {
    expect(buildChargeCard({ who: "x", name: "y", max: 6, before: 6, after: 6 }).ready).toBe(true);
  });

  it("who/name/max/before/after 패스스루", () => {
    expect(
      buildChargeCard({ who: "이졸데", name: "조우", max: 6, before: 2, after: 4 }),
    ).toMatchObject({ who: "이졸데", name: "조우", max: 6, before: 2, after: 4 });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/spell-charge.test.mjs`
Expected: FAIL — `Failed to resolve import "../module/system/spell-charge.mjs"` (파일 없음).

- [ ] **Step 3: 최소 구현**

`module/system/spell-charge.mjs`:

```js
/**
 * 장서 충전 변동 카드 — 충전 수(system.charge) 변동 시 채팅 발행.
 * 순수 buildChargeCard(테스트) + Foundry 의존 postChargeCard(F5 육안).
 */

/** 충전 변동 카드 템플릿 데이터(순수). */
export function buildChargeCard({ who, name, max, before, after }) {
  const delta = after - before;
  const up = delta >= 0;
  return {
    who,
    name,
    max,
    before,
    after,
    delta,
    up,
    deltaText: (up ? "▲ +" : "▼ ") + (up ? delta : Math.abs(delta)),
    ready: after >= max,
    spent: delta < 0,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/spell-charge.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add module/system/spell-charge.mjs test/spell-charge.test.mjs
git commit -m "feat: add buildChargeCard pure helper with tests"
```

---

## Task 2: 충전 카드 발행 배선 (템플릿 + 등록 + postChargeCard + 핸들러)

**Files:**

- Create: `templates/chat/charge-card.hbs`
- Modify: `module/system/spell-charge.mjs` (append `postChargeCard`)
- Modify: `module/helpers/templates.mjs` (loadTemplates 배열)
- Modify: `module/sheets/actor-sheet.mjs` (import + `#onSetCharge`)

**Interfaces:**

- Consumes: Task 1의 `buildChargeCard`.
- Produces: `postChargeCard(actor, spell, before, after, max) → Promise<void>` (채팅 카드 발행). `templates/chat/charge-card.hbs`는 `{who, name, before, after, max, ready, up, deltaText}`를 소비.

이 task는 Foundry 의존이라 신규 단위 테스트 없음. **검증 = 기존 `npm test` 전부 통과(특히 `template-partials.test.mjs`) + `npm run build` 통과** + F5 육안.

- [ ] **Step 1: 카드 템플릿 작성**

`templates/chat/charge-card.hbs`:

```hbs
{{!--
  장서 충전(차지) 변동 챗 카드 (컴팩트 · 라이트 고정).
  PC명 · 「장서」 · 충전 before→after / max · 증감 칩. 데이터: buildChargeCard()
--}}
<div class="magicalogia theme-light">
  <div class="mg-cc">
    <span class="mg-cc__sigil"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M8 3.6C6.6 2.6 3.7 2.6 2.2 3.1v9.3c1.5-.5 4.4-.5 5.8.5 1.4-1 4.3-1 5.8-.5V3.1C12.3 2.6 9.4 2.6 8 3.6z"/><path d="M8 3.6v9.3"/></svg></span>
    <span class="mg-cc__who">{{who}}</span>
    <span class="mg-cc__spell">{{name}}</span>
    <span class="mg-cc__charge">
      <span class="lbl">충전</span>
      <span class="mg-cc__n">{{before}}</span>
      <span class="mg-cc__arrow">→</span>
      <span class="mg-cc__n mg-cc__n--after">{{after}}</span>
      <span class="mg-cc__max">/ {{max}}</span>
    </span>
    {{#if ready}}<span class="mg-cc__ready">✦ 완료</span>{{/if}}
    <span class="mg-cc__delta mg-cc__delta--{{#if up}}up{{else}}down{{/if}}">{{deltaText}}</span>
  </div>
</div>
```

- [ ] **Step 2: loadTemplates 등록**

`module/helpers/templates.mjs` — `"systems/magicalogia/templates/chat/spell-card.hbs",` 다음 줄에 추가:

```js
    "systems/magicalogia/templates/chat/spell-card.hbs",
    "systems/magicalogia/templates/chat/charge-card.hbs",
```

- [ ] **Step 3: postChargeCard 추가**

`module/system/spell-charge.mjs` 파일 끝에 append:

```js
/** 충전 변동 카드 채팅 발행(Foundry 의존). 라이트 고정. */
export async function postChargeCard(actor, spell, before, after, max) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const data = buildChargeCard({ who: speaker.alias, name: spell.name, max, before, after });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/charge-card.hbs",
    data,
  );
  await ChatMessage.create({ speaker, content });
}
```

- [ ] **Step 4: import 추가**

`module/sheets/actor-sheet.mjs` line 3(`import { castSpell } …`) 다음 줄에 추가:

```js
import { castSpell } from "../system/spell-cast.mjs";
import { postChargeCard } from "../system/spell-charge.mjs";
```

- [ ] **Step 5: `#onSetCharge` 교체 + 슬롯 주석 갱신**

`module/sheets/actor-sheet.mjs` line 10 주석 `// 장서 충전 슬롯(동그라미) 개수. charge 0..CHARGE_SLOTS.` →

```js
// 장서 충전 슬롯(마름모) 개수. charge 0..CHARGE_SLOTS.
const CHARGE_SLOTS = 6;
```

`#onSetCharge` 메서드 전체 교체:

```js
  /** 장서 충전 슬롯 클릭 — 별점식 증감(현재 값과 같은 칸 클릭 시 -1). 변동 시 채팅 카드 발행. */
  static async #onSetCharge(_event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const ring = Number(target.dataset.ring);
    const before = item.system.charge ?? 0;
    const after = item.system.charge === ring ? ring - 1 : ring;
    if (after === before) return;
    await item.update({ "system.charge": after });
    await postChargeCard(this.actor, item, before, after, CHARGE_SLOTS);
  }
```

- [ ] **Step 6: 테스트 + 빌드 검증**

Run: `npm test`
Expected: PASS — 기존 + Task 1(5) 모두 통과(총 77). `template-partials.test.mjs`도 통과(신규 hbs는 partial include 없음).

Run: `npm run build`
Expected: 성공(에러 없음).

- [ ] **Step 7: 커밋**

```bash
git add module/system/spell-charge.mjs module/helpers/templates.mjs module/sheets/actor-sheet.mjs templates/chat/charge-card.hbs
git commit -m "feat: post charge-change chat card on grimoire slot change"
```

---

## Task 3: 충전 카드 스타일 + 마름모 슬롯 (SCSS)

**Files:**

- Modify: `scss/component/_chat-card.scss` (append `.mg-cc*`)
- Modify: `scss/component/_grimoire.scss` (`.mg-ring` 마름모)

**Interfaces:**

- Consumes: Task 2 템플릿의 `.mg-cc*` 클래스. 토큰 `--mg-paper/-gold/-ink/-soft/-faint/-good*/-bad*` (전부 기존 `_tokens.scss`).
- Produces: 시각 산출물(F5 검증). 후속 task 없음.

검증 = `npm run build` 통과 + F5 육안.

- [ ] **Step 1: `.mg-cc` 규칙 추가**

`scss/component/_chat-card.scss` 파일 끝에 append(별도 `.magicalogia` 블록 — SCSS 다중 블록 허용, 기존 닫는 괄호 건드리지 않음):

```scss
// =============================================================
//  Charge-change card (.mg-cc) — compact one-line, light-fixed
//  Source: docs/design/장서충전/styles/magicalogia-chargecard.css
//  Token blocks / font @import excluded (reuse _tokens.scss).
// =============================================================
.magicalogia {
  .mg-cc {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    background: var(--mg-paper);
    border: 1.5px solid var(--mg-gold);
    border-radius: 5px;
    padding: 7px 11px;
    color: var(--mg-ink);
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.16);
  }

  .mg-cc__sigil {
    flex: none;
    display: flex;
    align-items: center;
    color: var(--mg-gold);

    svg {
      width: 14px;
      height: 14px;
      display: block;
    }
  }

  .mg-cc__who {
    flex: none;
    font-size: 12.5px;
    font-weight: 800;
    color: var(--mg-ink);
    white-space: nowrap;
  }

  .mg-cc__spell {
    flex: none;
    font-size: 13px;
    font-weight: 800;
    color: var(--mg-gold);
    white-space: nowrap;

    &::before {
      content: "「";
    }
    &::after {
      content: "」";
    }
  }

  .mg-cc__charge {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: var(--mg-soft);
    white-space: nowrap;

    .lbl {
      color: var(--mg-faint);
      font-size: 11px;
      font-weight: 700;
    }
  }

  .mg-cc__n {
    font-size: 15px;
    font-weight: 800;
    color: var(--mg-soft);
    font-variant-numeric: tabular-nums;

    &--after {
      color: var(--mg-gold);
    }
  }

  .mg-cc__arrow {
    color: var(--mg-faint);
    font-weight: 800;
  }

  .mg-cc__max {
    color: var(--mg-faint);
    font-size: 11px;
    font-weight: 600;
  }

  .mg-cc__delta {
    flex: none;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    font-weight: 800;
    border-radius: 999px;
    padding: 2px 9px;
    border: 1px solid;
    white-space: nowrap;

    &--up {
      color: var(--mg-good);
      background: var(--mg-good-bg);
      border-color: var(--mg-good-line);
    }
    &--down {
      color: var(--mg-bad);
      background: var(--mg-bad-bg);
      border-color: var(--mg-bad-line);
    }
  }

  .mg-cc__ready {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 800;
    color: var(--mg-good);
    white-space: nowrap;
  }
}
```

- [ ] **Step 2: `.mg-ring` 마름모 전환**

`scss/component/_grimoire.scss` — 주석(line 118) `// 충전 슬롯(동그라미) — 클릭으로 충전수 증감` → `(마름모)`, 그리고 `.mg-ring` 블록 교체:

```scss
// 충전 슬롯(마름모) — 클릭으로 충전수 증감
.mg-rings {
  display: flex;
  gap: 3px;
  justify-content: center;
  align-items: center;
}
.mg-ring {
  width: 9px;
  height: 9px;
  border: 1.5px solid var(--mg-gold);
  transform: rotate(45deg);
  cursor: pointer;
  &.is-on {
    background: var(--mg-gold);
  }
}
```

(회전 사각형 = 마름모. 11→9px 축소로 회전 후 대각선(≈12.7px)이 행을 넘지 않게. 정렬·크기가 어색하면 F5에서 ±1px 미세조정.)

- [ ] **Step 3: 빌드 검증**

Run: `npm run build`
Expected: 성공(SCSS 컴파일 에러 없음). 산출 CSS에 `.mg-cc`·마름모 `.mg-ring` 반영.

- [ ] **Step 4: 커밋**

```bash
git add scss/component/_chat-card.scss scss/component/_grimoire.scss
git commit -m "feat: style charge card and switch charge slots to diamonds"
```

---

## 최종 검증 (전체 완료 후)

- [ ] `npm test` 전체 통과(기존 72 + 신규 5 = 77).
- [ ] `npm run build` 통과.
- [ ] **F5 육안**: ① 그리모어 슬롯 마름모 표시·`is-on` 채움·클릭 충전 동작, ② 슬롯 클릭(증가/완료/소비)마다 채팅에 `.mg-cc` 카드(전→후·증감 칩·✦완료) 라이트 출력, ③ 다크/라이트 시트 양쪽 슬롯 정상(카드는 라이트 고정).

## Self-Review (작성자 체크)

- **Spec coverage**: §4.1 `buildChargeCard`/`postChargeCard`→Task1/Task2, §4.2 `#onSetCharge`→Task2 Step5, §4.3 템플릿+등록→Task2 Step1·2, §4.4 `.mg-cc` SCSS→Task3 Step1, §4.5 `.mg-ring` 마름모→Task3 Step2. §6 테스트(증가/완료/소비/경계)→Task1 Step1. 누락 없음.
- **Placeholder scan**: TBD/TODO/"적절히 처리" 없음. 모든 코드 블록 완전.
- **Type consistency**: `buildChargeCard` 시그니처(Task1 Produces) = `postChargeCard` 호출부(Task2 Step3) = 테스트(Task1) 일치. `postChargeCard(actor, spell, before, after, max)`(Task2 Produces) = `#onSetCharge` 호출(Task2 Step5) 일치. 템플릿 변수(`who/name/before/after/max/ready/up/deltaText`) = `buildChargeCard` 반환 키 일치.
