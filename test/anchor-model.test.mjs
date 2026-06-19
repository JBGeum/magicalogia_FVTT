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

describe("AnchorDataModel", () => {
  it("핵심 필드를 포함한다", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    const s = AnchorDataModel.defineSchema();
    for (const key of ["fate", "attr", "encumbrance", "scar"]) {
      expect(Object.keys(s)).toContain(key);
    }
  });
  it("base 스키마(description)를 상속한다 — 설정은 description 사용", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    expect(Object.keys(AnchorDataModel.defineSchema())).toContain("description");
  });
  it("별도 setting 필드는 두지 않는다", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    expect(Object.keys(AnchorDataModel.defineSchema())).not.toContain("setting");
  });
  it("fate는 운명점 — NumberField에 정수 기본 0", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    const s = AnchorDataModel.defineSchema();
    expect(s.fate).toBeInstanceOf(foundry.data.fields.NumberField);
    expect(s.fate.options.initial).toBe(0);
  });
  it("encumbrance/scar는 BooleanField 기본 false", async () => {
    const { AnchorDataModel } = await import("../module/data/items/anchor.mjs");
    const s = AnchorDataModel.defineSchema();
    expect(s.encumbrance.options.initial).toBe(false);
    expect(s.scar.options.initial).toBe(false);
  });
});
