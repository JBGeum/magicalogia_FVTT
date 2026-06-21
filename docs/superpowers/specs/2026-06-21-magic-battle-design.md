# 설계 — 마법전 (다이스 대결) (2026-06-21)

> 시안: `docs/design/마법전/`(README·`example-battle.html`·`chat-battle-card.hbs`·`chat-boost-card.hbs`·`magicalogia-battlecard.css`·`scripts/chat-card-helpers.js`).
> 워크플로: brainstorming → **이 spec** → writing-plans → subagent-driven-development.
>
> **⚠️ 정정 (2026-06-21 F5 후, 커밋 `3385f15`)**: 본문은 "다이스 수 = 근원력(`abilities.source`)"으로
> 기술하나, F5에서 **공격 다이스 수 = 공격력(`abilities.attack`), 방어 다이스 수 = 방어력(`abilities.defense`)**
> 로 정정함. **부스트 n은 상한 없음(자유 입력)** — `abilities.source`는 마법전에서 미사용.
> 아래 §1·§2·§3·§4·§5.3·§9의 "근원력/source" 언급은 이 정정으로 대체됨.
>
> **⚠️ 정정 2 (2026-06-21 F5 후, 커밋 `de9b0d7`)**: 대미지는 **생명력(`health.value`)이 아니라
> 마력(`mp.value`)에 적용**한다(`Math.max(0,…)` 하한). 전투 카드 결과는 "**N 대미지**"만 표시(이전
> "공격 유효 N → …" 문구 제거). 적용 시 **마력 변동 compact 한줄 카드**(`mp-damage-card.hbs`,
> `.mg-mpd`: "{who}의 마력 N 감소 · before → after")를 발행. §2·§5.1·§9의 "health/생명력" 언급은 마력으로 대체됨.
>
> **➕ 추가 룰: 집중 방어 (2026-06-21 F5, 커밋 `744d0a9`)**: 방어 역할 & **방어력 ≥ 3**일 때 다이스
> 다이얼로그에 **`0`(집중)** 버튼 노출. 선택 = **`[0, X]`**(0 + 눈 1개)만. 효과: 공격 다이스 중
> **눈 X는 개수 무관 전부 상쇄**, 나머지 = 대미지. `resolveExchange`가 `defense.includes(0)` 분기로
> 처리하고 `focus`(X|null) 반환. 카드: 방어측 "집중 ✦X" 배지 + focus 다이스. 전투당 방어자 각자 사용
> 가능(양방향). **알려진 한계**: 공격측 부스트 vs 집중방어 방어자일 때 boost `struck`이 focus를 반영
> 안 함(표시 전용이라 GM 판단; 방어측 부스트·일반 상쇄는 정상).

## 1. 목표

GM이 **GM 패널 > 마법전**에서 선공/후공 인물을 지정하고 마법전을 개시한다. 각 측은 **근원력(`abilities.source`)만큼의 다이스(눈 1~6)를 직접 골라**(굴림 아님, 심리전) 숨긴 뒤, GM의 **공개**로 채팅 카드를 발행한다. 공격 다이스는 방어 다이스와 같은 눈을 **1:1 상쇄**당하고, 남은 공격 다이스 수만큼 방어측에게 대미지를 준다. 부스트로 **nD6 추가 굴림**을 가산 표시할 수 있다.

브레인스토밍 결정에 따라 **소켓(`game.socket`) 멀티플레이어 + 부스트까지 한 스펙(일괄)**으로 구현한다.

## 2. 범위

### 포함

