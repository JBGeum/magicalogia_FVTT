# 마기카로기아 특기표 판정 슬라이스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마기카로기아 캐릭터의 특기표(마법표) 판정을 데이터→시트→2d6 판정까지 end-to-end로 동작시킨다.

**Architecture:** 거리/TN 규칙과 판정 분류를 Foundry 비의존 **순수 모듈**(`system/specialty-table.mjs`, `system/specialty-roll.mjs`)로 분리해 vitest로 검증한다. 정적 마법표는 `CONFIG.MAGICALOGIA`, 캐릭터 상태는 전체 `CharacterDataModel`에 둔다. 시트(`ActorSheetV2`)는 `_prepareContext`에서 엔진을 호출해 셀별 `{tn, rollable, owned}`를 만들고, 스킬 토글·판정은 ApplicationV2 `actions`로 처리한다.

**Tech Stack:** Foundry VTT V13(ApplicationV2 + TypeDataModel), `.mjs`, vitest, SCSS(Vite 추출).

## Global Constraints

- 시스템 id `magicalogia`. 런타임 코드 `.mjs`. V13 네임스페이스(`foundry.applications.*`, `foundry.documents.collections.*`).
- DataModel-only(template.json 없음). 구조화 스키마 사용(동적 문자열 키 금지).
- 속성(가로 순서, 고정): `star, beast, force, song, dream, dark`. 행(세로): 출목 `[2..12]`, 인덱스 0~10.
- 거리: 보유 특기=0(TN 5), 칸당 +1. `거리 = |행인덱스차| + 가로거리`. `가로거리(직선) = 2×|열인덱스차| − (사이 칠해진 gap 수)`. 세로 순환 없음.
- 소속영역(`domain`, 단일): 그 열 양옆 gap을 칠함(생략). 상흔영역(`scarDomains`, 복수): 그 열 취소선/판정불가.
- 취소선(어둠 열 또는 상흔영역) = 판정 대상 불가(`rollable=false`). 보유 시 거리 기준점(anchor)으로는 유효.
- 가로 순환: 기본 false. `wrap=true`면 어둠↔별 인접(엔진 지원만, 이번 슬라이스에선 발동 주문 없음).
- `TN = 5 + min(모든 보유 특기까지 거리)`. 보유 0개면 `tn=null`, `rollable=false`.
- 판정: 2d6. `(1,1)`=펌블(자동 실패), `(6,6)`=스페셜(자동 성공), 그 외 `합≥TN`=성공. `d1==d2`=더블릿 플래그.
- 커밋 메시지: 영어 한 줄, Conventional Commits 접두사, `Co-Authored-By` 없음, 본문 없음.
- 테스트는 `test/**/*.test.mjs`. Foundry 런타임 전역(`foundry.data.fields` 등)은 테스트에서 스텁 주입(기존 `test/data-models.test.mjs` 패턴).

---

## Task 1: CONFIG 정적 마법표 토폴로지

`CONFIG.MAGICALOGIA`에 변하지 않는 마법표 데이터(속성·특기 이름·행·상태이상·옵션)를 채운다.

**Files:**

- Modify: `module/helpers/config.mjs`
- Test: `test/config.test.mjs`

**Interfaces:**

- Produces: `MAGICALOGIA.attributes` (6개 `{key,num,title,dark}`), `MAGICALOGIA.chart` (`{key: string[11]}`), `MAGICALOGIA.rows` (`[2..12]`), `MAGICALOGIA.statuses` (8개 `{key,label}`), `MAGICALOGIA.spellTypes`, `MAGICALOGIA.anchorAttrs`, `MAGICALOGIA.themes`. 이후 모든 태스크가 이 키를 참조.

- [ ] **Step 1: 실패 테스트 작성 `test/config.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { MAGICALOGIA } from "../module/helpers/config.mjs";

describe("MAGICALOGIA config", () => {
  it("6속성이 고정 순서로 정의된다", () => {
    expect(MAGICALOGIA.attributes.map((a) => a.key)).toEqual([
      "star",
      "beast",
      "force",
      "song",
      "dream",
      "dark",
    ]);
  });
  it("어둠만 dark=true", () => {
    const dark = MAGICALOGIA.attributes.filter((a) => a.dark).map((a) => a.key);
    expect(dark).toEqual(["dark"]);
  });
  it("각 속성 특기 이름이 11개씩 있다", () => {
    for (const a of MAGICALOGIA.attributes) {
      expect(MAGICALOGIA.chart[a.key]).toHaveLength(11);
    }
  });
  it("행(출목)은 2..12", () => {
    expect(MAGICALOGIA.rows).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it("상태이상 8종", () => {
    expect(MAGICALOGIA.statuses).toHaveLength(8);
    expect(MAGICALOGIA.statuses[0]).toEqual({ key: "seal", label: "봉인" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/config.test.mjs`
Expected: FAIL (`attributes` undefined 등)

- [ ] **Step 3: `module/helpers/config.mjs` 작성**

