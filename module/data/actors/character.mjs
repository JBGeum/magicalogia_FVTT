import { BaseActorModel } from "../base-actor.mjs";
import { MAGICALOGIA } from "../../helpers/config.mjs";

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
      // choices를 주면 Foundry StringField가 blank를 기본 거부하므로 blank:true로 "" (영역 미선택) 허용.
      domain: new fields.StringField({ initial: "", blank: true, choices: ["", ...ATTR_KEYS] }),
      horizontalWrap: new fields.BooleanField({ initial: false }),
      soulSkill: new fields.StringField({ initial: "" }),
      variableSkill: new fields.StringField({ initial: "" }),

      // 시안 헤더 식별 필드 — '임시 이름'은 문서 name(표시명)으로 직접 편집한다.
      career: new fields.StringField({ initial: "" }),
      magicName: new fields.StringField({ initial: "" }),
      organization: new fields.StringField({ initial: "" }),
      player: new fields.StringField({ initial: "" }),
      socialStatus: new fields.StringField({ initial: "" }),
      gender: new fields.StringField({ initial: "" }),
      age: new fields.StringField({ initial: "" }),
      trueForm: new fields.StringField({ initial: "" }),
      trueFormRevealed: new fields.BooleanField({ initial: false }),
      effect: new fields.StringField({ initial: "" }),
      // choices에 "없음"이 포함되므로 blank:true 불필요(initial이 choices 내).
      effectType: new fields.StringField({ initial: "없음", choices: MAGICALOGIA.EFFECT_TYPES }),

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

      mission: new fields.StringField({ initial: "" }),
      collection: new fields.StringField({ initial: "" }),
    };
  }

  /** 구버전 genderAge 단일 필드를 gender로 이관(개발 초기 데이터 호환). */
  static migrateData(source) {
    if (source.genderAge && !source.gender) {
      source.gender = source.genderAge;
    }
    delete source.genderAge;
    return super.migrateData(source);
  }
}
