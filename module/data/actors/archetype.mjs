import { BaseActorModel } from "../base-actor.mjs";

const fields = foundry.data.fields;

const ATTR_KEYS = ["star", "beast", "force", "song", "dream", "dark"];

/**
 * 원형(archetype) 액터 데이터 모델 — 유형별 마스터 statblock(경량).
 * 체력/설정은 BaseActorModel(health, biography) 상속. 블록(health)은 원형 HP이자
 * 캐릭터에게 주는 임시 체력. boostCount는 부스트 가능 다이스 수. 모두 표시용(자동 반영 없음).
 * features는 고유 기능 설명(표시만).
 */
export class ArchetypeDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // false면 블록 없는 원형 — 마스터 prototypeToken bar를 비워 HP 바 미표시.
      hasBlock: new fields.BooleanField({ initial: false }),
      // 부스트 가능 다이스 수.
      boostCount: new fields.NumberField({ initial: 0, min: 0, integer: true }),
      attr: new fields.StringField({ initial: "", blank: true, choices: ["", ...ATTR_KEYS] }),
      // 토큰명 템플릿. 비면 마스터명 그대로, "{skill}" 치환.
      nameTemplate: new fields.StringField({ initial: "" }),
      features: new fields.HTMLField({ initial: "" }),
    };
  }
}