```js
/**
 * 시스템 전역 상수 단일 출처. CONFIG.MAGICALOGIA로 주입된다.
 * 마법표는 액터마다 동일한 고정 레퍼런스 데이터 — 특기 이름·열·행만 담고
 * 목표치(TN)는 저장하지 않는다(거리로 매번 파생).
 */
export const MAGICALOGIA = {};

// 속성 열 (가로 순서 = 배열 순서). dark=true는 어둠(저주) 열.
MAGICALOGIA.attributes = [
  { key: "star", num: "1", title: "별", dark: false },
  { key: "beast", num: "2", title: "짐승", dark: false },
  { key: "force", num: "3", title: "힘", dark: false },
  { key: "song", num: "4", title: "노래", dark: false },
  { key: "dream", num: "5", title: "꿈", dark: false },
  { key: "dark", num: "6", title: "어둠", dark: true },
];

// 행(출목) — 세로 위치. 인덱스 0..10 ↔ 출목 2..12.
MAGICALOGIA.rows = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 특기 이름 (열별 11개, 행 인덱스 0..10 순서).
MAGICALOGIA.chart = {
  star: ["황금", "대지", "숲", "길", "바다", "정적", "비", "폭풍", "태양", "천공", "이게"],
  beast: ["육체", "벌레", "꽃", "피", "비늘", "혼돈", "송곳니", "포효", "분노", "날개", "에로스"],
  force: ["중력", "바람", "흐름", "물", "파동", "자유", "충격", "번개", "불꽃", "빛", "순환"],
  song: ["이야기", "선율", "눈물", "이별", "미소", "마음", "승리", "사랑", "정열", "치유", "시간"],
  dream: [
    "추억",
    "수수께끼",
    "거짓말",
    "불안",
    "잠",
    "우연",
    "환상",
    "광기",
    "기도",
    "희망",
    "미래",
  ],
  dark: [
    "심연",
    "부패",
    "배신",
    "마흑",
    "태만",
    "일그러짐",
    "불행",
    "바보",
    "악의",
    "절망",
    "죽음",
  ],
};

// 상태이상 8종.
MAGICALOGIA.statuses = [
  { key: "seal", label: "봉인" },
  { key: "burn", label: "타짐" },
  { key: "weak", label: "허약" },
  { key: "plague", label: "병마" },
  { key: "block", label: "차단" },
  { key: "misfortune", label: "불운" },
  { key: "death", label: "사망" },
  { key: "vanish", label: "소멸" },
];

// 장서/관계 select 옵션.
MAGICALOGIA.spellTypes = ["공격", "소환", "장비", "주문", "기타"];
MAGICALOGIA.anchorAttrs = ["혈연", "연애", "흥미", "존경", "사명", "공포", "열등", "분노"];

// 테마 루트 클래스 (액터 flag로 선택).
MAGICALOGIA.themes = { dark: "theme-dark", light: "theme-light" };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/config.test.mjs`
Expected: PASS (5개)

- [ ] **Step 5: 커밋**

```bash
git add module/helpers/config.mjs test/config.test.mjs
git commit -m "feat: add static magic-chart config topology"
```

---

## Task 2: 거리/TN 엔진 (순수)

마법표 셀별 목표치(TN)·rollable·owned를 계산하는 순수 함수. 시스템의 심장 — TDD로 검증 예시를 박는다.

**Files:**

- Create: `module/system/specialty-table.mjs`
- Test: `test/specialty-table.test.mjs`

**Interfaces:**

- Consumes: `MAGICALOGIA.attributes`, `MAGICALOGIA.chart`, `MAGICALOGIA.rows` (Task 1).
- Produces: `computeTable(state) => Column[]` where
  `state = { owned: { [key]: boolean[] }, domain: string|null, scarDomains: { [key]: boolean }, wrap: boolean }`
  and `Column = { key, num, title, dark, scar:boolean, domainActive:boolean, cells: Cell[] }`,
  `Cell = { name, index:number, value:number(출목), tn:number|null, rollable:boolean, owned:boolean }`.

- [ ] **Step 1: 실패 테스트 작성 `test/specialty-table.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { computeTable } from "../module/system/specialty-table.mjs";

// 빈 보유 맵
const noOwn = () => ({});
// 특정 (열,인덱스)만 보유한 맵 생성
function own(pairs) {
  const o = {};
  for (const [key, idx] of pairs) {
    o[key] ??= Array(11).fill(false);
    o[key][idx] = true;
  }
  return o;
}
// 결과에서 (열,인덱스) 셀 찾기
function cell(table, key, idx) {
  return table.find((c) => c.key === key).cells[idx];
}

describe("computeTable 거리/TN", () => {
  it("보유 특기 자신은 TN 5", () => {
    const t = computeTable({
      owned: own([["song", 3]]),
      domain: null,
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "song", 3).tn).toBe(5);
    expect(cell(t, "song", 3).owned).toBe(true);
  });

  it("인접 열 같은 행은 gap 포함 거리 2 → TN 7 (물 ← 이별)", () => {
    // 이별 = song[3](행5), 물 = force[3](행5)
    const t = computeTable({
      owned: own([["song", 3]]),
      domain: null,
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "force", 3).tn).toBe(7);
  });

  it("소속영역이면 양옆 gap 생략 → 인접 열 거리 1 → TN 6 (꽃 ← 숲/흐름)", () => {
    // 꽃 = beast[2](행4), 숲 = star[2], 흐름 = force[2]
    const t = computeTable({
      owned: own([["beast", 2]]),
      domain: "beast",
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "star", 2).tn).toBe(6);
    expect(cell(t, "force", 2).tn).toBe(6);
  });

  it("세로 이동도 +1 (같은 열 2행 차 → TN 7)", () => {
    const t = computeTable({
      owned: own([["star", 0]]),
      domain: null,
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "star", 2).tn).toBe(7);
  });

  it("어둠 열은 rollable=false, 보유 시 anchor로는 유효", () => {
    const t = computeTable({
      owned: own([["dark", 0]]),
      domain: null,
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "dark", 0).rollable).toBe(false);
    expect(cell(t, "dark", 0).owned).toBe(true);
    // 어둠 보유가 인접 거리에 반영되는지: dark[0] 기준 dream[0]은 거리 2 → TN 7
    expect(cell(t, "dream", 0).tn).toBe(7);
  });

  it("상흔영역 열은 rollable=false", () => {
    const t = computeTable({
      owned: own([["song", 0]]),
      domain: null,
      scarDomains: { song: true },
      wrap: false,
    });
    expect(cell(t, "song", 0).rollable).toBe(false);
  });

  it("일반 열은 rollable=true", () => {
    const t = computeTable({
      owned: own([["song", 0]]),
      domain: null,
      scarDomains: {},
      wrap: false,
    });
    expect(cell(t, "song", 0).rollable).toBe(true);
  });

  it("보유 특기 0개면 tn=null, rollable=false 무관하게 tn 없음", () => {
    const t = computeTable({ owned: noOwn(), domain: null, scarDomains: {}, wrap: false });
    expect(cell(t, "star", 0).tn).toBeNull();
  });

  it("wrap=true면 어둠↔별이 인접 (거리 2 → TN 7)", () => {
    // 별 보유, 어둠 첫 행 거리: 직선은 멀지만 wrap으로 2
    const t = computeTable({
      owned: own([["star", 0]]),
      domain: null,
      scarDomains: {},
      wrap: true,
    });
    expect(cell(t, "dark", 0).tn).toBe(7);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/specialty-table.test.mjs`
