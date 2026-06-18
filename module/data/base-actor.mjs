const fields = foundry.data.fields;

/**
 * 모든 Actor 타입이 공유하는 공통 스키마. 보일러플레이트 단계의 최소 필드.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class BaseActorModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 10, min: 0, integer: true }),
        min: new fields.NumberField({ initial: 0, integer: true }),
        max: new fields.NumberField({ initial: 10, integer: true }),
      }),
      biography: new fields.HTMLField({ initial: "" }),
    };
  }
}