- **씬 컨트롤 GM 전용 버튼** → 마법전 전용 패널(ApplicationV2).
- 선공/후공 **액터 지정** + NPC/PC 판별(소켓 vs GM 대리) + **근원력 표시**.
- **1라운드 = 양방향 2교전 자동**: ① 선공=공격·후공=방어, ② 후공=공격·선공=방어.
- **방향별 선택(1인 2회/라운드)**: 교전마다 공격자=공격 다이스, 방어자=방어 다이스를 각각 0~근원력개 선택(눈 1~6, 중복 허용, 숨김).
- PC 다이스 선택: **소켓으로 PL 클라이언트에 다이얼로그 자동 팝업** → 응답을 GM이 취합·은닉.
- NPC 다이스 선택: **GM 로컬 다이얼로그**.
- **공개**(GM 패널 버튼) → 공개된 전투 카드 발행: **공격/방어 비대칭 1:1 상쇄**, 유효 공격 다이스 수 = 대미지.
- **대미지 적용**: 카드의 **GM 전용 적용 버튼** → 방어측 `health.value` 차감(멱등).
- **부스트(표시 전용)**: 해당 측 소유자(PC는 소켓)가 nD6 굴림 → 이전 결과의 상대 잔여 다이스와 1:1 상쇄(`struck`) 표시. **자동 합산 없음**.
- 순수 해결 로직 단위 테스트.

### 제외 (YAGNI / 후속)

- **HP 0까지 다회 라운드 자동 루프**: 1라운드 단위. 다음 라운드는 GM이 재개시.
- **인-챗 숨김→공개 토글 카드**: 공개는 GM 패널 버튼으로. 은닉은 패널/다이얼로그 단계에서 끝나므로 인-챗에 숨김 값 미기록(피킹 방지). 시안의 인-챗 reveal 토글은 향후 후보.
- **부스트 자동 대미지 재계산**: 시안 README대로 표시 전용. GM이 판단.
- **진행 상태 영속화**: GM 패널 인스턴스 메모리. 새로고침 시 진행 전투 소실 → 재개시.
- **마력(MP) 등 부스트 비용**: 요구사항에 없음. v1 무비용.
- **다크 테마 카드**: 채팅 카드는 라이트 고정(기존 카드 관례).

## 3. 현재 상태 (탐색 결과)

- **데이터 모델**: `module/data/actors/character.mjs` — `abilities: {attack, defense, source}`(각 NumberField, initial 0). **근원력 = `abilities.source`**(value/max 아닌 단일 수). `module/data/base-actor.mjs` — `health: {value, min, max}`(대미지 적용 대상). 액터 타입은 `character` 단일(NPC/PC는 타입이 아닌 **소유권**으로 구분).
- **챗 카드 패턴**: `module/system/spell-cast.mjs`/`spell-charge.mjs` — **순수**(`buildXCard`/`resolveSpecialtyTn`) + **Foundry 의존**(`postXCard`/`castSpell`: `foundry.applications.handlebars.renderTemplate` + `ChatMessage.create`)을 한 모듈에 둠. 카드는 **라이트 고정**.
- **다이얼로그 패턴**: `module/apps/specialty-picker.mjs` — `HandlebarsApplicationMixin(ApplicationV2)`, `static DEFAULT_OPTIONS`(classes/window/position/actions), `static PARTS`, 생성자 옵션 콜백, `_prepareContext`, `_onRender`에서 `applyTheme`, `static #onAction(event,target)` 핸들러.
- **소켓/멀티플레이어 인프라 없음**: `game.socket`/socketlib 사용 0 → 신규 도입.
- **GM 패널 없음** → 신규.
- **renderChatMessage 훅 / 카드 data-action 핸들러 없음**: 현재 카드는 정적 → 신규 패턴 도입.
- **훅 등록**: `module/magicalogia.mjs`는 현재 `Hooks.once("init", …)`만 사용. `getSceneControlButtons`/`renderChatMessage`/`ready` 훅 신규 추가.
- **템플릿 로드**: `module/helpers/templates.mjs`의 `foundry.applications.handlebars.loadTemplates([...])`(현재 25종). 신규 템플릿 등록 필수(`template-partials.test.mjs` 가드).
- **테스트**: vitest(node 환경, Foundry 비의존), `test/*.test.mjs`, `@`→`module/` alias. `test/spell-charge.test.mjs`가 `buildChargeCard` 순수 테스트 예시.
- **SCSS**: `scss/magicalogia.scss`가 `@use "component/…"` 목록. 컴포넌트는 `scss/component/_*.scss`에 `.magicalogia {}` 중첩. 토큰은 `scss/theme/_tokens.scss`(다크 `.magicalogia`, 라이트 `.magicalogia.theme-light`)에 `--mg-*` 정의 — `--mg-gold/ink/soft/faint/paper/field/line/bar/good(-bg)/bad(-bg/-line)/hi/panel-2` 등 **모두 존재** → 신규 색 토큰 0 목표.
- **시안 헬퍼**(`docs/design/마법전/scripts/chat-card-helpers.js`): `classifyBattle`(**대칭 제거** — 우리 모델과 불일치, 재작성), `renderBattleDie(v,st)`, `buildBattleCard`(대칭/winner — 재작성), `buildBoostCard`(struck 1:1 소거 — 거의 그대로 사용 가능), `renderDie`/`PIPS`(pip 그리드 — 재사용).

