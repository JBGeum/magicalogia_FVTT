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
