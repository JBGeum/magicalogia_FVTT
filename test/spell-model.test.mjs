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

describe("SpellDataModel", () => {
  it("핵심 필드를 포함한다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const s = SpellDataModel.defineSchema();
    for (const key of [
      "type",
      "skill",
      "target",
      "cost",
      "charge",
      "mod",
      "active",
      "recite",
      "effect",
    ]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("base 스키마(description)를 상속한다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    expect(Object.keys(SpellDataModel.defineSchema())).toContain("description");
  });
  it("cost는 area/count SchemaField다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const s = SpellDataModel.defineSchema();
    expect(Object.keys(s.cost.fields)).toEqual(["area", "count"]);
  });
  it("cost.area는 COST_AREAS 값 choices를 가진다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const { MAGICALOGIA } = await import("../module/helpers/config.mjs");
    const s = SpellDataModel.defineSchema();
    expect(s.cost.fields.area.options.choices).toEqual(MAGICALOGIA.COST_AREAS.map((a) => a.value));
  });
  it("charge 기본값은 0이다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const s = SpellDataModel.defineSchema();
    expect(s.charge.options.initial).toBe(0);
  });
  it("name 필드는 system에 두지 않는다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    expect(Object.keys(SpellDataModel.defineSchema())).not.toContain("name");
  });
});