## 4. 게임 규칙 모델 (순수 로직)

근원력 = `abilities.source` = 한 번에 고를 수 있는 다이스 **최대 개수**.

**라운드 = 2 교전(자동 순차):**

- 교전 1 — 선공=**공격**, 후공=**방어**
- 교전 2 — 후공=**공격**, 선공=**방어**

**각 교전:**

1. 공격자 **공격 다이스** 0~N개 선택(N=근원력, 눈 1~6, 중복 허용, 숨김)
2. 방어자 **방어 다이스** 0~N개 선택(숨김)
3. 공개 → **1:1 상쇄**(멀티셋 교집합): 공격 다이스를 방어 다이스와 같은 눈끼리 1:1 매칭
   - 매칭된 공격 다이스 = `cancel`, 매칭 안 된 공격 다이스 = `valid`
   - **유효 공격 다이스 수 = 방어측 대미지**
   - 방어 다이스: 매칭 소모분 = `cancel`, 나머지 = 잔여(중립·대미지 무관)

**워크드 예시** — 공격 `[4,4,2]` vs 방어 `[4,5]`:

- 4↔4 한 쌍 → 공격 `[4=cancel, 4=valid, 2=valid]` → **유효 2 = 2 대미지**, 방어 `[4=cancel, 5=잔여]`.

**부스트(표시 전용):** 공개 후 해당 측 nD6 굴림. `struck` = 굴린 눈 중 **상대 잔여 다이스**와 1:1 매칭되는 값 → 부스트 카드에서 `cancel`, 나머지 `valid`. 자동 합산/재계산 없음(GM 판단).

- 공격측 부스트: 상대 잔여 = 방어 잔여 다이스(valid = 추가 대미지 후보).
- 방어측 부스트: 상대 잔여 = 공격 유효 다이스(매칭 = 대미지 감소 후보).

## 5. 설계 (접근법 A — 순수 로직 + 소켓 오케스트레이션)

기존 `spell-cast.mjs` 패턴(순수 + Foundry 의존 동거)과 `specialty-picker.mjs`(ApplicationV2) 패턴을 미러링한다.

### 5.1 `module/system/magic-battle.mjs` (신규)

**순수부**(Foundry 비의존, 단위 테스트):

```js
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** d6 한 면 pip 그리드 markup. 공개 카드에서 st: "valid"|"cancel"|"leftover" (시안의 "back"은 v1 미사용). */
export function renderBattleDie(v, st) {
  /* 시안 renderBattleDie 이식, leftover=중립 plain 면 */
}

/**
 * 1:1 비대칭 상쇄. 공격 다이스를 방어 다이스와 멀티셋 매칭(소모된 방어 인덱스 추적).
 * 반환: { attackMarks:[{v,st}], defenseMarks:[{v,st}], surviving:[v], damage }
 *  - attackMarks: 매칭=cancel, 미매칭=valid
 *  - defenseMarks: 매칭 소모=cancel, 나머지=leftover(중립)
 *  - surviving = valid 공격값, damage = surviving.length
 */
export function resolveExchange(attack, defense) {
  const usedIdx = new Set(); // 소모된 방어 인덱스
  const attackMarks = attack.map((v) => {
    const i = defense.findIndex((dv, idx) => dv === v && !usedIdx.has(idx));
    if (i > -1) {
      usedIdx.add(i);
      return { v, st: "cancel" };
    }
    return { v, st: "valid" };
  });
  const defenseMarks = defense.map((v, idx) =>
    usedIdx.has(idx) ? { v, st: "cancel" } : { v, st: "leftover" },
  );
  const surviving = attackMarks.filter((m) => m.st === "valid").map((m) => m.v);
  return { attackMarks, defenseMarks, surviving, damage: surviving.length };
}

/** 전투 카드 데이터(순수). revealed=true 전제(공개 시 발행). */
export function buildBattleCard({ round, exchange, attacker, defender, attack, defense }) {
  const { attackMarks, defenseMarks, damage } = resolveExchange(attack, defense);
  return {
    round,
    exchange,
    attacker,
    defender,
    damage,
    attackDiceHtml: attackMarks.map((m) => renderBattleDie(m.v, m.st)).join(""), // valid/cancel
    defenseDiceHtml: defenseMarks.map((m) => renderBattleDie(m.v, m.st)).join(""), // cancel/leftover
  };
}

/** 부스트 카드 데이터(순수). 시안 buildBoostCard 이식. struck = 상대 잔여와 1:1 소거할 값들. */
export function buildBoostCard({ who, side, n, dice, struck = [] }) {
  /* 시안 이식 */
}
```

