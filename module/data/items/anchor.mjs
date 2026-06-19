import { BaseItemModel } from "../base-item.mjs";

const fields = foundry.data.fields;

/**
 * 관계(앵커) Item 데이터 모델. 이름은 Item.name, 설정은 상속 description 사용.
 * fate=운명점(숫자), encumbrance=중하(重荷), scar=스카(疵).
 */
export class AnchorDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      fate: new fields.NumberField({ initial: 0, integer: true }),
      attr: new fields.StringField({ initial: "" }),
      encumbrance: new fields.BooleanField({ initial: false }),
      scar: new fields.BooleanField({ initial: false }),
    };
  }
}
