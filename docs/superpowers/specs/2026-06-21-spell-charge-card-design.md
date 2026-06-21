# 설계 — 장서 충전 변동 카드 + 마름모 슬롯 (2026-06-21)

> 시안: `docs/design/장서충전/`(README·`example-charge.html`·`chat-charge-card.hbs`·`magicalogia-chargecard.css`·`chat-card-helpers.js`).
> 워크플로: brainstorming → **이 spec** → writing-plans → subagent-driven-development.

## 1. 목표

장서(주문)의 **충전 수(`system.charge`)가 바뀔 때마다** 채팅에 컴팩트 변동 카드(`.mg-cc`)를 발행한다. 함께 그리모어 충전 슬롯(`.mg-ring`)의 동그라미를 **마름모**로 바꿔 시각을 통일한다.

두 가지 변경(채팅 카드 + 마름모)은 모두 "장서 충전 UI"라는 한 관심사라 한 spec으로 묶는다.

## 2. 범위

### 포함

- `system.charge` 변경 시 `PC명 · 「장서」 · 충전 before→after / max · 증감 칩(+완료 표시)` 한 줄 카드를 채팅에 발행.
- **모든 변경마다 발행**(증가·소비·완료 전부). (사용자 결정)
- 그리모어 충전 슬롯 `.mg-ring` 동그라미 → 마름모(순수 SCSS).

### 제외 (YAGNI / 후속)

- 루비(`nameRt`): spell 모델에 읽기 필드 없음 → 카드는 **이름만**. (필요 시 필드 추가는 별도.)
- 가변 max: 모델 `charge`는 `max:6` 고정(`CHARGE_SLOTS=6`). 시안의 6/8 가변 max는 우리 모델에 해당 없음 → max=6.
- 훅 기반 발행(프로그래매틱 charge 변경 감지): 현재 유일한 변경 경로가 시트 슬롯 클릭뿐 → 불필요.
- 충전 칸(마름모) **카드 내부 렌더**: 시안도 충전 카드에는 슬롯을 표시하지 않음(컴팩트 한 줄).

## 3. 현재 상태 (탐색 결과)

- `module/data/items/spell.mjs`: `charge: NumberField({ initial:0, min:0, max:6 })`.
- `module/sheets/actor-sheet.mjs`:
  - `const CHARGE_SLOTS = 6;` — 충전 슬롯 개수(rings 표시·max).
  - `#onSetCharge(_event, target)`: 슬롯 클릭 핸들러. **별점식** — 현재 charge와 같은 칸 재클릭 시 `ring-1`, 아니면 `ring`. `await item.update({ "system.charge": charge })`.
  - getData에서 `rings = Array.from({length:CHARGE_SLOTS}, …{ on: r+1 <= charge })`.
- `templates/actor/parts/grimoire.hbs`: `.mg-rings > .mg-ring[data-action="set-charge"][data-ring]` ×6.
- `scss/component/_grimoire.scss` `.mg-ring`: `width/height:11px; border-radius:50%; border:1.5px solid var(--mg-gold); &.is-on{background:var(--mg-gold)}`.
- 기존 패턴 `module/system/spell-cast.mjs`: **순수**(`resolveSpecialtyTn`) + **Foundry 의존**(`castSpell`: `renderTemplate` + `ChatMessage.create`)을 한 모듈에 둠.
- 채팅 카드는 **라이트 고정**(메시지 content). `scss/component/_chat-card.scss`가 `.mg-card`(시전·판정) 규칙을 보유(별도 spell-card scss 없음).
- 색 토큰 `--mg-good*`/`--mg-bad*`/`--mg-paper`/`--mg-soft`/`--mg-faint`: `scss/theme/_tokens.scss`에 다크+라이트 **모두 존재** → 신규 토큰 0.

## 4. 설계 (접근법 A — 순수 빌더 + 얇은 시트 핸들러)

### 4.1 `module/system/spell-charge.mjs` (신규)

`spell-cast.mjs`와 동일하게 순수 + Foundry 의존 함수를 한 모듈에.

```js
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

- `spent`는 템플릿에서 직접 안 쓰지만(`up`으로 분기) 시안 헬퍼와 동일 형태 유지 + 테스트 명세 명확화를 위해 반환. (불필요하면 plan 단계에서 제거 가능.)
- `max`는 호출부(`CHARGE_SLOTS`) 전달 — 신규 공유 상수 도입 안 함(`#onSetCharge`가 이미 같은 파일에서 `CHARGE_SLOTS` 보유).

### 4.2 `module/sheets/actor-sheet.mjs` — `#onSetCharge` 수정

```js
static async #onSetCharge(_event, target) {
  const item = this.actor.items.get(target.dataset.itemId);
  if (!item) return;
  const ring = Number(target.dataset.ring);
  const before = item.system.charge ?? 0;
  const after = item.system.charge === ring ? ring - 1 : ring;
  if (after === before) return;            // 변동 없으면 업데이트·발행 모두 skip
  await item.update({ "system.charge": after });
  await postChargeCard(this.actor, item, before, after, CHARGE_SLOTS);
}
```