Expected: FAIL (`Cannot find module ../module/system/specialty-table.mjs`)

- [ ] **Step 3: `module/system/specialty-table.mjs` 작성**

```js
import { MAGICALOGIA } from "../helpers/config.mjs";

/**
 * 마법표 셀별 목표치(TN)·rollable·owned 계산 (순수, Foundry 비의존).
 *
 * 거리 모델: 표를 2D 그래프로 본다.
 *   - 세로: 행 인덱스 차 |i-j| (순환 없음).
 *   - 가로: 열 사이에 gap이 1칸씩 끼어 인접 열까지 2칸(열→gap→열).
 *     소속영역(domain) 열의 양옆 gap은 칠해져 0칸으로 생략된다.
 *   - wrap=true면 어둠↔별 사이에 wrap-gap이 생겨 원형이 된다.
 *   - TN = 5 + (가장 가까운 보유 특기까지 거리). 보유 자신 = 0 → TN 5.
 *
 * @param {{owned:Object, domain:?string, scarDomains:Object, wrap:boolean}} state
 * @returns {Array} 열별 { key,num,title,dark,scar,domainActive, cells:[{name,index,value,tn,rollable,owned}] }
 */
export function computeTable(state) {
  const attrs = MAGICALOGIA.attributes;
  const rows = MAGICALOGIA.rows;
  const N = attrs.length;
  const colIndex = Object.fromEntries(attrs.map((a, i) => [a.key, i]));
  const domainIdx =
    state.domain != null && colIndex[state.domain] != null ? colIndex[state.domain] : null;

  const owned = state.owned ?? {};
  const isOwned = (key, i) => Boolean(owned[key]?.[i]);

  // 보유 특기 좌표 목록 (anchor) — 어둠/상흔 포함.
  const anchors = [];
  for (const a of attrs) {
    for (let i = 0; i < rows.length; i++) {
      if (isOwned(a.key, i)) anchors.push({ c: colIndex[a.key], i });
    }
  }

  // gap g(0..N-1)는 열 g와 (g+1)%N 사이. domain은 좌측 gap((d-1+N)%N)과 우측 gap(d)을 칠한다.
  const isGapFilled = (g) =>
    domainIdx != null && (g === (domainIdx - 1 + N) % N || g === domainIdx);

  // 두 열 사이 가로 거리(칸 수). wrap이면 양 방향 중 최소.
  function horizontalDist(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    // 직선: gap 인덱스 lo..hi-1 사용.
    let directFilled = 0;
    for (let g = lo; g < hi; g++) if (isGapFilled(g)) directFilled++;
    const direct = 2 * (hi - lo) - directFilled;
    if (!state.wrap) return direct;
    // 반대 호: gap 인덱스 hi..N-1, 0..lo-1 사용 (wrap-gap = N-1 포함).
    let aroundFilled = 0;
    for (let g = hi; g <= N - 1; g++) if (isGapFilled(g)) aroundFilled++;
    for (let g = 0; g < lo; g++) if (isGapFilled(g)) aroundFilled++;
    const around = 2 * (N - (hi - lo)) - aroundFilled;
    return Math.min(direct, around);
  }

  return attrs.map((a) => {
    const c = colIndex[a.key];
    const scar = Boolean(state.scarDomains?.[a.key]);
    const rollableCol = !a.dark && !scar;
    const cells = MAGICALOGIA.chart[a.key].map((name, i) => {
      let tn = null;
      for (const anchor of anchors) {
        const dist = Math.abs(i - anchor.i) + horizontalDist(c, anchor.c);
        const t = 5 + dist;
        if (tn == null || t < tn) tn = t;
      }
      return {
        name,
        index: i,
        value: rows[i],
        tn,
        rollable: rollableCol,
        owned: isOwned(a.key, i),
      };
    });
    return {
      key: a.key,
      num: a.num,
      title: a.title,
      dark: a.dark,
      scar,
      domainActive: domainIdx === c,
      cells,
    };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/specialty-table.test.mjs`
Expected: PASS (9개)

- [ ] **Step 5: 커밋**

```bash
git add module/system/specialty-table.mjs test/specialty-table.test.mjs
git commit -m "feat: add specialty distance and target-number engine"
```

---

## Task 3: 판정 분류 (순수)

2d6 결과를 성공/스페셜/펌블/더블릿으로 분류하는 순수 함수.

**Files:**

- Create: `module/system/specialty-roll.mjs`
- Test: `test/specialty-roll.test.mjs`

**Interfaces:**

- Produces: `classifyRoll(d1, d2, tn) => { total:number, success:boolean, special:boolean, fumble:boolean, doublet:boolean }`.
- (이 파일에는 Task 6에서 Foundry 의존 `rollSpecialty`가 추가되지만, 이 태스크는 `classifyRoll`만.)

