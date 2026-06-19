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
  it("skills 각 열은 ArrayField다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const s = CharacterDataModel.defineSchema();
    const ArrayField = foundry.data.fields.ArrayField;
    for (const key of ["star", "beast", "force", "song", "dream", "dark"]) {
      expect(s.skills.fields[key]).toBeInstanceOf(ArrayField);
    }
  });
  it("시안 식별 9필드를 포함한다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const s = CharacterDataModel.defineSchema();
    for (const key of [
      "tempName",
      "career",
      "magicName",
      "organization",
      "player",
      "socialStatus",
      "genderAge",
      "trueForm",
      "effect",
    ]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("base 스키마(biography)를 상속한다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    expect(Object.keys(CharacterDataModel.defineSchema())).toContain("biography");
  });
  // 회귀 가드: choices가 있는 StringField는 blank를 기본 거부 — domain은 "" 초기값을 허용해야 액터 생성이 된다.
  it("domain은 빈 문자열을 허용한다(blank:true)", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const s = CharacterDataModel.defineSchema();
    expect(s.domain.options.blank).toBe(true);
  });
  it("spells 항목은 active boolean 필드를 가진다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const s = CharacterDataModel.defineSchema();
    const spellSchema = s.spells.element.fields;
    expect(Object.keys(spellSchema)).toContain("active");
  });
});
