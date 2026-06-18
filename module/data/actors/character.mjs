import { BaseActorModel } from "../base-actor.mjs";

/**
 * character 액터 데이터 모델. 현 단계는 공통 스키마 상속만 — 마기카로기아 고유 필드의 확장 지점.
 */
export class CharacterDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
    };
  }
}