- [ ] **Step 1: 실패 테스트 작성 `test/specialty-roll.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { classifyRoll } from "../module/system/specialty-roll.mjs";

describe("classifyRoll", () => {
  it("(1,1)은 펌블 = 자동 실패", () => {
    const r = classifyRoll(1, 1, 5);
    expect(r.fumble).toBe(true);
    expect(r.success).toBe(false);
    expect(r.doublet).toBe(true);
  });
  it("(6,6)은 스페셜 = 자동 성공", () => {
    const r = classifyRoll(6, 6, 12);
    expect(r.special).toBe(true);
    expect(r.success).toBe(true);
    expect(r.doublet).toBe(true);
  });
  it("합이 TN 이상이면 성공", () => {
    const r = classifyRoll(3, 4, 7); // 7 >= 7
    expect(r.success).toBe(true);
    expect(r.special).toBe(false);
    expect(r.fumble).toBe(false);
  });
  it("합이 TN 미만이면 실패", () => {
    expect(classifyRoll(2, 3, 7).success).toBe(false); // 5 < 7
  });
  it("같은 눈은 더블릿 플래그", () => {
    expect(classifyRoll(4, 4, 5).doublet).toBe(true);
    expect(classifyRoll(4, 5, 5).doublet).toBe(false);
  });
  it("total은 두 눈의 합", () => {
    expect(classifyRoll(2, 5, 5).total).toBe(7);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/specialty-roll.test.mjs`
Expected: FAIL (`Cannot find module`)

- [ ] **Step 3: `module/system/specialty-roll.mjs` 작성**

```js
/**
 * 2d6 특기 판정 분류 (순수).
 *   (1,1) = 펌블(자동 실패), (6,6) = 스페셜(자동 성공),
 *   그 외 합 >= TN = 성공. 같은 눈 = 더블릿.
 *
 * @param {number} d1
 * @param {number} d2
 * @param {number} tn  목표치
 * @returns {{total:number, success:boolean, special:boolean, fumble:boolean, doublet:boolean}}
 */
export function classifyRoll(d1, d2, tn) {
  const total = d1 + d2;
  const doublet = d1 === d2;
  const fumble = d1 === 1 && d2 === 1;
  const special = d1 === 6 && d2 === 6;
  let success;
  if (fumble) success = false;
  else if (special) success = true;
  else success = total >= tn;
  return { total, success, special, fumble, doublet };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/specialty-roll.test.mjs`
Expected: PASS (6개)

- [ ] **Step 5: 커밋**

```bash
git add module/system/specialty-roll.mjs test/specialty-roll.test.mjs
git commit -m "feat: add 2d6 specialty roll classification"
```

---

## Task 4: CharacterDataModel 전체 정의

캐릭터의 전체 스키마를 정의한다(슬라이스 외 필드는 자리만). 동적 키 대신 구조화 스키마.

**Files:**

- Modify: `module/data/actors/character.mjs`
- Test: `test/character-model.test.mjs`

**Interfaces:**

- Consumes: `BaseActorModel`(health/biography 상속) — `module/data/base-actor.mjs`.
- Produces: `CharacterDataModel.defineSchema()`에 `skills`(열별 boolean[11]), `domain`, `scarDomains`(열별 bool), `horizontalWrap`, `soulSkill`, `variableSkill`, `abilities{attack,defense,source}`, `rank`, `mp{value,max}`, `tempMp`, `achievement`, `mabloom`, `statuses`(8 bool), `spells[]`, `anchors[]`, `mission`, `collection`. 시트(Task 5)가 이 경로를 읽는다.

- [ ] **Step 1: 실패 테스트 작성 `test/character-model.test.mjs`**

```js
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  class FakeField {
    constructor(opts = {}) {
      this.options = opts;
    }
  }
  globalThis.foundry = {
    data: {
      fields: {
        NumberField: FakeField,
        StringField: FakeField,
        BooleanField: FakeField,
        HTMLField: FakeField,
        ArrayField: class extends FakeField {
          constructor(element, opts) {
            super(opts);
            this.element = element;
          }
        },
        SchemaField: class extends FakeField {
          constructor(schema, opts) {
            super(opts);
            this.fields = schema;
          }
        },
      },
    },
    abstract: { TypeDataModel: class {} },
  };
});

describe("CharacterDataModel", () => {
  it("특기표 슬라이스 핵심 필드를 포함한다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const s = CharacterDataModel.defineSchema();
    for (const key of [
      "skills",
      "domain",
      "scarDomains",
      "horizontalWrap",
      "soulSkill",
      "abilities",
      "statuses",
      "spells",
      "anchors",
    ]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("skills는 6속성 boolean 배열을 가진다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const s = CharacterDataModel.defineSchema();
    expect(Object.keys(s.skills.fields)).toEqual([
      "star",
      "beast",
      "force",
      "song",
      "dream",
      "dark",
    ]);
  });
  it("base 스키마(biography)를 상속한다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    expect(Object.keys(CharacterDataModel.defineSchema())).toContain("biography");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/character-model.test.mjs`
Expected: FAIL (`skills` 등 없음)

- [ ] **Step 3: `module/data/actors/character.mjs` 작성**