> `resolveExchange`는 위 알고리즘으로 확정(소모된 방어 인덱스를 `usedIdx`로 추적 → 중복 눈도 1:1 정확 소거). 단위 테스트(§8)로 케이스 고정.

**Foundry 의존부**(같은 모듈, F5 육안):

```js
export async function postBattleCard(attackerActor, defenderActor, payload) {
  const speaker = ChatMessage.getSpeaker({ actor: attackerActor });
  const data = buildBattleCard({
    ...payload,
    attacker: attackerActor.name,
    defender: defenderActor.name,
  });
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/battle-card.hbs",
    data,
  );
  // 적용 버튼 멱등/대상 식별용 flag
  await ChatMessage.create({
    speaker,
    content,
    flags: {
      magicalogia: {
        battle: { defenderId: defenderActor.id, damage: data.damage, applied: false },
      },
    },
  });
}

export async function postBoostCard(actor, { side, n, dice, struck }) {
  /* renderTemplate + create */
}

export async function applyBattleDamage(message) {
  const f = message.getFlag("magicalogia", "battle");
  if (!f || f.applied) return; // 멱등
  const actor = game.actors.get(f.defenderId);
  if (!actor) return;
  const cur = actor.system.health.value;
  await actor.update({ "system.health.value": Math.max(0, cur - f.damage) });
  await message.setFlag("magicalogia", "battle", { ...f, applied: true });
}
```

### 5.2 `module/system/battle-socket.mjs` (신규)

`game.socket` 요청/응답 라우팅. `ready` 훅에서 `game.socket.on("system.magicalogia", onSocket)` 등록.

```js
export const CHANNEL = "system.magicalogia";

// GM → 특정 PL: 다이스/부스트 요청
export function requestPick({ reqId, userId, actorId, role, max, prompt }) {
  game.socket.emit(CHANNEL, { t: "battle:pick", reqId, userId, actorId, role, max, prompt });
}
export function requestBoost({ reqId, userId, side }) {
  game.socket.emit(CHANNEL, { t: "battle:boost", reqId, userId, side });
}

// 디스패치: PL은 본인 userId 요청에만 다이얼로그 오픈, GM은 결과 수신
function onSocket(msg) {
  switch (msg.t) {
    case "battle:pick":
      if (game.user.id === msg.userId) openPickDialog(msg);
      break;
    case "battle:boost":
      if (game.user.id === msg.userId) openBoostDialog(msg);
      break;
    case "battle:pick-result":
      if (game.user.isGM) MagicBattlePanel.deliverPick(msg);
      break;
    case "battle:boost-result":
      if (game.user.isGM) MagicBattlePanel.deliverBoost(msg);
      break;
  }
}
export function registerBattleSocket() {
  game.socket.on(CHANNEL, onSocket);
}
```

- PL 응답: `game.socket.emit(CHANNEL, { t:"battle:pick-result", reqId, dice })`.
- **권한 가드**: 상태 변경(결과 수신)은 `game.user.isGM`에서만. PL은 본인 `userId` 요청만 반응. → 위조 무력화.
- `MagicBattlePanel.deliverPick/deliverBoost`: 열린 패널 인스턴스에 `reqId`로 라우팅(정적 레지스트리 또는 단일 활성 패널 참조).

