import { BaseActorModel } from "../base-actor.mjs";

const fields = foundry.data.fields;

const ATTR_KEYS = ["star", "beast", "force", "song", "dream", "dark"];

/** 한 속성 열의 보유 특기(boolean[11]). */
const skillColumn = () =>
  new fields.ArrayField(new fields.BooleanField({ initial: false }), {
    initial: () => Array(11).fill(false),
  });

/** 속성별 boolean 묶음(소속/상흔/스킬 공통 헬퍼). */
const attrSchema = (factory) =>
  new fields.SchemaField(Object.fromEntries(ATTR_KEYS.map((k) => [k, factory()])));

/**
 * character 액터 데이터 모델 — 마기카로기아 전체 스키마.
 * 특기표 판정 슬라이스가 쓰는 필드 외에는 자리만 둔다(장서/관계/게이지 등).
 */
export class CharacterDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),

      // 특기표
      skills: attrSchema(skillColumn),
      domain: new fields.StringField({ initial: "", choices: ["", ...ATTR_KEYS] }),
      scarDomains: attrSchema(() => new fields.BooleanField({ initial: false })),
      horizontalWrap: new fields.BooleanField({ initial: false }),
      soulSkill: new fields.StringField({ initial: "" }),
      variableSkill: new fields.StringField({ initial: "" }),

      // 능력치 (슬라이스에선 표시만)
      abilities: new fields.SchemaField({
        attack: new fields.NumberField({ initial: 0, integer: true }),
        defense: new fields.NumberField({ initial: 0, integer: true }),
        source: new fields.NumberField({ initial: 0, integer: true }),
      }),
      rank: new fields.NumberField({ initial: 1, integer: true }),

      // 마력/카운터
      mp: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0, integer: true }),
        max: new fields.NumberField({ initial: 0, integer: true }),
      }),
      tempMp: new fields.NumberField({ initial: 0, integer: true }),
      achievement: new fields.NumberField({ initial: 0, integer: true }),
      mabloom: new fields.NumberField({ initial: 0, integer: true }),

      // 상태이상
      statuses: new fields.SchemaField(
        Object.fromEntries(
          ["seal", "burn", "weak", "plague", "block", "misfortune", "death", "vanish"].map((k) => [
            k,
            new fields.BooleanField({ initial: false }),
          ]),
        ),
      ),

      // 장서(spell) — 필드만
      spells: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ initial: "" }),
          type: new fields.StringField({ initial: "" }),
          skill: new fields.StringField({ initial: "" }),
          target: new fields.StringField({ initial: "" }),
          cost: new fields.StringField({ initial: "" }),
          charge: new fields.NumberField({ initial: 0, integer: true }),
          mod: new fields.NumberField({ initial: 0, integer: true }),
          recite: new fields.BooleanField({ initial: false }),
          effect: new fields.StringField({ initial: "" }),
        }),
      ),

      // 관계(anchor) — 필드만
      anchors: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ initial: "" }),
          fate: new fields.NumberField({ initial: 0, integer: true }),
          attr: new fields.StringField({ initial: "" }),
          checked: new fields.BooleanField({ initial: false }),
        }),
      ),

      mission: new fields.StringField({ initial: "" }),
      collection: new fields.StringField({ initial: "" }),
    };
  }
}