```js
import { BaseActorModel } from "../base-actor.mjs";

const fields = foundry.data.fields;

const ATTR_KEYS = ["star", "beast", "force", "song", "dream", "dark"];

/** 한 속성 열의 보유 특기(boolean[11]). */
const skillColumn = () =>
  new fields.ArrayField(new fields.BooleanField({ initial: false }), {
    initial: () => Array(11).fill(false),
  });

/** 속성별 boolean 묶음(소속/상흔/스킬 공통 헬퍼). */
const attrSchema = (factory) =>
  new fields.SchemaField(Object.fromEntries(ATTR_KEYS.map((k) => [k, factory()])));

/**
 * character 액터 데이터 모델 — 마기카로기아 전체 스키마.
 * 특기표 판정 슬라이스가 쓰는 필드 외에는 자리만 둔다(장서/관계/게이지 등).
 */
export class CharacterDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),

      // 특기표
      skills: attrSchema(skillColumn),
      domain: new fields.StringField({ initial: "", choices: ["", ...ATTR_KEYS] }),
      scarDomains: attrSchema(() => new fields.BooleanField({ initial: false })),
      horizontalWrap: new fields.BooleanField({ initial: false }),
      soulSkill: new fields.StringField({ initial: "" }),
      variableSkill: new fields.StringField({ initial: "" }),

      // 능력치 (슬라이스에선 표시만)
      abilities: new fields.SchemaField({
        attack: new fields.NumberField({ initial: 0, integer: true }),
        defense: new fields.NumberField({ initial: 0, integer: true }),
        source: new fields.NumberField({ initial: 0, integer: true }),
      }),
      rank: new fields.NumberField({ initial: 1, integer: true }),

      // 마력/카운터
      mp: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0, integer: true }),
        max: new fields.NumberField({ initial: 0, integer: true }),
      }),
      tempMp: new fields.NumberField({ initial: 0, integer: true }),
      achievement: new fields.NumberField({ initial: 0, integer: true }),
      mabloom: new fields.NumberField({ initial: 0, integer: true }),

      // 상태이상
      statuses: new fields.SchemaField(
        Object.fromEntries(
          ["seal", "burn", "weak", "plague", "block", "misfortune", "death", "vanish"].map((k) => [
            k,
            new fields.BooleanField({ initial: false }),
          ]),
        ),
      ),

      // 장서(spell) — 필드만
      spells: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ initial: "" }),
          type: new fields.StringField({ initial: "" }),
          skill: new fields.StringField({ initial: "" }),
          target: new fields.StringField({ initial: "" }),
          cost: new fields.StringField({ initial: "" }),
          charge: new fields.NumberField({ initial: 0, integer: true }),
          mod: new fields.NumberField({ initial: 0, integer: true }),
          recite: new fields.BooleanField({ initial: false }),
          effect: new fields.StringField({ initial: "" }),
        }),
      ),

      // 관계(anchor) — 필드만
      anchors: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ initial: "" }),
          fate: new fields.NumberField({ initial: 0, integer: true }),
          attr: new fields.StringField({ initial: "" }),
          checked: new fields.BooleanField({ initial: false }),
        }),
      ),

      mission: new fields.StringField({ initial: "" }),
      collection: new fields.StringField({ initial: "" }),
    };
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/character-model.test.mjs`
Expected: PASS (3개)

- [ ] **Step 5: 전체 테스트 + lint + typecheck**

Run: `npm test` → 모든 테스트 PASS
Run: `npm run lint` → 에러 0
Run: `npm run typecheck` → 에러 0

- [ ] **Step 6: 커밋**

```bash
git add module/data/actors/character.mjs test/character-model.test.mjs
git commit -m "feat: define full character data model"
```

---

## Task 5: 시트 렌더 + 인터랙티브 마법표

`_prepareContext`에서 엔진을 호출해 마법표를 렌더하고, 특기 토글·소속영역·상흔영역·상태이상을 조작 가능하게 한다. (판정 롤은 Task 6.)

**Files:**

- Modify: `module/sheets/actor-sheet.mjs`
- Modify: `module/helpers/templates.mjs` (partial preload)
- Modify: `module/magicalogia.mjs` (CONFIG.MAGICALOGIA가 이미 주입됨 — 변경 없음, 확인만)
- Create: `templates/actor/character-sheet.hbs` (교체)
- Create: `templates/actor/parts/magic-chart.hbs`
- Create: `scss/component/_magic-chart.scss`, `scss/theme/_tokens.scss`
- Modify: `scss/magicalogia.scss` (@use 추가)

**Interfaces:**

- Consumes: `computeTable` (Task 2), `CONFIG.MAGICALOGIA` (Task 1), `CharacterDataModel` 경로 (Task 4).
- Produces: `actions.toggleSkill`(data-col,data-index), 폼 바인딩 필드(`system.domain`, `system.scarDomains.{key}`, `system.statuses.{key}`, 능력치/마력). Task 6이 `actions.rollSpecialty`를 추가.

- [ ] **Step 1: `scss/theme/_tokens.scss` 작성 (다크 토큰 + 구조)**

`docs/design/styles/_tokens.scss`의 **다크 테마 값**과 구조 토큰을 가져와 `.magicalogia` 루트에 정의한다. 아래 내용으로 작성:

```scss
// 마기카로기아 디자인 토큰 (다크 — 마법진 바이올렛). 출처: docs/design/styles/_tokens.scss
.magicalogia {
  --mg-paper: radial-gradient(120% 80% at 50% 0%, #271745, #170e2c 72%);
  --mg-panel: #231640;
  --mg-panel-2: #2c1c50;
  --mg-ink: #f1e9ff;
  --mg-soft: #c3b0ec;
  --mg-faint: #7d6aa8;
  --mg-bar: linear-gradient(180deg, #4a2c84, #321f5e);
  --mg-bar-ink: #f0e3b8;
  --mg-gold: #e0c074;
  --mg-line: rgba(224, 192, 116, 0.26);
  --mg-field: #2a1b4c;
  --mg-field-ink: #ece2ff;
  --mg-hi: rgba(224, 192, 116, 0.18);
  --mg-check: #e0c074;
  --mg-dark-ink: #a98fd0;

  --mg-radius: 3px;
  --mg-row-h: 22px;
  --mg-head-h: 36px;
}
```

- [ ] **Step 2: `scss/component/_magic-chart.scss` 작성**

