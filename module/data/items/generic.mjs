import { BaseItemModel } from "../base-item.mjs";

/**
 * generic 아이템 데이터 모델. 현 단계는 공통 스키마 상속만 — 향후 아이템 타입 분화의 기준.
 */
export class GenericItemDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
    };
  }
}
