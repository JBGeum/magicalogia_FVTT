# 판정 채팅 카드 재디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 판정(2d6) 채팅 카드를 새 `.mg-card` 통일 양식(시질 헤더 + d6 pip 주사위 + 성공/실패 리본 + 마소 알림)으로 재작성하고, 더블릿 마소(눈→영역)를 추가한다.

**Architecture:** 데이터 모델 변경 없음. `_tokens.scss`에 실패색 토큰을 추가하고 `_chat-card.scss`를 신설(새 `magicalogia-chatcard.css`의 `.mg-card*` 이식). 순수 함수 `renderDie`(d6 pip)는 TDD로 작성하고, `specialty-roll.mjs`에 공통 `postRollCard`를 추출해 `rollSpecialty`(특기표)·`rollSoulSkill`(혼의특기)이 위임한다. 카드는 라이트 테마 고정.

**Tech Stack:** Foundry VTT V13(ChatMessage, Roll), Handlebars, SCSS(Vite), vitest.

## Global Constraints

- 데이터 모델 변경 금지. 판정 로직은 기존 `classifyRoll`(펌블/스페셜/더블릿) 재사용.
- 카드 테마 라이트 고정: 템플릿 루트 `class="magicalogia theme-light"`(데이터에 theme 안 넘김).
- 마소는 특기·혼의특기 둘 다 적용: 더블릿이면 `CONFIG.MAGICALOGIA.attributes[d1-1].title`(별·짐승·힘·노래·꿈·어둠, num 1-6 순서).
- 펌블·스페셜 명시: 성공/실패 리본 + 라벨(스페셜!/펌블!), 더블릿 칩 별도.
- 헤더는 시질 + 시전자만(시간·삭제는 Foundry 채팅 로그 제공 — 카드에서 제외).
- 토큰은 우리 `_tokens.scss` 재사용. 새 CSS의 토큰/theme 블록 이식 금지. 실패색 `--mg-bad`/`--mg-bad-bg`/`--mg-bad-line`만 추가(다크+라이트 양쪽 — theme-tokens 완전성 테스트 통과).
- 커밋 메시지: 영어 한 줄, co-author 없음. lint-staged(prettier/eslint) 자동 정렬 정상.
- 검증: 채팅 렌더 UI 단위테스트 인프라 없음 → Foundry 통합부는 `npm run build` + `npm test` 무회귀 + 육안. 단 `renderDie`는 순수 함수라 TDD 단위테스트(Task 2).

---

## File Structure

- **Modify** `scss/theme/_tokens.scss` — `--mg-bad*` 토큰(다크/라이트). (Task 1)
- **Create** `scss/component/_chat-card.scss` — `.mg-card*` 카드 스타일. **Modify** `scss/magicalogia.scss` — `@use` 추가. (Task 1)
- **Modify** `module/system/specialty-roll.mjs` — `renderDie`(Task 2), `postRollCard` + `rollSpecialty`/`rollSoulSkill` 위임(Task 3). **Modify** `test/specialty-roll.test.mjs` — renderDie 테스트(Task 2).
- **Rewrite** `templates/chat/specialty-roll.hbs` — 새 `.mg-card` 구조. (Task 3)

소스(시각·구조 기준, gitignore): `docs/design/06211223/styles/magicalogia-chatcard.css`, `docs/design/06211223/templates/chat-roll-card.hbs`, `docs/design/06211223/scripts/chat-card-helpers.js`.

---

## Task 1: 실패색 토큰 + 채팅 카드 SCSS

**Files:**

- Modify: `scss/theme/_tokens.scss`
- Create: `scss/component/_chat-card.scss`
- Modify: `scss/magicalogia.scss`

**Interfaces:**

- Consumes: `--mg-*` 토큰, `$mg-radius-sm`/`$mg-font-body`(`_vars.scss`).
- Produces: CSS 클래스 `.mg-card`/`__head`/`__sigil`/`__who`/`__body`, `.mg-roll-title`(+`__skill`/`.dom`/`__target`), `.mg-roll-dice`/`.mg-die`(`.is-match`)/`.mg-roll-eq`/`.mg-roll-sum`/`.mg-roll-detail`, `.mg-outcome`(`--success`/`--fail`/`__mark`/`__text`/`__tag`), `.mg-note`(`__icon`). 토큰 `--mg-bad`/`--mg-bad-bg`/`--mg-bad-line`. Task 3 템플릿이 사용.

- [ ] **Step 1: `_tokens.scss`에 실패색 토큰 추가**

`scss/theme/_tokens.scss`의 다크 블록(`.magicalogia { … }`) 안 끝(`--mg-head-ink` 부근)에 추가:

```scss
--mg-bad: #ef9393;
--mg-bad-bg: #9c3a4a3d;
--mg-bad-line: #c0566a8c;
```

라이트 블록(`.magicalogia.theme-light { … }`) 안 끝(`--mg-head-ink` 부근)에 추가:

```scss
--mg-bad: #a3343f;
--mg-bad-bg: #a3343f24;
--mg-bad-line: #a3343f7a;
```

- [ ] **Step 2: `_chat-card.scss` 신설 — 새 CSS 이식**

`scss/component/_chat-card.scss` 생성. 원칙(아이템 시트 SCSS와 동일):

1. 소스 = `docs/design/06211223/styles/magicalogia-chatcard.css`의 `.mg-card*` 컴포넌트 규칙(토큰/theme 블록 제외 — 우리 `_tokens.scss`가 제공).
2. 상단에 `@use "../theme/vars" as *;`.
3. 새 CSS의 `.magicalogia .mg-card …` 평면 선택자를 `.magicalogia { .mg-card { … } }` 중첩 SCSS로 재구성.
4. 색·수치·data-URI·그라데이션은 소스 그대로(모두 `--mg-*` 토큰 기반).
5. `.mg-card__time`/`.mg-card__del` 규칙은 이식하지 않는다(템플릿에서 제외).

`scss/magicalogia.scss`의 `@use "component/item-sheet";` 다음 줄에 추가:

```scss
@use "component/chat-card";
```

- [ ] **Step 3: 빌드·테스트 검증**

Run: `npm run build`
Expected: 성공, `.mg-card*`/`--mg-bad*` 컴파일.

Run: `npm test`
Expected: 무회귀 — theme-tokens 완전성 테스트가 `--mg-bad*`(다크) → 라이트 오버라이드 존재를 확인하고 통과. 전체 그린.

- [ ] **Step 4: 커밋**

```bash
git add scss/theme/_tokens.scss scss/component/_chat-card.scss scss/magicalogia.scss
git commit -m "style: add chat card styles and failure-color tokens"
```

---

## Task 2: renderDie (d6 pip, TDD)

**Files:**

- Modify: `module/system/specialty-roll.mjs` (renderDie + PIPS 추가)
- Modify: `test/specialty-roll.test.mjs` (renderDie 테스트 추가)

**Interfaces:**

- Consumes: 없음(순수 함수).
- Produces: `export function renderDie(value, match)` → d6 한 면의 pip 그리드 markup 문자열. 3×3 = 9칸(pip은 `<i></i>`, 빈칸은 `<span></span>`), `match`면 루트에 `is-match` 클래스. Task 3 `postRollCard`가 사용.

- [ ] **Step 1: renderDie 테스트 작성**

`test/specialty-roll.test.mjs` 상단 import를 확장하고 describe 추가:

```js
import { classifyRoll, renderDie } from "../module/system/specialty-roll.mjs";
```

파일 끝(마지막 `});` 뒤)에 추가:

```js
describe("renderDie", () => {
  const pips = (html) => (html.match(/<i><\/i>/g) || []).length;
  const cells = (html) => (html.match(/<i><\/i>|<span><\/span>/g) || []).length;

  it("1면은 pip 1개", () => {
    expect(pips(renderDie(1, false))).toBe(1);
  });
  it("6면은 pip 6개", () => {
    expect(pips(renderDie(6, false))).toBe(6);
  });
  it("항상 9칸(pip + 빈칸)을 출력", () => {
    expect(cells(renderDie(3, false))).toBe(9);
  });
  it("match=true면 is-match 클래스, false면 없음", () => {
    expect(renderDie(2, true)).toContain("is-match");
    expect(renderDie(2, false)).not.toContain("is-match");
  });
});
```

- [ ] **Step 2: 테스트 실행 → RED 확인**

Run: `npx vitest run test/specialty-roll.test.mjs`
Expected: FAIL — `renderDie` is not exported / not a function.

- [ ] **Step 3: renderDie 구현**

`module/system/specialty-roll.mjs`의 `classifyRoll` 함수 위(또는 파일 상단 import 다음)에 추가:

```js
// d6 pip 배치(0..8 = 3×3 셀 인덱스).
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** d6 한 면을 pip 그리드 markup으로. match=true면 골드 강조(더블릿). */
export function renderDie(value, match) {
  let cells = "";
  for (let i = 0; i < 9; i++) cells += PIPS[value].includes(i) ? "<i></i>" : "<span></span>";
  return `<span class="mg-die ${match ? "is-match" : ""}">${cells}</span>`;
}
```