`docs/design/styles/_magic-chart.scss`의 마법표 스타일을 `.magicalogia` 스코프로 가져온다. 핵심 규칙만 아래로 작성(셀=체크+이름+TN, 어둠/상흔 취소선, 보유 하이라이트):

```scss
.magicalogia .mg-chart {
  background: var(--mg-panel);
  border: 1px solid var(--mg-line);
  border-radius: var(--mg-radius);
  color: var(--mg-ink);

  .mg-chart__grid {
    display: grid;
    grid-template-columns: 30px repeat(6, 1fr);
  }
  .mg-chart__head {
    height: var(--mg-head-h);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border-bottom: 1px solid var(--mg-gold);
    font-weight: 700;
  }
  .mg-chart__index-cell,
  .mg-chart__cell {
    height: var(--mg-row-h);
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px;
    border-bottom: 1px solid var(--mg-line);
    font-size: 12px;
  }
  .mg-chart__col + .mg-chart__col {
    border-left: 1px solid var(--mg-line);
  }
  .mg-chart__cell .name {
    flex: 1;
  }
  .mg-chart__cell .tn {
    color: var(--mg-soft);
  }
  .mg-chart__cell.is-on {
    background: var(--mg-hi);
  }
  .mg-chart__cell .mg-check {
    width: 12px;
    height: 12px;
    border: 1px solid var(--mg-check);
    border-radius: 2px;
    cursor: pointer;
    line-height: 1;
    text-align: center;
    color: var(--mg-check);
  }
  // 어둠 열 / 상흔 열 = 취소선·판정 불가
  .mg-chart__col--dark .name,
  .mg-chart__col--scar .name {
    text-decoration: line-through;
    color: var(--mg-dark-ink);
  }
  .mg-chart__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    border-top: 1px solid var(--mg-gold);
    font-size: 12px;
  }
}
```

- [ ] **Step 3: `scss/magicalogia.scss`에 @use 추가**

기존 내용 끝에 추가:

```scss
@use "theme/tokens";
@use "component/magic-chart";
```

(파일 전체는 다음이 된다:)

```scss
@use "global/base";
@use "sheet/sheet";
@use "theme/tokens";
@use "component/magic-chart";
```

- [ ] **Step 4: `templates/actor/parts/magic-chart.hbs` 작성**

```hbs
<div class="mg-chart">
  <div class="mg-chart__grid">
    {{!-- 출목 열 --}}
    <div class="mg-chart__index">
      <div class="mg-chart__head"><span class="num">치</span></div>
      {{#each chartRows}}<div class="mg-chart__index-cell">{{this}}</div>{{/each}}
    </div>

    {{!-- 속성 열 --}}
    {{#each chart}}
    <div class="mg-chart__col {{#if this.dark}}mg-chart__col--dark{{/if}} {{#if this.scar}}mg-chart__col--scar{{/if}}">
      <div class="mg-chart__head">
        <span class="num">{{this.num}}</span>
        <span class="title">{{this.title}}</span>
      </div>
      {{#each this.cells}}
      <div class="mg-chart__cell {{#if this.owned}}is-on{{/if}}">
        <span class="mg-check" data-action="toggleSkill" data-col="{{../key}}" data-index="{{this.index}}">{{#if this.owned}}✓{{/if}}</span>
        <span class="name">{{this.name}}</span>
        <span class="tn">{{#if this.tn}}{{this.tn}}{{else}}—{{/if}}</span>
      </div>
      {{/each}}
    </div>
    {{/each}}
  </div>

  <div class="mg-chart__footer">
    <label>소속영역
      <select name="system.domain">
        <option value="" {{selected (eq system.domain "")}}>—</option>
        {{#each attributes}}
        <option value="{{this.key}}" {{selected (eq ../system.domain this.key)}}>{{this.title}}</option>
        {{/each}}
      </select>
    </label>
    <label>혼의 특기 <input type="text" name="system.soulSkill" value="{{system.soulSkill}}" /></label>
  </div>
</div>
```

- [ ] **Step 5: `module/helpers/templates.mjs`에 partial 등록**

`loadTemplates` 배열에 항목 추가:

```js
export const preloadHandlebarsTemplates = async function () {
  const { loadTemplates } = foundry.applications.handlebars;
  return loadTemplates([
    "systems/magicalogia/templates/actor/character-sheet.hbs",
    "systems/magicalogia/templates/actor/parts/magic-chart.hbs",
    "systems/magicalogia/templates/item/generic-sheet.hbs",
  ]);
};
```

그리고 `registerHandlebarsHelpers`에 `eq` 헬퍼 추가(없으면):

```js
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("checked", (condition) => (condition ? "checked" : ""));
  Handlebars.registerHelper("selected", (condition) => (condition ? "selected" : ""));
  Handlebars.registerHelper("eq", (a, b) => a === b);
}
```

- [ ] **Step 6: `templates/actor/character-sheet.hbs` 교체**