### 5.3 `module/apps/magic-battle-panel.mjs` (신규, GM 전용 ApplicationV2)

상태 머신 + 오케스트레이션 소스(인스턴스 메모리).

- `DEFAULT_OPTIONS.actions`: `pickActor`, `toggleSide`, `start`, `requestPickFor`(미제출 측 재요청), `reveal`, `nextExchange`, `endBattle`.
- 상태: `{ first:{actorId,isPC}, second:{actorId,isPC}, round, exchange, picks:{attack:?, defense:?}, reqs:{} }`.
- **개시**: 라운드 1·교전 1. 공격자/방어자 산출 → 각 측 다이스 요청:
  - PC(활성 소유자 존재) → `requestPick` 소켓.
  - NPC/소유자 없음 → `BattleDiceDialog` 로컬 오픈(콜백으로 `picks`에 기록), 소유자 없으면 `ui.notifications.warn`.
- `deliverPick(msg)`(static): `reqId` 매칭 → `picks[role]=dice` → 렌더(제출 칩). 양측 완료 시 **공개 버튼 활성**.
- **공개**: `postBattleCard(attackerActor, defenderActor, { round, exchange, attack, defense })` → picks 초기화.
- **다음 교전**: 교전 2(역할 교대) 동일. 2교전 후 라운드 종료(개시로 다음 라운드 / 종료).
- PC 소유자 판별: `game.users.filter(u => u.active && !u.isGM && actor.testUserPermission(u, "OWNER"))[0]`.

### 5.4 `module/apps/battle-dice-dialog.mjs` (신규, 공용 ApplicationV2)

`specialty-picker.mjs` 구조 차용. 공격/방어/부스트 공용.

- 옵션: `{ mode:"attack"|"defense"|"boost", max, prompt, onSubmit }`.
- 컨텍스트: 헤더 문구, 1~6 추가 버튼, 선택 칩(개별 제거), 카운터 `현재/max`.
- 액션: `addDie`(눈 추가, max 가드), `removeDie`, `submit`(→ `onSubmit(dice)` → 소켓 emit 또는 로컬 콜백 후 close).
- 부스트 모드: n 입력 → 클라에서 `new Roll("{n}d6").evaluate()` → 결과 dice를 `boost-result`로 전송.
- `_onRender`에서 `applyTheme(this.element)`. **본인 화면에만**(타인은 다이얼로그 자체가 없음 = 숨김).

### 5.5 템플릿 (신규)

- `templates/apps/magic-battle-panel.hbs`, `templates/apps/battle-dice-dialog.hbs`.
- `templates/chat/battle-card.hbs`: 시안 `chat-battle-card.hbs` 이식 — 루트 `class="magicalogia theme-light"`, head "마법전 · {round} · 교전{exchange}", **공격 측**(공격자명·valid/cancel) + **방어 측**(공격자명 아님, 방어자명·cancel/잔여), 결과 바 "공격 유효 N → {defender} **N 대미지**" + `<button data-action="apply-battle-damage">적용</button>`(GM 전용·`applied`면 완료 표기). 시안의 NPC/PC 라벨·winner·reveal 버튼 제거.
- `templates/chat/boost-card.hbs`: 시안 `chat-boost-card.hbs` 이식(라이트, "{who} · 부스트 +nD6", valid/cancel, 합계 없음).
- 4종 모두 `helpers/templates.mjs` `loadTemplates`에 등록.

### 5.6 SCSS (신규)

- `scss/component/_battle-card.scss`: 시안 `magicalogia-battlecard.css`의 `.mg-side(__tag/__dice)`, `.mg-die(-wrap/-num/--cancel/--valid)` + 플레인 `.mg-die`(leftover=중립 기본 면), `.mg-result` 규칙을 `.magicalogia {}` 중첩 이식(`--back`/`.mg-hint`는 v1 미사용). **토큰 블록·폰트 @import 이식 금지**(`_tokens.scss` 재사용). NPC/PC 태그 색은 공격/방어 의미로 매핑(공격=`--mg-bad` 계열/방어=`--mg-gold` 등 plan 확정). 적용 버튼 스타일 추가.
- `scss/component/_battle-ui.scss`: 패널·다이얼로그(드롭다운, 토글, 제출 칩, 1~6 버튼, 다이스 칩).
- `scss/magicalogia.scss`에 `@use "component/battle-card"`, `@use "component/battle-ui"` 추가.

