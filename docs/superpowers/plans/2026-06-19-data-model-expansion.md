# 데이터 모델 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시트 개편 로드맵 ①단계 — 헤더/정보 탭이 의존할 신규 필드(`effectType`, `gender`, `age`, `trueFormRevealed`)와 datalist 추천목록 상수를 데이터 모델에 추가하고 `genderAge`를 마이그레이션한다.

**Architecture:** Foundry v13 `TypeDataModel` 스키마 확장. 상수는 `config.mjs`(CONFIG.MAGICALOGIA 단일 출처)에 두고, 모델은 이를 import해 choices로 사용한다. 기존값 호환은 `CharacterDataModel.migrateData`로 처리한다.

**Tech Stack:** Foundry VTT v13 DataModel, ES modules(.mjs), vitest(`foundry.data.fields` FakeField 모킹).

## Global Constraints

- 커밋 메시지: **영어 한 줄, co-author/trailer 없음**(메모리 `commit-message-style`).
- 테스트: vitest. DataModel 테스트는 `foundry`를 `beforeAll`에서 FakeField로 모킹(기존 `test/character-model.test.mjs` 패턴 그대로).
- 주석/문서 문자열: 기존 코드와 동일하게 **한국어** 유지.
- config 단일 출처: 선택지 배열은 `module/helpers/config.mjs`에만 정의하고 모델은 import.
- 신규 코드만 변경. 무관한 리팩토링 금지.

---

## File Structure

- `module/helpers/config.mjs` — `CAREER_OPTIONS`, `ORG_OPTIONS`, `EFFECT_TYPES` 상수 추가.
- `module/data/actors/character.mjs` — 신규 필드 추가, `genderAge` 제거, `migrateData` 추가, config import.
- `test/config.test.mjs` — 신규 상수 검증.
- `test/character-model.test.mjs` — 신규 필드/제거/마이그레이션 검증, 모킹에 `migrateData` 추가.

---

## Task 1: config 상수 추가 (datalist 추천목록 + 효과종류)

**Files:**

- Modify: `module/helpers/config.mjs` (현재 70-73행 근처, 기존 select 옵션 블록 뒤)
- Test: `test/config.test.mjs`

**Interfaces:**

- Produces:
  - `MAGICALOGIA.CAREER_OPTIONS: string[]`
  - `MAGICALOGIA.ORG_OPTIONS: string[]`
  - `MAGICALOGIA.EFFECT_TYPES: string[]` — `["없음","지속","순간","장면"]`, 0번이 기본값

- [ ] **Step 1: 실패하는 테스트 작성**

`test/config.test.mjs`의 `describe("MAGICALOGIA config", ...)` 안 마지막 `it` 뒤에 추가:

```js
it("효과종류는 없음/지속/순간/장면 4종", () => {
  expect(MAGICALOGIA.EFFECT_TYPES).toEqual(["없음", "지속", "순간", "장면"]);
});
it("경력/기관 datalist 추천목록을 제공한다", () => {
  expect(Array.isArray(MAGICALOGIA.CAREER_OPTIONS)).toBe(true);
  expect(MAGICALOGIA.CAREER_OPTIONS.length).toBeGreaterThan(0);
  expect(Array.isArray(MAGICALOGIA.ORG_OPTIONS)).toBe(true);
  expect(MAGICALOGIA.ORG_OPTIONS.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/config.test.mjs`
Expected: FAIL — `MAGICALOGIA.EFFECT_TYPES` is undefined.

- [ ] **Step 3: 상수 구현**

`module/helpers/config.mjs`의 `MAGICALOGIA.anchorAttrs = ...` 줄 뒤(70행 다음)에 추가:

```js
// 헤더 식별 datalist 추천목록(자유 입력 허용 — 목록은 가이드일 뿐).
MAGICALOGIA.CAREER_OPTIONS = ["서경", "주화", "야행"];
MAGICALOGIA.ORG_OPTIONS = ["마탑", "결사"];

// 효과 지속 종류 select(고정 choices). 0번이 기본값.
MAGICALOGIA.EFFECT_TYPES = ["없음", "지속", "순간", "장면"];
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/config.test.mjs`
Expected: PASS (기존 5개 + 신규 2개).

- [ ] **Step 5: 커밋**

```bash
git add module/helpers/config.mjs test/config.test.mjs
git commit -m "feat: add career/org datalist and effect-type constants"
```

---

## Task 2: 신규 필드 추가 + genderAge 제거

**Files:**

- Modify: `module/data/actors/character.mjs` (상단 import; 식별 필드 블록 34-43행)
- Test: `test/character-model.test.mjs`

**Interfaces:**

- Consumes: `MAGICALOGIA.EFFECT_TYPES` (Task 1)
- Produces: `CharacterDataModel.defineSchema()`에 `gender`, `age`, `trueFormRevealed`, `effectType` 키 존재; `genderAge` 키 부재. `effectType.options.choices === MAGICALOGIA.EFFECT_TYPES`, `effectType.options.initial === "없음"`.

- [ ] **Step 1: 실패하는 테스트 작성**

`test/character-model.test.mjs`에서 기존 `it("시안 식별 9필드를 포함한다", ...)`의 키 배열을 아래로 **교체**(`genderAge` 제거, `gender`/`age` 추가):

```js
it("시안 식별 필드를 포함한다", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  const s = CharacterDataModel.defineSchema();
  for (const key of [
    "tempName",
    "career",
    "magicName",
    "organization",
    "player",
    "socialStatus",
    "gender",
    "age",
    "trueForm",
    "trueFormRevealed",
    "effect",
    "effectType",
  ]) {
    expect(Object.keys(s)).toContain(key);
  }
});
```

그리고 같은 `describe` 안 마지막에 신규 테스트 추가:

```js
it("genderAge는 더 이상 스키마에 없다", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  expect(Object.keys(CharacterDataModel.defineSchema())).not.toContain("genderAge");
});
it("effectType은 EFFECT_TYPES choices와 '없음' 기본값을 가진다", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  const { MAGICALOGIA } = await import("../module/helpers/config.mjs");
  const s = CharacterDataModel.defineSchema();
  expect(s.effectType.options.choices).toEqual(MAGICALOGIA.EFFECT_TYPES);
  expect(s.effectType.options.initial).toBe("없음");
});
it("trueFormRevealed는 BooleanField이며 기본 false", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  const s = CharacterDataModel.defineSchema();
  expect(s.trueFormRevealed).toBeInstanceOf(foundry.data.fields.BooleanField);
  expect(s.trueFormRevealed.options.initial).toBe(false);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/character-model.test.mjs`
Expected: FAIL — `s.effectType` undefined, `genderAge` still present.

- [ ] **Step 3: 모델 구현**

`module/data/actors/character.mjs` 1행 `import { BaseActorModel } ...` 아래에 config import 추가:

```js
import { MAGICALOGIA } from "../../helpers/config.mjs";
```

식별 필드 블록(현재 34-43행)을 아래로 교체. `genderAge` 줄을 빼고 `gender`/`age`/`trueFormRevealed`/`effectType`를 넣는다:

```js
      // 시안 헤더 식별 필드
      tempName: new fields.StringField({ initial: "" }),
      career: new fields.StringField({ initial: "" }),
      magicName: new fields.StringField({ initial: "" }),
      organization: new fields.StringField({ initial: "" }),
      player: new fields.StringField({ initial: "" }),
      socialStatus: new fields.StringField({ initial: "" }),
      gender: new fields.StringField({ initial: "" }),
      age: new fields.StringField({ initial: "" }),
      trueForm: new fields.StringField({ initial: "" }),
      trueFormRevealed: new fields.BooleanField({ initial: false }),
      effect: new fields.StringField({ initial: "" }),
      // choices에 "없음"이 포함되므로 blank:true 불필요(initial이 choices 내).
      effectType: new fields.StringField({ initial: "없음", choices: MAGICALOGIA.EFFECT_TYPES }),
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/character-model.test.mjs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add module/data/actors/character.mjs test/character-model.test.mjs
git commit -m "feat: split gender/age and add effectType, trueFormRevealed fields"
```

---

## Task 3: genderAge → gender 마이그레이션

**Files:**

- Modify: `module/data/actors/character.mjs` (`defineSchema` 메서드 뒤에 `migrateData` 추가)
- Test: `test/character-model.test.mjs` (`beforeAll` 모킹에 `migrateData` 추가)

**Interfaces:**

- Produces: `CharacterDataModel.migrateData(source)` — `source.genderAge`가 truthy이고 `source.gender`가 비어 있으면 `gender`로 이관, `genderAge` 키 삭제 후 반환.

- [ ] **Step 1: 실패하는 테스트 작성 (+ 모킹 보강)**

`test/character-model.test.mjs`의 `beforeAll` 안 `abstract` 모킹을 아래로 교체(super.migrateData 대비):

```js
    abstract: { TypeDataModel: class { static migrateData(s) { return s; } } },
```

`describe` 안 마지막에 추가:

```js
it("genderAge를 gender로 마이그레이션하고 키를 제거한다", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  const out = CharacterDataModel.migrateData({ genderAge: "남/20" });
  expect(out.gender).toBe("남/20");
  expect(out.genderAge).toBeUndefined();
});
it("gender가 이미 있으면 genderAge로 덮어쓰지 않는다", async () => {
  const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
  const out = CharacterDataModel.migrateData({ genderAge: "남", gender: "여" });
  expect(out.gender).toBe("여");
  expect(out.genderAge).toBeUndefined();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/character-model.test.mjs`
Expected: FAIL — `CharacterDataModel.migrateData is not a function`.

- [ ] **Step 3: migrateData 구현**

`module/data/actors/character.mjs`의 `defineSchema()` 메서드 닫는 `}` 뒤(클래스 안)에 추가:

```js
  /** 구버전 genderAge 단일 필드를 gender로 이관(개발 초기 데이터 호환). */
  static migrateData(source) {
    if (source.genderAge && !source.gender) {
      source.gender = source.genderAge;
    }
    delete source.genderAge;
    return super.migrateData(source);
  }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/character-model.test.mjs`
Expected: PASS.

- [ ] **Step 5: 전체 테스트 + 빌드 확인 후 커밋**

```bash
npx vitest run
npm run build
git add module/data/actors/character.mjs test/character-model.test.mjs
git commit -m "feat: migrate legacy genderAge to gender field"
```

Expected: 전체 테스트 통과(기존 31 + 신규), 빌드 성공.

---

## Self-Review

- **Spec 커버리지**: spec ① 항목 전부 매핑됨 — config 상수(Task 1), effectType/gender/age/trueFormRevealed + genderAge 제거(Task 2), 마이그레이션(Task 3), 테스트(각 Task). `career`/`organization` StringField 유지는 변경 없음이라 별도 작업 없음(정상). `soulSkill` 표시는 ②(헤더 개편) 범위라 본 plan 밖.
- **Placeholder 스캔**: 없음. `CAREER_OPTIONS`/`ORG_OPTIONS`는 시안 값으로 확정(datalist라 자유 입력 허용 — 추후 룰북 기준 보강 가능, 모델 변경 불필요).
- **타입 일관성**: `EFFECT_TYPES`(Task 1)를 Task 2의 `effectType.choices`에서 동일 참조. `migrateData`(Task 3) 시그니처 일관. 모킹의 `TypeDataModel.migrateData` 추가로 `super.migrateData` 호출 정합.