```hbs
<form class="{{cssClass}}" autocomplete="off">
  <header class="mg-masthead">
    <h1 class="mg-name">{{actor.name}}</h1>
    <span class="mg-rank">계제 <input type="number" name="system.rank" value="{{system.rank}}" /></span>
  </header>

  <section class="mg-stats">
    <label>공격 <input type="number" name="system.abilities.attack" value="{{system.abilities.attack}}" /></label>
    <label>방어 <input type="number" name="system.abilities.defense" value="{{system.abilities.defense}}" /></label>
    <label>근원 <input type="number" name="system.abilities.source" value="{{system.abilities.source}}" /></label>
    <label>마력 <input type="number" name="system.mp.value" value="{{system.mp.value}}" /> / <input type="number" name="system.mp.max" value="{{system.mp.max}}" /></label>
    <label>일시마력 <input type="number" name="system.tempMp" value="{{system.tempMp}}" /></label>
    <label>공적점 <input type="number" name="system.achievement" value="{{system.achievement}}" /></label>
  </section>

  <section class="mg-status">
    {{#each statuses}}
    <label class="mg-status__chip {{#if this.active}}is-active{{/if}}">
      <input type="checkbox" name="system.statuses.{{this.key}}" {{checked this.active}} />
      {{this.label}}
    </label>
    {{/each}}
  </section>

  <section class="mg-scar">
    상흔영역:
    {{#each attributes}}
    <label><input type="checkbox" name="system.scarDomains.{{this.key}}" {{checked (lookup ../system.scarDomains this.key)}} /> {{this.title}}</label>
    {{/each}}
  </section>

  {{> "systems/magicalogia/templates/actor/parts/magic-chart.hbs"}}

  <section class="mg-memo">
    {{editor enrichedBiography target="system.biography" button=true editable=editable}}
  </section>
</form>
```

- [ ] **Step 7: `module/sheets/actor-sheet.mjs` 수정 — prepareContext + toggleSkill 액션**

전체를 아래로 교체:

```js
import { computeTable } from "../system/specialty-table.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class MagicalogiaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor", "theme-dark"],
    position: { width: 720, height: 920 },
    window: { resizable: true },
    form: {
      handler: MagicalogiaActorSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      toggleSkill: MagicalogiaActorSheet.#onToggleSkill,
    },
  };

  static PARTS = {
    character: {
      template: "systems/magicalogia/templates/actor/character-sheet.hbs",
    },
  };

  get title() {
    return this.actor.name;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = [this.document.type];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    context.actor = this.actor;
    context.system = sys;
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    context.cssClass = this.actor.type;

    context.attributes = CONFIG.MAGICALOGIA.attributes;
    context.chartRows = CONFIG.MAGICALOGIA.rows;
    context.chart = computeTable({
      owned: sys.skills,
      domain: sys.domain || null,
      scarDomains: sys.scarDomains,
      wrap: sys.horizontalWrap,
    });
    context.statuses = CONFIG.MAGICALOGIA.statuses.map((s) => ({
      ...s,
      active: Boolean(sys.statuses?.[s.key]),
    }));

    context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.biography,
      {
        secrets: this.actor.isOwner,
      },
    );
    return context;
  }

  /** 특기 보유 토글 — ArrayField라 배열 전체를 갱신(폼 인덱스 바인딩 회피). */
  static async #onToggleSkill(_event, target) {
    const col = target.dataset.col;
    const index = Number(target.dataset.index);
    const arr = foundry.utils.deepClone(this.actor.system.skills[col] ?? []);
    while (arr.length < 11) arr.push(false);
    arr[index] = !arr[index];
    await this.actor.update({ [`system.skills.${col}`]: arr });
  }

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
```

- [ ] **Step 8: lint + typecheck + build**

Run: `npm run lint` → 에러 0
Run: `npm run typecheck` → 에러 0
Run: `npm run build` → 에러 0, dist 산출

- [ ] **Step 9: 커밋**

```bash
git add module/sheets/actor-sheet.mjs module/helpers/templates.mjs templates/actor scss/
git commit -m "feat: render interactive specialty chart on character sheet"
```

---

## Task 6: 특기 판정 롤 + 챗카드

rollable 셀 클릭 시 2d6을 굴려 TN과 대조하고 결과를 챗카드로 출력한다. 슬라이스 완성.

**Files:**

- Modify: `module/system/specialty-roll.mjs` (Foundry 의존 `rollSpecialty` 추가)
- Modify: `module/sheets/actor-sheet.mjs` (`rollSpecialty` 액션)
- Modify: `templates/actor/parts/magic-chart.hbs` (rollable 셀에 롤 액션)
- Modify: `module/helpers/templates.mjs` (챗 템플릿 preload)
- Create: `templates/chat/specialty-roll.hbs`

**Interfaces:**

- Consumes: `classifyRoll` (Task 3), `computeTable` (Task 2), CONFIG/시트 (Task 5).
- Produces: `rollSpecialty(actor, colKey, rowIndex)` → ChatMessage 생성. 시트 `actions.rollSpecialty`.

- [ ] **Step 1: `module/system/specialty-roll.mjs`에 `rollSpecialty` 추가**

기존 `classifyRoll` 아래에 추가:

```js
import { computeTable } from "./specialty-table.mjs";

/**
 * 특기 셀로 2d6 판정 후 챗카드 출력.
 * @param {Actor} actor
 * @param {string} colKey   속성 key
 * @param {number} rowIndex 행 인덱스 0..10
 */
export async function rollSpecialty(actor, colKey, rowIndex) {
  const sys = actor.system;
  const table = computeTable({
    owned: sys.skills,
    domain: sys.domain || null,
    scarDomains: sys.scarDomains,
    wrap: sys.horizontalWrap,
  });
  const column = table.find((c) => c.key === colKey);
  const cell = column?.cells?.[rowIndex];

  if (!cell || !cell.rollable) {
    ui.notifications.warn("이 특기로는 판정할 수 없습니다.");
    return;
  }
  if (cell.tn == null) {
    ui.notifications.warn("보유한 특기가 없어 목표치를 계산할 수 없습니다.");
    return;
  }

  const roll = await new Roll("2d6").evaluate();
  const [d1, d2] = roll.dice[0].results.map((r) => r.result);
  const result = classifyRoll(d1, d2, cell.tn);

  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/specialty-roll.hbs",
    {
      specialty: cell.name,
      column: column.title,
      tn: cell.tn,
      d1,
      d2,
      result,
    },
  );

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
  });
}
```

- [ ] **Step 2: `templates/chat/specialty-roll.hbs` 작성**