- [ ] **Step 4: 테스트 실행 → GREEN 확인**

Run: `npx vitest run test/specialty-roll.test.mjs`
Expected: PASS (classifyRoll 6 + renderDie 4 모두 통과).

- [ ] **Step 5: 빌드 + 전체 테스트**

Run: `npm run build`
Expected: 성공.

Run: `npm test`
Expected: 전체 그린(무회귀).

- [ ] **Step 6: 커밋**

```bash
git add module/system/specialty-roll.mjs test/specialty-roll.test.mjs
git commit -m "feat: add renderDie d6 pip helper with tests"
```

---

## Task 3: postRollCard + 위임 + 템플릿 재작성

**Files:**

- Modify: `module/system/specialty-roll.mjs` (`postRollCard` 추가, `rollSpecialty`/`rollSoulSkill` 위임으로 재작성)
- Rewrite: `templates/chat/specialty-roll.hbs`

**Interfaces:**

- Consumes: Task 1의 `.mg-card*` 클래스, Task 2의 `renderDie`, 기존 `classifyRoll`/`computeTable`, `CONFIG.MAGICALOGIA.attributes`.
- Produces: `.mg-card` 라이트 카드(특기·혼의특기 공용).

- [ ] **Step 1: `postRollCard` 추가 + 위임 재작성**

`module/system/specialty-roll.mjs`에 공통 함수를 추가하고, 기존 `rollSpecialty`/`rollSoulSkill`을 위임으로 재작성한다.

공통 함수(파일에 추가):

```js
/** 2d6 판정 후 .mg-card 채팅 카드 출력(특기·혼의특기 공용). 라이트 테마 고정. */
async function postRollCard(actor, { domain, skill, tn }) {
  const roll = await new Roll("2d6").evaluate();
  const [d1, d2] = roll.dice[0].results.map((r) => r.result);
  const result = classifyRoll(d1, d2, tn);
  const dieHtml =
    renderDie(d1, result.doublet) +
    '<span class="mg-roll-eq">+</span>' +
    renderDie(d2, result.doublet);
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/specialty-roll.hbs",
    {
      who: ChatMessage.getSpeaker({ actor }).alias,
      domain,
      skill,
      target: tn,
      dice: [d1, d2],
      sum: result.total,
      success: result.success,
      special: result.special,
      fumble: result.fumble,
      doublet: result.doublet,
      masoDomain: result.doublet ? CONFIG.MAGICALOGIA.attributes[d1 - 1].title : null,
      dieHtml,
    },
  );
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll] });
}
```

`rollSpecialty`를 재작성(기존 cell/tn 가드 유지, 카드 출력만 위임):

```js
export async function rollSpecialty(actor, colKey, rowIndex) {
  const sys = actor.system;
  const table = computeTable({
    owned: sys.skills,
    domain: sys.domain || null,
    wrap: sys.horizontalWrap,
  });
  const column = table.find((c) => c.key === colKey);
  const cell = column?.cells?.[rowIndex];

  if (!cell) {
    ui.notifications.warn("이 특기로는 판정할 수 없습니다.");
    return;
  }
  if (cell.tn == null) {
    ui.notifications.warn("보유한 특기가 없어 목표치를 계산할 수 없습니다.");
    return;
  }

  await postRollCard(actor, { domain: column.title, skill: cell.name, tn: cell.tn });
}
```

`rollSoulSkill`을 재작성:

```js
/** 혼의 특기 2d6 판정 — 목표치 6 고정의 특수 특기로 간주. */
export async function rollSoulSkill(actor) {
  const skill = actor.system.soulSkill?.trim() || "혼의 특기";
  await postRollCard(actor, { domain: "혼의 특기", skill, tn: 6 });
}
```

(기존 `rollSpecialty`/`rollSoulSkill`의 옛 본문 — 인라인 Roll/renderTemplate/ChatMessage — 은 위 위임 버전으로 완전히 대체한다. `classifyRoll`·`renderDie`·`computeTable` import/정의는 유지.)

- [ ] **Step 2: 템플릿 재작성**

`templates/chat/specialty-roll.hbs` 전체 교체:

```hbs
<div class="magicalogia theme-light">
  <div class="mg-card">
    <div class="mg-card__head">
      <span class="mg-card__sigil"><svg viewBox="0 0 16 16" fill="currentColor"><path
            d="M8 1l1.7 4 4.3.3-3.3 2.8 1 4.2L8 12.2 4.3 12.3l1-4.2L2 5.3 6.3 5z"
          /></svg></span>
      <span class="mg-card__who">{{who}}</span>
    </div>
    <div class="mg-card__body">
      <div class="mg-roll-title">
        <span class="mg-roll-title__skill"><span class="dom">{{domain}}</span> · {{skill}}</span>
        <span class="mg-roll-title__target">목표 <b>{{target}}</b></span>
      </div>
      <div class="mg-roll-dice">
        {{{dieHtml}}}
        <span class="mg-roll-eq">=</span>
        <span class="mg-roll-sum">{{sum}}</span>
        <span class="mg-roll-detail">2D6 · {{dice.[0]}} + {{dice.[1]}}</span>
      </div>
      {{#if success}}
        <div class="mg-outcome mg-outcome--success">
          <span class="mg-outcome__mark">✦</span>
          <span class="mg-outcome__text">{{#if special}}스페셜!{{else}}성공{{/if}}</span>
          {{#if doublet}}<span class="mg-outcome__tag">✦ 더블릿</span>{{/if}}
        </div>
      {{else}}
        <div class="mg-outcome mg-outcome--fail">
          <span class="mg-outcome__mark">✕</span>
          <span class="mg-outcome__text">{{#if fumble}}펌블!{{else}}실패{{/if}}</span>
          {{#if doublet}}<span class="mg-outcome__tag">✦ 더블릿</span>{{/if}}
        </div>
      {{/if}}
      {{#if doublet}}
        <div class="mg-note"><span class="mg-note__icon">✦</span><span><b>{{masoDomain}}</b>의 영역
            마소가 발생합니다</span></div>
      {{/if}}
    </div>
  </div>
</div>
```

- [ ] **Step 3: 빌드·테스트 검증**

Run: `npm run build`
Expected: 성공.

Run: `npm test`
Expected: 전체 그린(무회귀 — classifyRoll/renderDie 테스트 유지).

- [ ] **Step 4: 커밋**

```bash
git add module/system/specialty-roll.mjs templates/chat/specialty-roll.hbs
git commit -m "feat: render roll results as mg-card chat card with maso"
```

**육안 검증(F5):**

- 특기표 특기명 클릭 → 라이트 `.mg-card`: 시질(★) + 시전자, 「영역 · 특기」 + 목표 배지, d6 pip 2면 + 합계 + "2D6·a+b", 성공/실패 리본.
- 펌블(1,1) → 실패 리본 "펌블!" + 「별」 마소 노트. 스페셜(6,6) → 성공 리본 "스페셜!" + 「어둠」 마소.
- 일반 더블릿(예: 4,4) → 더블릿 칩 + 「노래」 마소 노트, 두 주사위 면 골드 강조.
- 혼의특기 클릭 → 같은 카드(영역 "혼의 특기"), 더블릿 시 마소.
- 모든 카드 라이트 테마·가독성. 채팅 로그 타임스탬프/삭제는 Foundry 기본 UI.

---

## Self-Review

**1. Spec coverage:**

- ① `--mg-bad*` 토큰(다크/라이트) → Task 1 Step 1. ✓
- ② `_chat-card.scss` 신설 + import → Task 1 Step 2. ✓
- ③ 템플릿 `.mg-card`(라이트 고정, 시간/삭제 제외, 펌블/스페셜) → Task 3 Step 2. ✓
- ④ specialty-roll.mjs renderDie + postRollCard + 위임 → Task 2 + Task 3 Step 1. ✓
- 마소(특기·혼의특기, attributes 매핑) → postRollCard `masoDomain`. ✓
- classifyRoll 유지 → Task 3 Step 1 주석. ✓

**2. Placeholder scan:** SCSS는 소스 1:1 이식 지시(구체 파일/제외 — placeholder 아님). renderDie/postRollCard/템플릿 완전 코드. TBD 없음. ✓

**3. Type consistency:**

- `renderDie(value, match)` — Task 2 정의와 Task 3 `postRollCard` 호출 일치. ✓
- `postRollCard(actor, {domain, skill, tn})` — 정의와 rollSpecialty/rollSoulSkill 호출 일치. ✓
- 템플릿 데이터 키(`who`/`domain`/`skill`/`target`/`dice`/`sum`/`success`/`special`/`fumble`/`doublet`/`masoDomain`/`dieHtml`) — postRollCard가 넘기는 키와 템플릿 사용 일치. ✓
- `CONFIG.MAGICALOGIA.attributes[d1-1].title` — config attributes(num 1-6, title) 구조와 일치. ✓
- `.mg-bad*`/`.mg-card*` 클래스 — Task 1 produces와 Task 3 템플릿 사용 일치. ✓