### 5.7 `module/magicalogia.mjs` — 훅 등록

- `Hooks.on("getSceneControlButtons", …)`: **GM 전용** 마법전 툴 추가(`game.user.isGM` 가드) → 클릭 시 `MagicBattlePanel` 렌더.
- `Hooks.once("ready", registerBattleSocket)`.
- `Hooks.on("renderChatMessage", (msg, html) => bindBattleCardActions(msg, html))`: `apply-battle-damage` 위임(GM만, `applyBattleDamage(msg)`).

## 6. 데이터 흐름

```
씬컨트롤(GM) → MagicBattlePanel
  선공/후공 액터 지정 + NPC/PC 판별 + 근원력 표시
  개시 → 라운드1·교전1 (선공=공격, 후공=방어)
    공격 다이스 요청:  PC→requestPick(소켓)→PL BattleDiceDialog→pick-result→deliverPick
                       NPC→로컬 BattleDiceDialog→deliverPick
    방어 다이스 요청:  동일
    양측 제출 → 공개 버튼 활성
  공개 → postBattleCard(attacker, defender, {round,exchange,attack,defense})
            resolveExchange(attack, defense) → {attackMarks, defenseMarks, surviving, damage}  // 순수
            renderTemplate("chat/battle-card.hbs") → ChatMessage.create({flags.battle})        // 라이트
  카드 적용 버튼(GM) → applyBattleDamage(msg) → defender.health.value -= damage (멱등)
  다음 교전(역할 교대) → 교전2 동일 → 라운드 종료
  [부스트] 해당 측 → requestBoost(소켓)/로컬 → nD6 Roll → boost-result
            → struck(상대 잔여와 1:1) 계산 → postBoostCard (표시 전용)
```

## 7. 소켓 프로토콜 요약

| 방향  | `t`                   | 페이로드                                  | 처리                                   |
| ----- | --------------------- | ----------------------------------------- | -------------------------------------- |
| GM→PL | `battle:pick`         | reqId, userId, actorId, role, max, prompt | `user.id===userId`면 다이얼로그        |
| PL→GM | `battle:pick-result`  | reqId, dice[]                             | `isGM`만 → `deliverPick`               |
| GM→PL | `battle:boost`        | reqId, userId, side                       | `user.id===userId`면 부스트 다이얼로그 |
| PL→GM | `battle:boost-result` | reqId, n, dice[]                          | `isGM`만 → `deliverBoost`              |

채널 `system.magicalogia`. `reqId`로 상관·격리(불일치/만료 무시).

## 8. 테스트

### 단위 (`test/magic-battle.test.mjs`, 신규) — 순수

| 함수              | 케이스                              | 기대                                                                           |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| `resolveExchange` | `[4,4,2]` vs `[4,5]`                | surviving `[4,2]`, damage 2; 방어 4=cancel·5=leftover                          |
| `resolveExchange` | `[3,3]` vs `[3,3]`                  | surviving `[]`, damage 0                                                       |
| `resolveExchange` | `[1,2]` vs `[]`                     | surviving `[1,2]`, damage 2                                                    |
| `resolveExchange` | `[5]` vs `[5,5,1]`                  | surviving `[]`, damage 0; 방어 5 하나 cancel·나머지 5·1 leftover               |
| `resolveExchange` | `[6,6,6]` vs `[6,6]`                | surviving `[6]`, damage 1                                                      |
| `resolveExchange` | `[]` vs `[3]`                       | damage 0                                                                       |
| `buildBattleCard` | 위 입력                             | damage·attacker/defender·dieHtml 클래스(valid/cancel) 포함                     |
| `buildBoostCard`  | dice `[5,3]`, struck `[3]`          | 3=cancel·5=valid, 합계 필드 없음                                               |
| `buildBoostCard`  | 중복 struck `[4,4]`, dice `[4,4,2]` | 4·4=cancel·2=valid (1:1 소거)                                                  |
| `renderBattleDie` | (v, st)                             | valid→`--valid`, cancel→`--cancel`, leftover→플레인 `.mg-die`(모디파이어 없음) |

