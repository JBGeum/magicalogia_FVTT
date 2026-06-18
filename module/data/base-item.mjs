const fields = foundry.data.fields;

/**
 * 모든 Item 타입이 공유하는 공통 스키마.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class BaseItemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}
