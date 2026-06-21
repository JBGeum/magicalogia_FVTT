# 장서(주문) 시전 채팅 카드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 그리모어(장서) 행에서 시전하면 `.mg-card` 통일 양식의 시전 채팅 카드를 출력하고, 지정특기 명중 판정 TN을 마법표와 하이브리드 링크(차트 라이브 TN, 폴백 수동값)한다.

**Architecture:** 데이터 모델은 spell에 `tn` 폴백 필드 1개만 추가. 시전은 순수 함수(`findSpecialtyCoord`/`resolveSpecialtyTn`)로 TN을 해석한 뒤 `computeTable`·`classifyRoll`·`renderDie`(기존 판정 카드 인프라)를 재사용해 `chat/spell-card.hbs`를 렌더, `ChatMessage`로 출력한다. 카드 판정 블록은 기존 판정 카드 마크업/CSS를 그대로 재사용하고 장서 전용 블록(`.mg-spell-*`/`.mg-cardrule`/`.mg-damage`)만 신규.

**Tech Stack:** Foundry VTT V13 ApplicationV2, Handlebars, SCSS(sass), Vite, Vitest. 순수 로직은 Foundry 비의존으로 단위 테스트.

## Global Constraints

- **데이터 모델**: spell에 `tn`(수동 폴백 목표값) **한 필드만** 추가. 다른 필드/모델 변경 없음.
- **새 색 토큰은 다크+라이트 양쪽 정의**: `--mg-good`/`--mg-good-bg`/`--mg-good-line`를 `scss/theme/_tokens.scss`의 다크·라이트 블록 **양쪽**에 추가(`theme-tokens.test.mjs`는 다크 토큰이 라이트에 모두 있는지 검증). 그 외 새 `--mg-*` 토큰 없음 — 새 규칙은 기존 토큰만 사용.
- **판정 블록은 기존 판정 카드(`templates/chat/specialty-roll.hbs`)와 동일 마크업·클래스 재사용**: `.mg-roll-title`/`.mg-roll-dice`/`.mg-roll-eq`/`.mg-roll-sum`/`.mg-roll-detail`/`.mg-outcome`(✦/✕, 스페셜!/펌블!, "✦ 더블릿")/`.mg-note`(✦). 디자인 CSS의 `.mg-die-wrap`/`.mg-die-num`/`.mg-roll-op`/`.mg-roll-label` 변형은 이식하지 않는다.
- **카드 테마**: 라이트 고정(`class="magicalogia theme-light"`).
- **partial/템플릿 참조는 따옴표 전체 경로**; 채팅 템플릿은 `loadTemplates` 프리로드 등록(미등록 시 런타임 미발견).
- **데이터 경로 유지**: 현재 모델 경로 사용(`actor.system.skills`/`domain`/`horizontalWrap`, `spell.system.skill`/`tn`/`type`/`target`/`cost`/`effect`).
- **커밋 메시지**: 영어 한 줄 conventional, co-author 없음. lint-staged(prettier)가 커밋 시 자동 정렬(정상).
- **검증**: `npm run build`(SCSS 컴파일) + `npm test`(현재 56 + 신규 통과).

---

### Task 1: 차트 특기명 조회 헬퍼

**Files:**

- Modify: `module/system/specialty-table.mjs` (헬퍼 2개 추가)
- Test: `test/specialty-table.test.mjs` (describe 블록 추가)

**Interfaces:**

- Produces: `findSpecialtyCoord(name) → {col, row} | null`, `SPECIALTY_NAMES: string[]`(차트 66특기 평면). Task 3(datalist)·Task 5(TN 해석)가 사용.

- [ ] **Step 1: 실패 테스트 작성**

`test/specialty-table.test.mjs`의 import 줄을 교체하고(헬퍼 추가), 파일 끝에 describe 블록 추가.

import 줄 교체:

```js
import { computeTable } from "../module/system/specialty-table.mjs";
```

→

```js
import {
  computeTable,
  findSpecialtyCoord,
  SPECIALTY_NAMES,
} from "../module/system/specialty-table.mjs";
```

파일 끝에 추가:

```js
describe("findSpecialtyCoord 차트 역매핑", () => {
  it("차트 66특기명은 모두 고유하다", () => {
    expect(SPECIALTY_NAMES.length).toBe(66);
    expect(new Set(SPECIALTY_NAMES).size).toBe(66);
  });
  it("이름을 좌표로 매핑한다 (이야기 → song/0)", () => {
    expect(findSpecialtyCoord("이야기")).toEqual({ col: "song", row: 0 });
  });
  it("마지막 어둠 특기 (죽음 → dark/10)", () => {
    expect(findSpecialtyCoord("죽음")).toEqual({ col: "dark", row: 10 });
  });
  it("차트에 없는 이름은 null", () => {
    expect(findSpecialtyCoord("없는특기")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/specialty-table.test.mjs`
