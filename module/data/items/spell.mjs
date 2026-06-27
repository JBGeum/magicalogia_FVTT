import { BaseItemModel } from "../base-item.mjs";
import { MAGICALOGIA } from "../../helpers/config.mjs";

const fields = foundry.data.fields;

/**
 * 장서(마법) Item 데이터 모델. 이름은 Item.name 사용.
 * 액터 시트 장서 탭은 목록·빠른 토글만, 본문 편집은 이 item sheet에서.
 */
export class SpellDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new fields.StringField({
        initial: "",
        blank: true,
        choices: ["", ...MAGICALOGIA.spellTypes],
      }),
      skill: new fields.StringField({ initial: "" }),
      target: new fields.StringField({ initial: "" }),
      tn: new fields.NumberField({ initial: 5, min: 2, integer: true }),
      cost: new fields.SchemaField({
        // ""(미선택)을 허용해야 하므로 blank:true.
        area: new fields.StringField({
          initial: "",
          blank: true,
          choices: MAGICALOGIA.COST_AREAS.map((a) => a.value),
        }),
        count: new fields.NumberField({ initial: 0, min: 0, integer: true }),
      }),
      charge: new fields.NumberField({ initial: 0, min: 0, max: 6, integer: true }),
      mod: new fields.NumberField({ initial: 0, integer: true }),
      active: new fields.BooleanField({ initial: false }),
      recite: new fields.BooleanField({ initial: false }),
      effect: new fields.StringField({ initial: "" }),
      // 소환 장서: 비면 일반 장서, UUID 있으면 원형(archetype) 소환 대상.
      archetypeUuid: new fields.StringField({ initial: "" }),
      // 가변 특기 소환의 고정 영역(속성 key). 비면 완전 가변(1d6로 영역도 결정).
      archetypeVarAttr: new fields.StringField({
        initial: "",
        blank: true,
        choices: ["", "star", "beast", "force", "song", "dream", "dark"],
      }),
    };
  }
}
