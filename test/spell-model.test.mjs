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
      "tn",
      "cost",
      "charge",
      "mod",
      "sealed",
      "recite",
      "effect",
      "invocation",
      "ruby",
      "archetypeUuid",
      "archetypeVarAttr",
    ]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("active(장비/유효)는 더 이상 스키마에 없다 — sealed(봉인)로 대체", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    expect(Object.keys(SpellDataModel.defineSchema())).not.toContain("active");
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
  it("tn 기본값은 5다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const s = SpellDataModel.defineSchema();
    expect(s.tn.options.initial).toBe(5);
  });
  it("archetypeUuid / archetypeVarAttr 필드를 가진다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    const s = SpellDataModel.defineSchema();
    expect(Object.keys(s)).toContain("archetypeUuid");
    expect(Object.keys(s)).toContain("archetypeVarAttr");
  });
  it("archetypeVarAttr은 blank + 6속성 choices다", async () => {
    const { SpellDataModel } = await import("../module/data/items/spell.mjs");
    expect(SpellDataModel.defineSchema().archetypeVarAttr.options.choices).toEqual([
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