Expected: FAIL — `findSpecialtyCoord`/`SPECIALTY_NAMES` is not exported (undefined).

- [ ] **Step 3: 헬퍼 구현**

`module/system/specialty-table.mjs` 파일 끝(`computeTable` 함수 닫는 `}` 다음)에 추가:

```js
// 차트 특기명 → 좌표 역매핑. 66 이름은 모두 고유(specialty-table.test가 가드).
const SPECIALTY_INDEX = (() => {
  const idx = {};
  for (const a of MAGICALOGIA.attributes) {
    MAGICALOGIA.chart[a.key].forEach((name, row) => {
      idx[name] = { col: a.key, row };
    });
  }
  return idx;
})();

/** 차트 특기명 → {col,row}(없으면 null). */
export function findSpecialtyCoord(name) {
  return SPECIALTY_INDEX[name] ?? null;
}

/** 차트 전체 특기명 평면 배열(시트 datalist용). */
export const SPECIALTY_NAMES = MAGICALOGIA.attributes.flatMap((a) => MAGICALOGIA.chart[a.key]);
```

(`MAGICALOGIA`는 이 파일 상단에서 이미 import 됨.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/specialty-table.test.mjs`
Expected: PASS (기존 + 신규 4개).

- [ ] **Step 5: 커밋**

```bash
git add module/system/specialty-table.mjs test/specialty-table.test.mjs
git commit -m "feat: add chart specialty name lookup helpers"
```

---

### Task 2: `formatCost` 헬퍼 추출 + actor-sheet 적용

**Files:**

- Modify: `module/helpers/config.mjs` (`formatCost` export 추가)
- Modify: `module/sheets/actor-sheet.mjs` (인라인 costLabel → `formatCost`)
- Test: `test/format-cost.test.mjs` (신규)

**Interfaces:**

- Produces: `formatCost(cost) → string`(`cost`=`{area, count}`). Task 5(castSpell)가 사용.

- [ ] **Step 1: 실패 테스트 작성**

`test/format-cost.test.mjs` 신규:

```js
import { describe, it, expect } from "vitest";
import { formatCost } from "../module/helpers/config.mjs";

describe("formatCost", () => {
  it("area 미선택이면 —", () => {
    expect(formatCost({ area: "", count: 0 })).toBe("—");
  });
  it("area+count → 별×2", () => {
    expect(formatCost({ area: "star", count: 2 })).toBe("별×2");
  });
  it("count 0이면 라벨만 (노래)", () => {
    expect(formatCost({ area: "song", count: 0 })).toBe("노래");
  });
  it("none → 없음", () => {
    expect(formatCost({ area: "none", count: 0 })).toBe("없음");
  });
  it("cost가 undefined면 —", () => {
    expect(formatCost(undefined)).toBe("—");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/format-cost.test.mjs`
Expected: FAIL — `formatCost` is not a function (미export).

- [ ] **Step 3: `formatCost` 구현**

`module/helpers/config.mjs` 파일 끝에 추가:

```js
// 코스트 표시 라벨: {area,count} → "별×2" / "노래" / "—".
const COST_AREA_LABELS = Object.fromEntries(MAGICALOGIA.COST_AREAS.map((a) => [a.value, a.label]));

/** 장서 코스트를 표시 문자열로. area 미선택이면 "—". */
export function formatCost(cost) {
  const area = cost?.area ?? "";
  if (!area) return "—";
  const label = COST_AREA_LABELS[area] ?? area;
  const count = cost?.count ?? 0;
  return count ? `${label}×${count}` : label;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/format-cost.test.mjs`
Expected: PASS (5개).

- [ ] **Step 5: actor-sheet에서 사용(DRY)**

`module/sheets/actor-sheet.mjs` 상단 import에 추가(`applyTheme` import 줄 다음):

```js
import { formatCost } from "../helpers/config.mjs";
```

`_prepareContext`의 장서 블록을 교체. 현재:

```js
// 장서 — spell 아이템 + 충전 슬롯(rings)/코스트 라벨 표시 데이터.
const costAreaLabels = Object.fromEntries(
  CONFIG.MAGICALOGIA.COST_AREAS.map((a) => [a.value, a.label]),
);
context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
context.spells = this.actor.itemTypes.spell.map((it) => {
  const area = it.system.cost?.area ?? "";
  const count = it.system.cost?.count ?? 0;
  return {
    id: it.id,
    name: it.name,
    system: it.system,
    costLabel: area ? `${costAreaLabels[area] ?? area}${count ? "×" + count : ""}` : "—",
    rings: Array.from({ length: CHARGE_SLOTS }, (_, r) => ({
      n: r + 1,
      on: r + 1 <= (it.system.charge ?? 0),
    })),
  };
});
```

→

```js
// 장서 — spell 아이템 + 충전 슬롯(rings)/코스트 라벨 표시 데이터.
context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
context.spells = this.actor.itemTypes.spell.map((it) => {
  return {
    id: it.id,
    name: it.name,
    system: it.system,
    costLabel: formatCost(it.system.cost),
    rings: Array.from({ length: CHARGE_SLOTS }, (_, r) => ({
      n: r + 1,
      on: r + 1 <= (it.system.charge ?? 0),
    })),
  };
});
```

- [ ] **Step 6: 빌드·전체 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 전체 PASS(기존 56 + Task1 4 + Task2 5). 그리모어 코스트 라벨 동작 동일(회귀 없음).

- [ ] **Step 7: 커밋**

```bash
git add module/helpers/config.mjs module/sheets/actor-sheet.mjs test/format-cost.test.mjs
git commit -m "refactor: extract formatCost helper for cost labels"
```

---

### Task 3: spell `tn` 필드 + 시트(목표값 입력 · 차트 datalist)

**Files:**

- Modify: `module/data/items/spell.mjs` (`tn` 필드)
- Modify: `module/sheets/item-sheet.mjs` (spell 컨텍스트에 `specialtyNames`)
- Modify: `templates/item/spell-sheet.hbs` (목표값 입력 + datalist + skill `list`)
- Test: `test/spell-model.test.mjs` (tn 검증)

**Interfaces:**

- Consumes: `SPECIALTY_NAMES`(Task 1).
- Produces: `spell.system.tn`(number, 수동 폴백 TN). Task 5(castSpell)가 사용.

- [ ] **Step 1: 실패 테스트 작성**

`test/spell-model.test.mjs`의 "핵심 필드를 포함한다" 배열에 `"tn"` 추가하고, 새 it 추가. "핵심 필드" 배열을 교체:

```js
    for (const key of [
      "type",
      "skill",
      "target",
      "tn",
      "cost",
      "charge",
      "mod",
      "active",
      "recite",
      "effect",
    ]) {
```

그리고 `describe("SpellDataModel", …)` 안 마지막 it 다음에 추가:

```js
it("tn 기본값은 5다", async () => {
  const { SpellDataModel } = await import("../module/data/items/spell.mjs");
  const s = SpellDataModel.defineSchema();
  expect(s.tn.options.initial).toBe(5);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/spell-model.test.mjs`
Expected: FAIL — `s` 키에 `tn` 없음 / `s.tn` undefined.

- [ ] **Step 3: `tn` 필드 추가**

`module/data/items/spell.mjs`의 `target` 필드 줄 다음에 추가:

```js
      target: new fields.StringField({ initial: "" }),
      tn: new fields.NumberField({ initial: 5, min: 2, integer: true }),
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/spell-model.test.mjs`
Expected: PASS.

- [ ] **Step 5: item-sheet 컨텍스트에 specialtyNames 추가**

`module/sheets/item-sheet.mjs` 상단 import에 추가:

```js
import { SPECIALTY_NAMES } from "../system/specialty-table.mjs";
```

`_prepareContext`의 spell 분기를 교체. 현재:

```js
    if (this.item.type === "spell") {
      context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
      context.costAreas = CONFIG.MAGICALOGIA.COST_AREAS;
    } else if (this.item.type === "anchor") {
```

→

```js
    if (this.item.type === "spell") {
      context.spellTypes = CONFIG.MAGICALOGIA.spellTypes;
      context.costAreas = CONFIG.MAGICALOGIA.COST_AREAS;
      context.specialtyNames = SPECIALTY_NAMES;
    } else if (this.item.type === "anchor") {
```

- [ ] **Step 6: spell-sheet 템플릿 — 지정특기 datalist + 목표값 입력**

`templates/item/spell-sheet.hbs`의 지정특기 input에 `list` 추가. 현재:

```hbs
<div class="mg-ifield"><span class="mg-ifield__label">지정특기</span>
  <input
    class="mg-input"
    type="text"
    name="system.skill"
    value="{{system.skill}}"
    placeholder="—"
  />
</div>
```

→ (input에 `list="mg-specialties"` 추가하고, 바로 뒤에 목표값 필드 삽입)

```hbs
<div class="mg-ifield"><span class="mg-ifield__label">지정특기</span>
  <input
    class="mg-input"
    type="text"
    name="system.skill"
    value="{{system.skill}}"
    placeholder="—"
    list="mg-specialties"
  />
</div>
<div class="mg-ifield"><span class="mg-ifield__label">목표값</span>
  <input class="mg-input mg-num" type="number" name="system.tn" value="{{system.tn}}" min="2" />
</div>
```

그리고 `mg-iform` 닫는 `</div>`(서술 에디터 `mg-idiv` 직전) **앞**에 datalist 추가. 현재 effect textarea 블록 다음 구조:

```hbs
        <div class="mg-ifield mg-ifield--full" style="align-items: flex-start">
          <span class="mg-ifield__label" style="margin-top: 6px">효과</span>
          <textarea class="mg-area" name="system.effect" placeholder="마법 효과 ……">{{system.effect}}</textarea>
        </div>
      </div>
```

→

```hbs
        <div class="mg-ifield mg-ifield--full" style="align-items: flex-start">
          <span class="mg-ifield__label" style="margin-top: 6px">효과</span>
          <textarea class="mg-area" name="system.effect" placeholder="마법 효과 ……">{{system.effect}}</textarea>
        </div>
        <datalist id="mg-specialties">{{#each specialtyNames}}<option value="{{this}}"></option>{{/each}}</datalist>
      </div>
```

- [ ] **Step 7: 빌드·전체 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 전체 PASS.

- [ ] **Step 8: 커밋**

```bash
git add module/data/items/spell.mjs module/sheets/item-sheet.mjs templates/item/spell-sheet.hbs test/spell-model.test.mjs
git commit -m "feat: add spell tn field and chart specialty datalist"
```

---

### Task 4: 시전 카드 템플릿 + 스타일 + 토큰 + 프리로드

**Files:**

- Create: `templates/chat/spell-card.hbs`
- Modify: `scss/component/_chat-card.scss` (장서 전용 블록 추가)
- Modify: `scss/theme/_tokens.scss` (`--mg-good*` 다크+라이트)
- Modify: `module/helpers/templates.mjs` (프리로드 등록)

**Interfaces:**

- Consumes: 기존 `.mg-card`/`.mg-roll-*`/`.mg-outcome`/`.mg-note` 클래스. Task 5(castSpell)가 이 템플릿을 렌더(데이터 키: `who, name, type, skill, target, cost, effect, dieHtml, roll:{dice, target, sum, success, special, fumble, doublet, masoDomain}`; `damage`는 전달 안 함).

- [ ] **Step 1: 템플릿 생성**

`templates/chat/spell-card.hbs` 전체:

```hbs
<div class="magicalogia theme-light">
  <div class="mg-card">
    <div class="mg-card__head">
      <span class="mg-card__sigil"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M8 3.6C6.6 2.6 3.7 2.6 2.2 3.1v9.3c1.5-.5 4.4-.5 5.8.5 1.4-1 4.3-1 5.8-.5V3.1C12.3 2.6 9.4 2.6 8 3.6z"/><path d="M8 3.6v9.3"/></svg></span>
      <span class="mg-card__who">{{who}} · 장서 시전</span>
    </div>
    <div class="mg-card__body">

      <div class="mg-spell-head">
        <span class="mg-spell-name">{{#if nameRt}}<ruby>{{name}}<rt>{{nameRt}}</rt></ruby>{{else}}{{name}}{{/if}}</span>
        {{#if type}}<span class="mg-spell-type">{{type}}</span>{{/if}}
      </div>

      <dl class="mg-spell-info">
        <dt>지정특기</dt><dd>{{skill}}</dd>
        <dt>목표</dt><dd>{{target}}</dd>
        <dt>타입</dt><dd>{{type}}</dd>
        <dt>코스트</dt><dd><b>{{cost}}</b></dd>
      </dl>

      {{#if effect}}
      <div class="mg-spell-effect">
        <span class="mg-spell-effect__label">효과</span>
        <div class="mg-spell-effect__text">{{effect}}</div>
      </div>
      {{/if}}

      <div class="mg-cardrule"><span class="mg-cardrule__line"></span><span class="mg-cardrule__dot"></span><span class="mg-cardrule__line"></span></div>

      <div class="mg-roll-title">
        <span class="mg-roll-title__skill"><span class="dom">{{skill}}</span> 판정</span>
        <span class="mg-roll-title__target">목표 <b>{{roll.target}}</b></span>
      </div>
      <div class="mg-roll-dice">
        {{{dieHtml}}}
        <span class="mg-roll-eq">=</span>
        <span class="mg-roll-sum">{{roll.sum}}</span>
        <span class="mg-roll-detail">2D6 · {{roll.dice.[0]}} + {{roll.dice.[1]}}</span>
      </div>
      {{#if roll.success}}
        <div class="mg-outcome mg-outcome--success">
          <span class="mg-outcome__mark">✦</span>
          <span class="mg-outcome__text">{{#if roll.special}}스페셜!{{else}}성공{{/if}}</span>
          {{#if roll.doublet}}<span class="mg-outcome__tag">✦ 더블릿</span>{{/if}}
        </div>
      {{else}}
        <div class="mg-outcome mg-outcome--fail">
          <span class="mg-outcome__mark">✕</span>
          <span class="mg-outcome__text">{{#if roll.fumble}}펌블!{{else}}실패{{/if}}</span>
          {{#if roll.doublet}}<span class="mg-outcome__tag">✦ 더블릿</span>{{/if}}
        </div>
      {{/if}}
      {{#if roll.doublet}}
        <div class="mg-note"><span class="mg-note__icon">✦</span><span><b>{{roll.masoDomain}}</b>의 영역 마소가 발생합니다</span></div>
      {{/if}}

      {{!-- 대미지/회복: 디자인만. castSpell은 damage를 전달하지 않아 현재 미표시. --}}
      {{#if damage}}
      <div class="mg-damage mg-damage--{{#if (eq damage.kind '회복')}}heal{{else}}dmg{{/if}}" data-formula="{{damage.formula}}" data-kind="{{damage.kind}}">
        <span class="mg-damage__label">{{damage.kind}}</span>
        <span class="mg-damage__formula">{{damage.formula}}</span>
        <button type="button" class="mg-dmg-btn">⚄ {{damage.kind}} 굴림</button>
      </div>
      {{/if}}

    </div>
  </div>
</div>
```

- [ ] **Step 2: 토큰 추가 (`--mg-good*` 다크+라이트)**

`scss/theme/_tokens.scss` 다크 블록의 `--mg-bad-line: ...;` 줄 다음에 추가:

```scss
--mg-good: #86d6a3;
--mg-good-bg: #2f7d4e3d;
--mg-good-line: #5cae7f8c;
```

라이트 블록(`.magicalogia.theme-light`)의 `--mg-bad-line: ...;` 줄 다음에 추가:

```scss
--mg-good: #2f7d4e;
--mg-good-bg: #2f7d4e1f;
--mg-good-line: #2f7d4e7a;
```

- [ ] **Step 3: 장서 전용 SCSS 추가**

`scss/component/_chat-card.scss`의 최상위 `.magicalogia { … }` 블록 안, `.mg-note { … }` 규칙 닫는 `}` **다음**(바깥 `.magicalogia` 닫는 `}` 직전)에 추가:

```scss
// ---- 장서 시전 카드: 제목 ----
.mg-spell-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}
.mg-spell-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--mg-gold);
  line-height: 1.15;
  letter-spacing: 0.01em;

  rt {
    font-size: 9px;
    font-weight: 700;
    color: var(--mg-soft);
    letter-spacing: 0.04em;
  }
}
.mg-spell-type {
  flex: none;
  align-self: center;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--mg-head-ink);
  background: var(--mg-head-bg);
  border: 1px solid var(--mg-gold);
  border-radius: 999px;
  padding: 2px 11px;
}

// ---- 장서 정보 그리드 (지정특기·목표·타입·코스트) ----
.mg-spell-info {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  border: 1px solid var(--mg-line);
  border-radius: 4px;
  overflow: hidden;
  background: var(--mg-field);

  dt {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 800;
    color: var(--mg-head-ink);
    background: var(--mg-head-bg);
    padding: 5px 9px;
    white-space: nowrap;
    border-top: 1px solid var(--mg-line);
  }
  dd {
    display: flex;
    align-items: center;
    margin: 0;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--mg-ink);
    padding: 5px 10px;
    border-top: 1px solid var(--mg-line);
    border-right: 1px solid var(--mg-line);
  }
  dd:last-of-type {
    border-right: 0;
  }
  // 첫 행(4셀)은 상단 보더 제거
  > :nth-child(-n + 4) {
    border-top: 0;
  }
  dd b {
    color: var(--mg-gold);
    font-weight: 800;
    margin-right: 2px;
  }
}

// ---- 효과 박스 ----
.mg-spell-effect {
  background: var(--mg-field);
  border: 1px solid var(--mg-line);
  border-left: 3px solid var(--mg-gold);
  border-radius: 3px;
  padding: 7px 10px;

  &__label {
    display: block;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--mg-soft);
    margin-bottom: 3px;
  }
  &__text {
    font-size: 12px;
    line-height: 1.55;
    color: var(--mg-ink);
  }
}

// ---- 골드 구분선 ----
.mg-cardrule {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 1px 0;

  &__line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--mg-gold), transparent);
  }
  &__dot {
    flex: none;
    width: 7px;
    height: 7px;
    transform: rotate(45deg);
    background: var(--mg-gold);
  }
}

// ---- 대미지/회복 (디자인만 — castSpell 미전달이라 현재 미렌더) ----
.mg-damage {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: var(--mg-field);
  border: 1px solid var(--mg-line);
  border-radius: 4px;
  padding: 6px 10px;

  &__label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }
  &__formula {
    font-size: 11px;
    font-weight: 700;
    color: var(--mg-faint);
  }
  &__dice {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  &__sum {
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
  }
  &__detail {
    margin-left: auto;
    font-size: 11px;
    color: var(--mg-faint);
    font-weight: 600;
    white-space: nowrap;
  }

  &--dmg .mg-damage__label,
  &--dmg .mg-damage__sum {
    color: var(--mg-bad);
  }
  &--heal .mg-damage__label,
  &--heal .mg-damage__sum {
    color: var(--mg-good);
  }
}
.mg-dmg-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 800;
  color: var(--mg-head-ink);
  background: var(--mg-head-bg);
  border: 1px solid var(--mg-gold);
  border-radius: 4px;
  padding: 4px 13px;
  cursor: pointer;
  transition:
    filter 0.12s,
    transform 0.05s;

  &:hover {
    filter: brightness(1.07);
  }
  &:active {
    transform: translateY(1px);
  }
}
```

- [ ] **Step 4: 프리로드 등록**

`module/helpers/templates.mjs`의 `loadTemplates([...])` 배열에서 `specialty-roll.hbs` 줄 다음에 추가:

```js
    "systems/magicalogia/templates/chat/specialty-roll.hbs",
    "systems/magicalogia/templates/chat/spell-card.hbs",
  ]);
```

(끝 두 줄은 위치 식별용 — `spell-card.hbs` 한 줄만 신규.)

- [ ] **Step 5: 빌드·전체 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공(SCSS 컴파일 OK), 전체 PASS. `theme-tokens.test`가 `--mg-good*`(양쪽 정의)로 통과. `template-partials.test`가 신규 템플릿 partial 참조(없음)로 통과.

- [ ] **Step 6: 커밋**

```bash
git add templates/chat/spell-card.hbs scss/component/_chat-card.scss scss/theme/_tokens.scss module/helpers/templates.mjs
git commit -m "feat: add spell cast chat card template and styles"
```

---

### Task 5: `resolveSpecialtyTn` + `castSpell`

**Files:**

- Create: `module/system/spell-cast.mjs`
- Test: `test/spell-cast.test.mjs` (신규 — `resolveSpecialtyTn` 순수 검증)

**Interfaces:**

- Consumes: `computeTable`, `findSpecialtyCoord`(Task 1) from `specialty-table.mjs`; `renderDie`, `classifyRoll` from `specialty-roll.mjs`; `formatCost`(Task 2) from `config.mjs`; 템플릿(Task 4); `spell.system.tn`(Task 3).
- Produces: `resolveSpecialtyTn(table, skill, manualTn) → {tn:?number, linked:boolean}`, `castSpell(actor, itemId) → Promise<void>`. Task 6이 `castSpell` 호출.

- [ ] **Step 1: 실패 테스트 작성**

`test/spell-cast.test.mjs` 신규:

```js
import { describe, it, expect } from "vitest";
import { computeTable } from "../module/system/specialty-table.mjs";
import { resolveSpecialtyTn } from "../module/system/spell-cast.mjs";

// 특정 (열,인덱스)만 보유한 맵 생성
function own(pairs) {
  const o = {};
  for (const [key, idx] of pairs) {
    o[key] ??= Array(11).fill(false);
    o[key][idx] = true;
  }
  return o;
}

describe("resolveSpecialtyTn", () => {
  it("차트 링크 + 보유특기 있음 → 라이브 TN (이야기 자신 보유 → 5)", () => {
    const table = computeTable({ owned: own([["song", 0]]), domain: null, wrap: false });
    expect(resolveSpecialtyTn(table, "이야기", 9)).toEqual({ tn: 5, linked: true });
  });
  it("차트 링크지만 보유특기 없어 cell.tn null → 수동 폴백", () => {
    const table = computeTable({ owned: {}, domain: null, wrap: false });
    expect(resolveSpecialtyTn(table, "이야기", 9)).toEqual({ tn: 9, linked: true });
  });
  it("차트 미매칭 → 수동 폴백, linked false", () => {
    const table = computeTable({ owned: own([["song", 0]]), domain: null, wrap: false });
    expect(resolveSpecialtyTn(table, "커스텀특기", 8)).toEqual({ tn: 8, linked: false });
  });
  it("링크 TN도 수동값도 없으면 tn null", () => {
    const table = computeTable({ owned: {}, domain: null, wrap: false });
    expect(resolveSpecialtyTn(table, "커스텀특기", null)).toEqual({ tn: null, linked: false });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/spell-cast.test.mjs`
Expected: FAIL — `spell-cast.mjs` 없음(모듈 미존재).

- [ ] **Step 3: `spell-cast.mjs` 구현**

`module/system/spell-cast.mjs` 신규:

```js
import { computeTable, findSpecialtyCoord } from "./specialty-table.mjs";
import { renderDie, classifyRoll } from "./specialty-roll.mjs";
import { formatCost } from "../helpers/config.mjs";

/**
 * 지정특기 명중 판정 목표치(TN) 해석 (순수).
 * 차트 특기명이면 액터 표의 해당 셀 TN(라이브). 그 값이 null(도달 가능한 보유특기 없음)
 * 이거나 차트 미매칭이면 manualTn으로 폴백.
 *
 * @param {Array} table  computeTable 결과
 * @param {string} skill 지정특기 이름
 * @param {number} manualTn 수동 폴백 목표값
 * @returns {{tn:?number, linked:boolean}}
 */
export function resolveSpecialtyTn(table, skill, manualTn) {
  const coord = findSpecialtyCoord(skill);
  let tn = null;
  if (coord) {
    const col = table.find((c) => c.key === coord.col);
    tn = col?.cells?.[coord.row]?.tn ?? null;
  }
  if (tn == null) tn = Number.isFinite(manualTn) ? manualTn : null;
  return { tn, linked: coord != null };
}

/** 장서 시전 → .mg-card 시전 카드 출력. 라이트 고정. */
export async function castSpell(actor, itemId) {
  const spell = actor.items.get(itemId);
  if (!spell || spell.type !== "spell") return;
  const sys = spell.system;

  const table = computeTable({
    owned: actor.system.skills,
    domain: actor.system.domain || null,
    wrap: actor.system.horizontalWrap,
  });
  const { tn } = resolveSpecialtyTn(table, sys.skill, sys.tn);
  if (tn == null) {
    ui.notifications.warn("목표치를 계산할 수 없습니다.");
    return;
  }

  const roll = await new Roll("2d6").evaluate();
  const [d1, d2] = roll.dice[0].results.map((r) => r.result);
  const result = classifyRoll(d1, d2, tn);
  const dieHtml =
    renderDie(d1, result.doublet) +
    '<span class="mg-roll-eq">+</span>' +
    renderDie(d2, result.doublet);

  const speaker = ChatMessage.getSpeaker({ actor });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/spell-card.hbs",
    {
      who: speaker.alias,
      name: spell.name,
      type: sys.type,
      skill: sys.skill,
      target: sys.target,
      cost: formatCost(sys.cost),
      effect: sys.effect,
      dieHtml,
      roll: {
        dice: [d1, d2],
        target: tn,
        sum: result.total,
        success: result.success,
        special: result.special,
        fumble: result.fumble,
        doublet: result.doublet,
        masoDomain: result.doublet ? CONFIG.MAGICALOGIA.attributes[d1 - 1].title : null,
      },
    },
  );
  await ChatMessage.create({ speaker, content, rolls: [roll] });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/spell-cast.test.mjs`
Expected: PASS (4개). (`resolveSpecialtyTn`은 순수 — Foundry 전역 불필요. `castSpell` 본문은 호출 안 하므로 import만으로 안전.)

- [ ] **Step 5: 빌드·전체 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 전체 PASS.

- [ ] **Step 6: 커밋**

```bash
git add module/system/spell-cast.mjs test/spell-cast.test.mjs
git commit -m "feat: add castSpell with chart-linked tn resolution"
```

---

### Task 6: 그리모어 행 시전 트리거

**Files:**

- Modify: `templates/actor/parts/grimoire.hbs` (이름 앞 ✦ 시전 아이콘)
- Modify: `module/sheets/actor-sheet.mjs` (`cast-spell` 액션 등록 + 핸들러)
- Modify: `scss/component/_grimoire.scss` (`.mg-spell-cast` 스타일)

**Interfaces:**

- Consumes: `castSpell`(Task 5).

- [ ] **Step 1: 그리모어 행에 시전 아이콘 추가**

`templates/actor/parts/grimoire.hbs`의 col-name 셀. 현재:

```hbs
      <span class="col-name {{#unless this.name}}col-empty{{/unless}}">{{#if this.name}}{{this.name}}{{else}}—{{/if}}</span>
```

→

```hbs
      <span class="col-name {{#unless this.name}}col-empty{{/unless}}"><span class="mg-spell-cast" data-action="cast-spell" data-item-id="{{this.id}}" title="시전">✦</span>{{#if this.name}}{{this.name}}{{else}}—{{/if}}</span>
```

- [ ] **Step 2: actor-sheet 액션 등록 + 핸들러**

`module/sheets/actor-sheet.mjs` 상단 import에 추가(`rollSpecialty, rollSoulSkill` import 줄 다음):

```js
import { castSpell } from "../system/spell-cast.mjs";
```

`DEFAULT_OPTIONS.actions`에 `"toggle-accordion": …` 줄 다음(닫는 `},` 직전)에 추가:

```js
      "toggle-accordion": MagicalogiaActorSheet.#onToggleAccordion,
      "cast-spell": MagicalogiaActorSheet.#onCastSpell,
    },
```

`#onToggleAccordion` 정적 메서드 정의 다음에 핸들러 추가:

```js
  /** 그리모어 행 ✦ 클릭 → 장서 시전 카드 출력. */
  static async #onCastSpell(_event, target) {
    await castSpell(this.actor, target.dataset.itemId);
  }
```

- [ ] **Step 3: `.mg-spell-cast` 스타일**

`scss/component/_grimoire.scss`의 `.mg-ring { … }` 규칙 닫는 `}` **다음**(바깥 `.magicalogia` 닫는 `}` 직전)에 추가:

```scss
// 장서 행 시전 아이콘(✦) — col-name 앞
.mg-spell-cast {
  color: var(--mg-gold);
  cursor: pointer;
  margin-right: 5px;
  font-size: 11px;
  opacity: 0.85;

  &:hover {
    opacity: 1;
  }
}
```

- [ ] **Step 4: 빌드·전체 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 전체 PASS(기존 56 + Task1 4 + Task2 5 + Task3 1 + Task5 4 = 70).

- [ ] **Step 5: 커밋**

```bash
git add templates/actor/parts/grimoire.hbs module/sheets/actor-sheet.mjs scss/component/_grimoire.scss
git commit -m "feat: cast spells from grimoire row"
```

---

## 최종 육안 검증 (F5, 전체 완료 후)

1. 장서 아이템 시트: 지정특기 입력에 **차트 특기 자동완성**(예: "이야"→이야기), **목표값** 입력 노출.
2. 캐릭터 시트 그리모어 행 이름 앞 **✦** 클릭 → 채팅에 **시전 카드**:
   - 장서 이름·타입 태그, 지정특기/목표/타입/코스트 그리드, 효과 박스, 골드 구분선.
   - 명중 판정: d6 pip 2개 + 합계 + 성공/실패(스페셜!/펌블!), 더블릿이면 ✦ 태그 + 마소 알림.
   - **차트 링크 특기**(보유특기 도달 가능) → 목표치가 특기표 셀 값과 **동일**(라이브). 보유특기 없거나 커스텀 이름 → **목표값(수동)** 사용.
3. 대미지/회복 블록은 보이지 않음(디자인만, 미전달).
4. 다크/라이트 양쪽에서 카드 정상(카드는 라이트 고정이나 시트 토큰은 양쪽 정의 — `--mg-good*` 포함).

## Self-Review 결과(작성자 점검)

- **Spec 커버리지**: §5.1→T3, §5.2→T3, §5.3→T1(findSpecialtyCoord/SPECIALTY_NAMES)+T5(resolveSpecialtyTn), §5.4→T5(castSpell), §5.5→T4(템플릿), §5.6→T4(SCSS+토큰), §5.7→T2(formatCost), §5.8→T6(트리거), §5.9→T4(프리로드). 누락 없음.
- **Placeholder 스캔**: 모든 코드 블록 실제 내용. "TBD/적절히" 없음.
- **타입/이름 일관성**: `findSpecialtyCoord`/`SPECIALTY_NAMES`/`resolveSpecialtyTn({tn,linked})`/`formatCost(cost)`/`castSpell(actor,itemId)`/`spell.system.tn`/데이터 키(`who,name,type,skill,target,cost,effect,dieHtml,roll.*`)가 Task 간 일치. 판정 블록 클래스는 기존 `_chat-card.scss` 정의 재사용.
