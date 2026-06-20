# New-Design Stage 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the new-design Stage 3 delta — status-chip gold checkbox marks, magic-chart column-header SVG icons, and footer flourishes — by editing markup/SCSS and adding two SVG partials.

**Architecture:** Pure presentation change. No data-model or token changes. SVGs live in `templates/actor/parts/` partials (consistent with S2's `mg-svg-pcorner`/`mg-svg-rankflr`) and must be registered in `module/helpers/templates.mjs`. The magic-chart icon partial branches on a `key` hash param via the existing `eq` helper; chart data already carries `key`.

**Tech Stack:** Handlebars templates, SCSS (Vite-compiled via `npm run build`), Vitest (48 model tests, must stay green).

## Global Constraints

- **No data-model or CSS-token changes.** Tokens used (`--mg-faint` #7d6aa8, `--mg-check` #e0c074, `--mg-line`, `--mg-gold`, `--mg-panel`, `--mg-soft`) all already exist in `scss/theme/_tokens.scss`.
- **Every new partial MUST be added to `loadTemplates` in `module/helpers/templates.mjs`** — omission makes `{{> …}}` render empty silently.
- **SVGs are copied verbatim from the mockup** (`docs/design/new/example.html` ICON object + miniflr). Do not redraw paths.
- **Commit messages: single English line, no co-author.** lint-staged (prettier) auto-formats md/SCSS/hbs on commit — expected, not an error.
- **Verification per task** (no unit tests exist for SCSS/templates): `npm run build` must succeed (SCSS compiles, `dist/magicalogia.css` regenerates) and `npm test` must stay at 48 passing. Final visual check happens in Foundry after all tasks (F5 reload, no server restart).
- `eq` helper is registered in `templates.mjs:28` as `(a, b) => a === b`.

---

### Task 1: Status-chip gold checkbox mark

**Files:**

- Modify: `templates/actor/character-sheet.hbs:140` (status chip span)
- Modify: `scss/component/_components.scss:325-333` (`.mg-status__chip` rules)

**Interfaces:**

- Consumes: existing `statuses` context (`{key, label, active}`) and `toggleStatus` action — both unchanged.
- Produces: nothing consumed by later tasks (independent).

- [ ] **Step 1: Add the mark span to the chip markup**

In `templates/actor/character-sheet.hbs`, replace the chip line (currently line 140):

```hbs
<span class="mg-status__chip {{#if this.active}}is-active{{/if}}" data-action="toggleStatus" data-status="{{this.key}}">{{this.label}}</span>
```

with:

```hbs
<span class="mg-status__chip {{#if this.active}}is-active{{/if}}" data-action="toggleStatus" data-status="{{this.key}}"><span class="mg-status__mark">✓</span>{{this.label}}</span>
```

- [ ] **Step 2: Extend the `.mg-status__chip` SCSS and add `.mg-status__mark`**

In `scss/component/_components.scss`, replace the chip block (currently lines 325-333):

```scss
&__chip {
  font-size: 11.5px;
  color: var(--mg-faint);
  cursor: pointer;
}
&__chip.is-active {
  color: var(--mg-gold);
  font-weight: 700;
} // toggled on
```

with:

```scss
&__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--mg-faint);
  cursor: pointer;
  user-select: none;
  transition: color 0.15s ease;
}
&__mark {
  width: 14px;
  height: 14px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--mg-line);
  border-radius: 4px;
  font-size: 9px;
  line-height: 1;
  color: transparent; // hide ✓ until active
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
&__chip:hover {
  color: var(--mg-soft);
}
&__chip:hover .mg-status__mark {
  border-color: var(--mg-gold);
}
&__chip.is-active {
  color: var(--mg-gold);
  font-weight: 700;
} // toggled on
&__chip.is-active .mg-status__mark {
  background: var(--mg-check);
  border-color: var(--mg-check);
  color: var(--mg-panel); // reveal ✓
}
```

- [ ] **Step 3: Build and verify SCSS compiles**

Run: `npm run build`
Expected: completes without SCSS errors; `dist/magicalogia.css` regenerated.

- [ ] **Step 4: Run the test suite for regressions**

Run: `npm test`
Expected: `Test Files 8 passed (8)`, `Tests 48 passed (48)`.

- [ ] **Step 5: Commit**

```bash
git add templates/actor/character-sheet.hbs scss/component/_components.scss
git commit -m "feat: add gold checkbox mark to status chips (mg-status__mark)"
```

---

### Task 2: Magic-chart column-header SVG icons

**Files:**

- Create: `templates/actor/parts/mg-svg-chart-icon.hbs`
- Modify: `module/helpers/templates.mjs:7-19` (loadTemplates array)
- Modify: `templates/actor/parts/magic-chart.hbs:13-16` (column head markup)
- Modify: `scss/component/_magic-chart.scss:44-54` (add `.ico` rules inside `.mg-chart__head`)

**Interfaces:**

- Consumes: `chart` context entries carrying `key` (`star`/`beast`/`force`/`song`/`dream`/`dark`) — already present, see `module/helpers/config.mjs:10-17`. The `eq` helper.
- Produces: partial `mg-svg-chart-icon` accepting hash param `key` (string); rendered via `{{> mg-svg-chart-icon key=this.key}}`. Reused by no other task.

- [ ] **Step 1: Create the icon partial**

Create `templates/actor/parts/mg-svg-chart-icon.hbs` with the six mockup icons, branching on `key`:

```hbs
{{! 마법표 열 헤더 아이콘 (시안 ICON 객체와 동일). key= star|beast|force|song|dream|dark }}
{{#if (eq key "star")}}<svg viewBox="0 0 16 16"><path
      fill="currentColor"
      d="M8 1l1.8 4.1 4.5.4-3.4 3 1 4.4L8 12.6 4.1 13.3l1-4.4-3.4-3 4.5-.4z"
    /></svg>
{{else if (eq key "beast")}}<svg viewBox="0 0 16 16" fill="currentColor"><ellipse
      cx="8"
      cy="11"
      rx="3.4"
      ry="2.6"
    /><circle cx="3.4" cy="7.6" r="1.5" /><circle cx="12.6" cy="7.6" r="1.5" /><circle
      cx="6"
      cy="4.4"
      r="1.4"
    /><circle cx="10" cy="4.4" r="1.4" /></svg>
{{else if (eq key "force")}}<svg viewBox="0 0 16 16"><path
      fill="currentColor"
      d="M9.5 1L3 9h3.2l-1 6 6.3-9H8.3z"
    /></svg>
{{else if (eq key "song")}}<svg viewBox="0 0 16 16" fill="currentColor"><path
      d="M6 2.2l7-1.6v8.7a2.4 2.4 0 1 1-1.4-2.2V3.1L7.4 4v6.6A2.4 2.4 0 1 1 6 8.4z"
    /></svg>
{{else if (eq key "dream")}}<svg viewBox="0 0 16 16"><path
      fill="currentColor"
      d="M11.2 1A6 6 0 1 0 15 11.4 6.5 6.5 0 0 1 11.2 1z"
    /></svg>
{{else if (eq key "dark")}}<svg viewBox="0 0 16 16"><path
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      d="M1.3 8S4 3.6 8 3.6 14.7 8 14.7 8 12 12.4 8 12.4 1.3 8 1.3 8z"
    /><circle cx="8" cy="8" r="2" fill="currentColor" /></svg>
{{/if}}
```

- [ ] **Step 2: Register the partial**

In `module/helpers/templates.mjs`, add a line to the `loadTemplates` array (after the `mg-svg-rankflr.hbs` entry on line 12):

```js
    "systems/magicalogia/templates/actor/parts/mg-svg-chart-icon.hbs",
```

- [ ] **Step 3: Add the icon span to the column header markup**

In `templates/actor/parts/magic-chart.hbs`, replace the attribute-column head (currently lines 13-16):

```hbs
<div class="mg-chart__head">
  <span class="num">{{this.num}}</span>
  <span class="title">{{this.title}}</span>
</div>
```

with:

```hbs
      <div class="mg-chart__head">
        <span class="ico">{{> mg-svg-chart-icon key=this.key}}</span>
        <span class="num">{{this.num}}</span>
        <span class="title">{{this.title}}</span>
      </div>
```

(Leave the empty `<div class="mg-chart__head"></div>` in the index column on line 5 untouched — it has no icon.)

- [ ] **Step 4: Add `.ico` SCSS inside `.mg-chart__head`**

In `scss/component/_magic-chart.scss`, the `.mg-chart__head` block already has `display:flex; align-items:center; justify-content:center; gap:5px`. Add `.ico` rules alongside the existing `.num`/`.title` (insert before `.num` at line 45):

```scss
.ico {
  display: flex;
  align-items: center;
  line-height: 1;
  color: var(--mg-gold);

  svg {
    display: block;
    width: 13px;
    height: 13px;
  }
}
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: completes without errors; `dist/magicalogia.css` regenerated.

- [ ] **Step 6: Run the test suite for regressions**

Run: `npm test`
Expected: `Tests 48 passed (48)`.

- [ ] **Step 7: Commit**

```bash
git add templates/actor/parts/mg-svg-chart-icon.hbs module/helpers/templates.mjs templates/actor/parts/magic-chart.hbs scss/component/_magic-chart.scss
git commit -m "feat: add SVG attribute icons to magic-chart column headers"
```

---

### Task 3: Magic-chart footer flourishes

**Files:**

- Create: `templates/actor/parts/mg-svg-miniflr.hbs`
- Modify: `module/helpers/templates.mjs` (loadTemplates array)
- Modify: `templates/actor/parts/magic-chart.hbs:29,37` (footer labels)
- Modify: `scss/component/_magic-chart.scss` (add `.mg-flourish` rule)

**Interfaces:**

- Consumes: nothing dynamic (static SVG partial, no params).
- Produces: partial `mg-svg-miniflr` (no params); rendered via `{{> mg-svg-miniflr}}`.

- [ ] **Step 1: Create the flourish partial**

Create `templates/actor/parts/mg-svg-miniflr.hbs` with the mockup miniflr SVG:

```hbs
{{! 마법표 푸터 라벨 플로리시 (시안 mg-svg-miniflr와 동일) }}
<svg viewBox="0 0 40 16" width="32" height="13" aria-hidden="true"><g
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
  ><path d="M2 8 c8 0 8 -5 14 -5 c5 0 5 6 -1 6" /><path
      d="M38 8 c-8 0 -8 -5 -14 -5 c-5 0 -5 6 1 6"
    /></g><path d="M20 4 l4 4 l-4 4 l-4 -4 z" fill="currentColor" /></svg>
```

- [ ] **Step 2: Register the partial**

In `module/helpers/templates.mjs`, add to the `loadTemplates` array:

```js
    "systems/magicalogia/templates/actor/parts/mg-svg-miniflr.hbs",
```

- [ ] **Step 3: Insert the flourish into both footer labels**

In `templates/actor/parts/magic-chart.hbs`, the footer has two `<label>` elements. Add a flourish span at the start of each label's text.

Replace the "소속영역" label opening (currently line 29):

```hbs
    <label>소속영역
```

with:

```hbs
    <label><span class="mg-flourish">{{> mg-svg-miniflr}}</span>소속영역
```

Replace the "혼의 특기" label (currently line 37):

```hbs
<label>혼의 특기 <input type="text" name="system.soulSkill" value="{{system.soulSkill}}" /></label>
```

with:

```hbs
    <label><span class="mg-flourish">{{> mg-svg-miniflr}}</span>혼의 특기 <input type="text" name="system.soulSkill" value="{{system.soulSkill}}" /></label>
```

- [ ] **Step 4: Add `.mg-flourish` SCSS**

In `scss/component/_magic-chart.scss`, inside the `.magicalogia .mg-chart { … }` block, add a rule for the footer flourish (place it adjacent to the `.mg-chart__footer` rule, after line 118 `}` that closes footer, but still inside the outer `.mg-chart` block — i.e. before the final closing brace on line 119):

```scss
.mg-flourish {
  display: inline-flex;
  align-items: center;
  color: var(--mg-gold);

  svg {
    display: block;
  }
}
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: completes without errors; `dist/magicalogia.css` regenerated.

- [ ] **Step 6: Run the test suite for regressions**

Run: `npm test`
Expected: `Tests 48 passed (48)`.

- [ ] **Step 7: Commit**

```bash
git add templates/actor/parts/mg-svg-miniflr.hbs module/helpers/templates.mjs templates/actor/parts/magic-chart.hbs scss/component/_magic-chart.scss
git commit -m "feat: add miniflr flourishes to magic-chart footer labels"
```

---

## Final Verification (after all tasks)

Not a task — the human runs this gate in Foundry.

- [ ] `npm run build` and `npm test` (48) both green on the final commit.
- [ ] Foundry F5 reload (partials are new, so template cache must refresh; documentTypes unchanged → no server restart). Confirm:
  - **Status chips:** each chip shows a gold checkbox before its label. Inactive = empty bordered box; hover = gold border; click (toggleStatus) → box fills with `--mg-check` and ✓ shows. Toggle still works.
  - **Magic chart:** all 6 column headers show a gold SVG icon (star/beast/force/song/dream/dark) left of number + title, centered. is-domain highlight, cells, and check toggles unchanged.
  - **Footer:** "소속영역" and "혼의 특기" labels each show a gold flourish before the text.
  - **No regressions:** S2 headband, S1 frame corners, tabs, counters intact.

## Notes / Pitfalls

- Forgetting to register a new partial in `loadTemplates` → `{{> …}}` renders empty silently (S2 pitfall).
- Magic-chart SCSS is centralized in `scss/component/_magic-chart.scss` (not split into `_layout.scss` — confirmed).
- Status-chip SCSS lives in the `.mg-status` block of `scss/component/_components.scss` (uses Sass `$mg-radius-sm`).
- prettier (lint-staged) will reflow the inline SVG attributes onto multiple lines on commit — expected, matches existing `mg-svg-rankflr.hbs` formatting.