### 육안 (F5) — Foundry 의존 (서버 재시작 후)

- 씬 컨트롤 GM 전용 버튼 → 패널 오픈(비-GM에는 버튼 없음).
- **NPC vs NPC** 1라운드(2교전) 완주: 로컬 다이얼로그×4 → 공개×2 → 전투 카드(상쇄·대미지) → 적용 버튼 차감·멱등(재클릭 무효).
- **PC 참가**: 소켓으로 PL 화면 다이얼로그 자동 팝업 → 제출 → GM 패널 제출 칩 → 공개.
- PC **미접속/소유자 없음** → GM 대리 로컬 폴백 + 경고.
- **부스트**(공격/방어 · NPC/PC) → 부스트 카드 `struck` 표시(합계 없음).
- 0개 선택·중복 눈·다이얼로그 취소·근원력 0 동작.
- 카드 라이트 고정(다크/라이트 클라 모두).

## 9. 엣지/에러 처리

| 상황                  | 처리                                            |
| --------------------- | ----------------------------------------------- |
| 0개 선택              | 허용(공격 0=대미지 0, 방어 0=풀 통과)           |
| 중복 눈               | 허용(멀티셋 매칭)                               |
| PC 미접속/소유자 없음 | GM 대리 로컬 폴백 + `ui.notifications.warn`     |
| 다이얼로그 취소       | 미제출 유지·재요청 가능·공개 비활성             |
| 동시/지연 응답        | `reqId` 상관 격리, 불일치/만료 무시             |
| 소켓 위조             | 상태 변경은 `isGM`만, PL은 본인 `userId`만 반응 |
| 적용 중복 클릭        | 메시지 flag `applied`로 멱등                    |
| 패널 새로고침         | 진행 전투 소실(메모리) → 재개시 안내            |
| 근원력 0              | 선택 0개만 가능(경고 후 진행)                   |
| health 0 하한         | `Math.max(0, value - damage)`                   |

## 10. 함정 / 참고 (핸드오프 §4 준수)

- 커밋: 영어 한 줄 conventional, **co-author 없음**. lint-staged(prettier/eslint)가 md/scss/hbs/mjs 자동 정렬.
- 신규 템플릿 4종 → `loadTemplates` 등록 필수(`template-partials.test.mjs` 가드).
- 시안 토큰(`--mg-*`/`.theme-*`)·폰트 @import **이식 금지** — 컴포넌트 규칙만 `.magicalogia {}` 중첩. **신규 색 토큰 0 목표**.
- 순수 로직(`resolveExchange`/`build*Card`/`renderBattleDie`)만 단위 테스트. Foundry 의존(post\*/applyDamage/소켓/패널/다이얼로그/씬버튼/훅)은 F5 육안.
- 모델/훅/씬컨트롤/소켓 등록 변경 → **서버 재시작 후 F5**.
- 시안 `classifyBattle`/`buildBattleCard`는 **대칭(winner) 모델**이라 1:1 비대칭으로 **재작성**. `buildBoostCard`·`renderBattleDie`·`PIPS`는 거의 그대로 이식.
- 데이터 모델 변경 없음(`abilities.source`·`health` 기존).

## 11. 변경 파일 요약

- **신규**: `module/system/magic-battle.mjs`, `module/system/battle-socket.mjs`, `module/apps/magic-battle-panel.mjs`, `module/apps/battle-dice-dialog.mjs`, `templates/apps/magic-battle-panel.hbs`, `templates/apps/battle-dice-dialog.hbs`, `templates/chat/battle-card.hbs`, `templates/chat/boost-card.hbs`, `scss/component/_battle-card.scss`, `scss/component/_battle-ui.scss`, `test/magic-battle.test.mjs`.
- **수정**: `module/magicalogia.mjs`(getSceneControlButtons/ready/renderChatMessage 훅), `module/helpers/templates.mjs`(loadTemplates 4종), `scss/magicalogia.scss`(`@use` 2종).
