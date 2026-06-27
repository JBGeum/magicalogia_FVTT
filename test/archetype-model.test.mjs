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
        SchemaField: class extends FakeField {
          constructor(schema, opts) {
            super(opts);
            this.fields = schema;
          }
        },
      },
    },
    abstract: {
      TypeDataModel: class {
        static migrateData(s) {
          return s;
        }
      },
    },
  };
});

describe("ArchetypeDataModel", () => {
  it("원형 고유 필드를 포함한다", async () => {
    const { ArchetypeDataModel } = await import("../module/data/actors/archetype.mjs");
    const s = ArchetypeDataModel.defineSchema();
    for (const key of ["hasBlock", "level", "attr", "nameTemplate", "features"]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("base 스키마(health, biography)를 상속한다", async () => {
    const { ArchetypeDataModel } = await import("../module/data/actors/archetype.mjs");
    const keys = Object.keys(ArchetypeDataModel.defineSchema());
    expect(keys).toContain("health");
    expect(keys).toContain("biography");
  });
  it("hasBlock 기본값은 false다", async () => {
    const { ArchetypeDataModel } = await import("../module/data/actors/archetype.mjs");
    expect(ArchetypeDataModel.defineSchema().hasBlock.options.initial).toBe(false);
  });
  it("attr은 6속성 + blank choices를 가진다", async () => {
    const { ArchetypeDataModel } = await import("../module/data/actors/archetype.mjs");
    expect(ArchetypeDataModel.defineSchema().attr.options.choices).toEqual([
      "",
      "star",
      "beast",
      "force",
      "song",
      "dream",
      "dark",
    ]);
  });
});
