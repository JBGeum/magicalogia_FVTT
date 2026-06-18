import { describe, it, expect, beforeAll } from "vitest";

// Foundry 런타임 전역 최소 스텁 — defineSchema가 참조하는 필드 팩토리만 모킹.
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
      // TypeDataModel을 단순 베이스로 스텁.
      TypeDataModel: class {},
    },
  };
});

describe("DataModels", () => {
  it("BaseActorModel 스키마에 health·biography가 있다", async () => {
    const { BaseActorModel } = await import("../module/data/base-actor.mjs");
    const schema = BaseActorModel.defineSchema();
    expect(Object.keys(schema)).toEqual(expect.arrayContaining(["health", "biography"]));
    expect(Object.keys(schema.health.fields)).toEqual(
      expect.arrayContaining(["value", "min", "max"]),
    );
  });

  it("CharacterDataModel은 base 스키마를 상속한다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const schema = CharacterDataModel.defineSchema();
    expect(Object.keys(schema)).toEqual(expect.arrayContaining(["health", "biography"]));
  });

  it("BaseItemModel 스키마에 description이 있다", async () => {
    const { BaseItemModel } = await import("../module/data/base-item.mjs");
    expect(Object.keys(BaseItemModel.defineSchema())).toContain("description");
  });

  it("GenericItemDataModel은 base 스키마를 상속한다", async () => {
    const { GenericItemDataModel } = await import("../module/data/items/generic.mjs");
    expect(Object.keys(GenericItemDataModel.defineSchema())).toContain("description");
  });
});
