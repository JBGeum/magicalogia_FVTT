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

describe("FamiliarDataModel", () => {
  it("원형 고유 필드를 포함한다", async () => {
    const { FamiliarDataModel } = await import("../module/data/actors/familiar.mjs");
    const s = FamiliarDataModel.defineSchema();
    for (const key of [
      "hasBlock",
      "boostCount",
      "tempHealthGrant",
      "attr",
      "nameTemplate",
      "features",
    ]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("base 스키마(health, biography)를 상속한다", async () => {
    const { FamiliarDataModel } = await import("../module/data/actors/familiar.mjs");
    const keys = Object.keys(FamiliarDataModel.defineSchema());
    expect(keys).toContain("health");
    expect(keys).toContain("biography");
  });
  it("hasBlock 기본값은 false다", async () => {
    const { FamiliarDataModel } = await import("../module/data/actors/familiar.mjs");
    expect(FamiliarDataModel.defineSchema().hasBlock.options.initial).toBe(false);
  });
  it("attr은 6속성 + blank choices를 가진다", async () => {
    const { FamiliarDataModel } = await import("../module/data/actors/familiar.mjs");
    expect(FamiliarDataModel.defineSchema().attr.options.choices).toEqual([
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