```hbs
<div class="magicalogia mg-roll-card">
  <header class="mg-roll-card__head">{{column}} · {{specialty}} (목표 {{tn}})</header>
  <div class="mg-roll-card__dice">🎲 {{d1}} + {{d2}} = {{result.total}}</div>
  <div class="mg-roll-card__result">
    {{#if result.fumble}}<strong>펌블! (실패)</strong>
    {{else if result.special}}<strong>스페셜! (성공)</strong>
    {{else if result.success}}<strong>성공</strong>
    {{else}}<strong>실패</strong>{{/if}}
    {{#if result.doublet}}<span class="mg-roll-card__doublet">· 더블릿</span>{{/if}}
  </div>
</div>
```

- [ ] **Step 3: `module/helpers/templates.mjs`에 챗 템플릿 preload 추가**

`loadTemplates` 배열에 추가:

```js
    "systems/magicalogia/templates/chat/specialty-roll.hbs",
```

(전체 배열:)

```js
return loadTemplates([
  "systems/magicalogia/templates/actor/character-sheet.hbs",
  "systems/magicalogia/templates/actor/parts/magic-chart.hbs",
  "systems/magicalogia/templates/item/generic-sheet.hbs",
  "systems/magicalogia/templates/chat/specialty-roll.hbs",
]);
```

- [ ] **Step 4: `templates/actor/parts/magic-chart.hbs` — rollable 셀에 롤 액션**

셀의 `name` span을 rollable일 때 롤 트리거로 만든다. 기존 `<span class="name">{{this.name}}</span>` 줄을 아래로 교체:

```hbs
        {{#if this.rollable}}
        <span class="name mg-rollable" data-action="rollSpecialty" data-col="{{../key}}" data-index="{{this.index}}">{{this.name}}</span>
        {{else}}
        <span class="name">{{this.name}}</span>
        {{/if}}
```

- [ ] **Step 5: `module/sheets/actor-sheet.mjs` — rollSpecialty 액션 등록**

import에 추가:

```js
import { computeTable } from "../system/specialty-table.mjs";
import { rollSpecialty } from "../system/specialty-roll.mjs";
```

`actions`에 추가:

```js
    actions: {
      toggleSkill: MagicalogiaActorSheet.#onToggleSkill,
      rollSpecialty: MagicalogiaActorSheet.#onRollSpecialty,
    },
```

`#onToggleSkill` 아래에 메서드 추가:

```js
  static async #onRollSpecialty(_event, target) {
    await rollSpecialty(this.actor, target.dataset.col, Number(target.dataset.index));
  }
```

- [ ] **Step 6: 마법표 셀 커서 스타일 (`scss/component/_magic-chart.scss`에 추가)**

`.mg-chart` 블록 안에 추가:

```scss
.mg-rollable {
  cursor: pointer;
}
.mg-rollable:hover {
  color: var(--mg-gold);
}
```

- [ ] **Step 7: lint + typecheck + build + 전체 테스트**

Run: `npm run lint` → 에러 0
Run: `npm run typecheck` → 에러 0
Run: `npm test` → 모든 테스트 PASS (config 5 + specialty-table 9 + specialty-roll 6 + character-model 3 + 기존 data-models 4 + sample 1)
Run: `npm run build` → 에러 0, dist 산출

- [ ] **Step 8: 커밋**

```bash
git add module/system/specialty-roll.mjs module/sheets/actor-sheet.mjs templates/ module/helpers/templates.mjs scss/
git commit -m "feat: roll specialty checks to chat card"
```

- [ ] **Step 9: (수동) Foundry 런타임 검증**

`npm run build && npm run link:foundry` 후 Foundry 기동:

1. character 액터 생성 → 시트 오픈 → 마법표가 6열×11행으로 표시되고 각 셀에 `—`(보유 0개) 표시.
2. 특기 셀 체크 토글 → 그 셀 TN 5, 주변 셀 TN이 거리대로 갱신.
3. 소속영역 select 변경 → 해당 열 인접 거리 1칸 단축 확인.
4. 상흔영역 체크 → 그 열 취소선·롤 불가. 어둠 열도 취소선·롤 불가.
5. rollable 특기명 클릭 → 2d6 판정 챗카드(성공/실패/스페셜/펌블/더블릿) 출력.
   Expected: 콘솔 에러 없이 위 동작 정상.

---

## Self-Review

- **Spec coverage:** 2.1~2.2 거리/TN → Task 2. 2.3 취소선 → Task 2(rollable)+Task 5(template). 2.4 두 영역 → Task 4(필드)+Task 2(domain/scar)+Task 5(UI). 2.5 wrap → Task 2(엔진)+Task 4(필드). 2.6 판정 분류 → Task 3. §4 CONFIG → Task 1. §5 DataModel → Task 4. §6 엔진 → Task 2. §7 롤 → Task 3+6. §8 시트 → Task 5+6. §9 검증 → 각 태스크 + Task 6 Step 9. §10 보류 항목은 필드만(Task 4) — 구현 안 함.
- **Placeholder scan:** TBD/TODO 없음. 모든 코드 스텝에 완전한 코드.
- **Type consistency:** `computeTable(state)`의 state 키(`owned/domain/scarDomains/wrap`)가 Task 2 정의 ↔ Task 5/6 호출 일치. 반환 셀 키(`name/index/value/tn/rollable/owned`)가 엔진 ↔ 템플릿 일치. `classifyRoll(d1,d2,tn)→{total,success,special,fumble,doublet}`가 Task 3 ↔ Task 6/챗템플릿 일치. 속성 key 6종(`star..dark`)이 config/datamodel/engine 전반 일치. 액션명 `toggleSkill`/`rollSpecialty`가 시트 actions ↔ 템플릿 data-action 일치.