- `postChargeCard`를 상단에서 import.
- `after===before` 가드: 별점식 로직상 실제로는 매 클릭이 값을 바꾸지만(no-op 클릭 없음) 방어적으로 둔다.

### 4.3 `templates/chat/charge-card.hbs` (신규)

시안 `chat-charge-card.hbs` 이식. 루트 `class="magicalogia theme-light"`, 루비 분기 제거(이름만), 시질 SVG 인라인.

```hbs
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

- `helpers/templates.mjs`의 `loadTemplates([...])`에 `"systems/magicalogia/templates/chat/charge-card.hbs"` 추가(`template-partials.test.mjs` 차단 회피).

### 4.4 `scss/component/_chat-card.scss` — `.mg-cc` 규칙 추가

시안 `magicalogia-chargecard.css`의 `.mg-cc*` 규칙을 `.magicalogia` 중첩으로 이식. **토큰 블록(`.theme-light{--mg-*}`)·폰트 @import은 이식 금지**(우리 `_tokens.scss` 재사용). 신규 파일·신규 `@use` 없음(컨벤션상 chat 카드 규칙은 이 파일에 모음).

이식 대상 클래스: `.mg-cc`, `__sigil`, `__who`, `__spell`(+`::before`「·`::after`」), `__charge`, `.lbl`, `__n`, `__n--after`, `__arrow`, `__max`, `__delta`(+`--up`/`--down`), `__ready`. 사용 토큰: `--mg-paper`, `--mg-gold`, `--mg-ink`, `--mg-soft`, `--mg-faint`, `--mg-good`/`-bg`/`-line`, `--mg-bad`/`-bg`/`-line` — 전부 기존.

### 4.5 `scss/component/_grimoire.scss` — `.mg-ring` 마름모

```scss
.mg-ring {
  width: 9px; // 회전 후 대각선이 행 높이를 넘지 않게 축소(11→9 등, plan에서 확정)
  height: 9px;
  border-radius: 0;
  transform: rotate(45deg);
  border: 1.5px solid var(--mg-gold);
  cursor: pointer;
  &.is-on {
    background: var(--mg-gold);
  }
}
```

- 주석 `// 충전 슬롯(동그라미) …` → `(마름모)`로 갱신.
- 정확한 크기/정렬은 plan/육안에서 미세조정(대각선 ≈ 변×1.41 → 행 높이·`.mg-rings gap` 고려).

## 5. 데이터 흐름

```
슬롯 클릭 → #onSetCharge
  before = system.charge
  after  = (같은 칸? ring-1 : ring)
  after===before → return
  item.update(system.charge = after)
  postChargeCard(actor, item, before, after, CHARGE_SLOTS)
    buildChargeCard(...) → {delta, up, deltaText, ready, ...}   // 순수
    renderTemplate("chat/charge-card.hbs", data)
    ChatMessage.create({ speaker, content })                    // 라이트 고정 카드
```

## 6. 테스트

### 단위 (`test/spell-charge.test.mjs`, 신규) — `buildChargeCard` 순수

| 케이스 | 입력(before→after, max) | 기대                                                                         |
| ------ | ----------------------- | ---------------------------------------------------------------------------- |
| 증가   | 2→4, 6                  | delta 2, up=true, deltaText `▲ +2`, ready=false, spent=false                 |
| 완료   | 5→6, 6                  | ready=true, up=true, deltaText `▲ +1`                                        |
| 소비   | 3→0, 6                  | delta -3, up=false, deltaText `▼ 3`, spent=true, ready=false                 |
| 경계   | 6→6, 6                  | ready=true (after===max) — 핸들러는 이 입력을 가드하지만 함수 단독 동작 명세 |

### 육안 (F5) — Foundry 의존

- 슬롯 클릭(증가/완료/소비) → 채팅에 `.mg-cc` 카드(전→후·증감 칩·✦완료) 라이트로 출력.
- 그리모어 슬롯이 마름모로 표시·정렬·`is-on` 채움 정상, 클릭 충전 동작 유지.
- 다크/라이트 시트 양쪽에서 슬롯(마름모) 정상(채팅 카드는 라이트 고정).

## 7. 함정 / 참고 (핸드오프 §4 준수)

- 커밋: 영어 한 줄 conventional, **co-author 없음**. lint-staged가 md/scss/hbs/mjs 자동 정렬.
- 신규 템플릿 → `loadTemplates` 등록 필수(`template-partials.test.mjs` 가드).
- 시안 토큰(`--mg-*`/`.theme-*`)·폰트 @import 이식 금지 — 컴포넌트 규칙만.
- 모델 변경 없음(charge 필드 기존). 신규 색 토큰 없음.
- 순수 로직(`buildChargeCard`)만 단위 테스트, Foundry 의존(`postChargeCard`/핸들러/렌더/SCSS)은 F5 육안.

## 8. 변경 파일 요약

- 신규: `module/system/spell-charge.mjs`, `templates/chat/charge-card.hbs`, `test/spell-charge.test.mjs`
- 수정: `module/sheets/actor-sheet.mjs`(`#onSetCharge`+import), `module/helpers/templates.mjs`(loadTemplates), `scss/component/_chat-card.scss`(`.mg-cc`), `scss/component/_grimoire.scss`(`.mg-ring` 마름모)
