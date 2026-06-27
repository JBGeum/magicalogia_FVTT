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
    abstract: {
      TypeDataModel: class {
        static migrateData(s) {
          return s;
        }
      },
    },
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
  it("시안 식별 필드를 포함한다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const s = CharacterDataModel.defineSchema();
    for (const key of [
      "career",
      "magicName",
      "organon",
      "player",
      "socialStatus",
      "gender",
      "age",
      "trueForm",
      "trueFormRevealed",
      "effect",
      "readingCircle",
      "memo",
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
  it("genderAge는 더 이상 스키마에 없다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    expect(Object.keys(CharacterDataModel.defineSchema())).not.toContain("genderAge");
  });
  it("effectType은 더 이상 스키마에 없다(텍스트 효과로 단순화)", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    expect(Object.keys(CharacterDataModel.defineSchema())).not.toContain("effectType");
  });
  it("trueFormRevealed는 BooleanField이며 기본 false", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const s = CharacterDataModel.defineSchema();
    expect(s.trueFormRevealed).toBeInstanceOf(foundry.data.fields.BooleanField);
    expect(s.trueFormRevealed.options.initial).toBe(false);
  });
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
  it("organization을 organon으로, rank를 stage로 마이그레이션하고 옛 키를 제거한다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const out = CharacterDataModel.migrateData({ organization: "원탁", rank: 3 });
    expect(out.organon).toBe("원탁");
    expect(out.stage).toBe(3);
    expect(out.organization).toBeUndefined();
    expect(out.rank).toBeUndefined();
  });
  it("organon/stage가 이미 있으면 옛 키로 덮어쓰지 않는다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const out = CharacterDataModel.migrateData({
      organization: "원탁",
      organon: "학원",
      rank: 3,
      stage: 5,
    });
    expect(out.organon).toBe("학원");
    expect(out.stage).toBe(5);
  });
  it("organization/rank는 더 이상 스키마에 없다(organon/stage로 이관)", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const keys = Object.keys(CharacterDataModel.defineSchema());
    expect(keys).not.toContain("organization");
    expect(keys).not.toContain("rank");
    expect(keys).toContain("organon");
    expect(keys).toContain("stage");
  });
  it("spells/anchors는 더 이상 액터 스키마에 없다(Item으로 이관)", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const keys = Object.keys(CharacterDataModel.defineSchema());
    expect(keys).not.toContain("spells");
    expect(keys).not.toContain("anchors");
  });
});
