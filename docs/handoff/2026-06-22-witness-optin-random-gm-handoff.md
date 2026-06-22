# 핸드오프 — 입회 opt-in 전환 + 랜덤 다이스 + GM NPC 입회 (2026-06-22)

> 브랜치 `develop`. 직전 핸드오프 `2026-06-22-magic-battle-witness-handoff.md`(마법전 본체+입회 강제 push)의 후속.

## 0. 상태 요약

- 이번 세션에 **입회 흐름을 강제 push → 자원(opt-in)으로 전환**, **다이스 다이얼로그 랜덤 자동제출**, **랜덤 버튼 다이스 형태 통일**, **GM의 NPC/미할당 PC 입회**를 구현. `develop`에 **13커밋**(`54948ef..99b6eff`). 워킹트리 클린.
- **`npm test` 113개 통과**, `npm run build` 통과. 순수 로직만 vitest, Foundry 의존부(다이얼로그/소켓/패널/카드)는 **F5 미검증**.
- 각 기능 종료 시 whole-branch 리뷰 통과(opus): 입회 opt-in = READY(0 C/0 I), GM NPC 입회 = READY(0 C/0 I).
- **이 핸드오프까지 포함해 push 예정.**
- ⚠️ **규칙**: specs/plans 문서는 git 커밋 금지(`docs/superpowers/` = .gitignore, 로컬만). 핸드오프(`docs/handoff/`)·코드는 정상 커밋.
- ⚠️ **SDD 스크래치**: `.superpowers/sdd/`(progress.md ledger + brief/report/diff)도 gitignore. 이번 세션 작업 로그가 거기 있으나 다른 PC엔 없음 — 이 핸드오프 + git 히스토리로 이어가기.

## 1. 완료 작업 (모두 develop, 13커밋)

### 1-A. 입회 강제 push → 자원(opt-in) 전환 (`54948ef..e43f4d0`, 7커밋)

기존: 교전 시작 시 모든 비전투 PC 소유자에게 소켓 push로 다이얼로그 **강제**. 신규: **교전마다 입회 카드 1장 발행**, 원하는 사람만 카드 버튼 클릭 → 다이얼로그. 미선택 = GM 재량 pass(의도).

- `eligibleWitnessActor(combatantIds, ownedActors)` 순수 헬퍼(첫 비전투 1명).
- `postWitnessCard({round,exchange,combatants})` + `templates/chat/witness-card.hbs`(flag `magicalogia.witness={round,exchange,combatants,closed}`).
- `bindWitnessCardActions` — 카드 버튼 클릭 → 액터 판정 → `BattleDiceDialog`(witness). **dialog/socket은 클릭 핸들러 내 동적 import**(순수 모듈 vitest 로드 유지 = §4.4).
- battle-socket: `requestWitness` push 제거, `sendWitnessResult` 페이로드 `{round,exchange,actorId,name,side,dice}`(reqId 폐기, 교전 식별자 매칭).
- 패널: `_requestWitnesses`/`witnessReqs` 제거, `_beginExchange`가 카드 발행+`witnessCardId` 저장, `_receiveWitness`가 `round/exchange/!revealed` 매칭+`actorId` 덮어쓰기, `#onReveal`이 카드 flag `closed:true`로 **마감**(늦은 제출 무시), `witnessStatus`는 제출분만.

### 1-B. 다이스 다이얼로그 랜덤 자동제출 (`225b2ba`, `989830a`)

- **attack/defense**: "랜덤" → `max`(능력치)개 1d6 자동 굴림 → **즉시 자동제출+닫기**(눈 미표시). 능력치 0이면 버튼 비활성. 집중방어 미고려(순수 눈 배열).
- **witness**: "랜덤" 클릭당 1개 추가(`this.hidden[]` 인덱스 동기, 최대 2), 칩에 `[랜덤 N]` 값 숨김 → 기존 확정 버튼으로 수동 제출. 수동 faces와 혼용.

### 1-C. 랜덤 버튼 다이스 형태 통일 (`59fcbbb`)

- 모든 모드 랜덤 버튼을 faces 그리드(집중 옆)에 `mg-bdd__face` 형태 + 주사위 아이콘(`fa-dice-d6`)으로 통일. 확정 옆 텍스트 랜덤 버튼 제거. 동작 불변(위치/형태만). 골드 강조(`--mg-gold` 재사용, 신규 토큰 0).

### 1-D. GM의 NPC/미할당 PC 입회 (`dd6eb39`, `7db5091`, `99b6eff`)

이 시스템 actor 타입은 `character` 하나뿐 → "NPC/미할당 PC" = **활성 비-GM 소유자 없는 character**.

- `npcWitnessCandidates(combatantIds, actors:{id,name,hasPlayerOwner}[])` 순수 헬퍼.
- `BattleDiceDialog` witness에 `actors` 옵션 → `<select>` 드롭다운(`_onRender`에서 직접 `change` 리스너 — ApplicationV2 click-action이 select change 못 잡음), `extra.actorId` 포함.
- `bindWitnessCardActions` GM/PL 분기: GM은 후보(`hasPlayerOwner=game.users.some(u=>u.active&&!u.isGM&&actor.testUserPermission(u,"OWNER"))`로 계산) 드롭다운 선택, 0명이면 경고, 1명도 드롭다운. PL 경로 불변(자동 첫 1명). 여러 NPC = 카드 재클릭(actorId 덮어쓰기).

## 2. F5 육안 검증 필요 (전부 미검증 — vitest 불가 영역)

**서버 재시작 + 전 클라 하드 리프레시(Ctrl+Shift+R), 별도 PL 클라 필요**(`game.socket.emit`은 자기 자신에 안 옴).

- **입회 opt-in**: 교전마다 카드 1장 발행 / PL이 카드 클릭 → 다이얼로그(강제 팝업 0) → 제출 → 패널 "측✓" / GM 공개 시 카드 "마감" 버튼 비활성, 늦은 제출 무시 / 미참여 자연 pass / 합산·상쇄 회귀.
- **랜덤**: attack/defense 랜덤 → 즉시 닫힘, 공개 카드에 능력치 수만큼 랜덤 눈 / 능력치 0 비활성 / witness 랜덤 1~2클릭 `[랜덤 N]` 숨김 → 확정 / 수동+랜덤 혼용.
- **다이스 형태**: 1~6 옆(방어는 집중 다음) 주사위 아이콘 버튼, `fa-dice-d6` 렌더 확인.
- **GM NPC 입회**: GM 카드 클릭 → 드롭다운(소유자 없는 비전투) → 선택→제출→그 액터 합산 / 0명 경고 / 1명도 드롭다운 / 여러 NPC 합산 / 같은 NPC 덮어쓰기 / **오프라인 플레이어 소유 액터도 후보에 뜨는지**(활성 소유자만 제외) / PL 회귀(드롭다운 없음).

## 3. 핵심 경로

- 순수+발행: `module/system/magic-battle.mjs` — `resolveExchange`/`buildBattleCard`/`buildBoostCard`/`renderBattleDie`/`eligibleWitnessActor`/`npcWitnessCandidates`(순수) + `postBattleCard`/`postWitnessCard`/`postBoostCard`/`applyBattleDamage`/`bindBattleCardActions`/`bindWitnessCardActions`(Foundry).
- 다이얼로그: `module/apps/battle-dice-dialog.mjs` — mode attack/defense/boost/witness; 랜덤(`randomSubmit`=자동제출, `addRandomDie`=witness 1개추가+hidden); witness `actors` 드롭다운(`_onRender` change 리스너, `witnessActorId`).
- 소켓: `module/system/battle-socket.mjs` — `sendWitnessResult({round,exchange,actorId,name,side,dice})`; CHANNEL `system.magicalogia`; **`system.json` `socket:true` 필수**.
- 패널: `module/apps/magic-battle-panel.mjs` — `_beginExchange`→카드 발행/`witnessCardId`; `_receiveWitness` 교전식별자 매칭+actorId 덮어쓰기; `#onReveal` 카드 마감.
- 카드/SCSS: `templates/chat/witness-card.hbs`, `templates/apps/battle-dice-dialog.hbs`, `scss/component/_battle-ui.scss`(`mg-bdd__face--random`/`mg-bdd__actorsel`).

## 4. 미해결 Minor (비차단)

- **입회 빈 제출(dice=[]) 덮어쓰기**: 같은 actor 재제출이 0개면 기존 제출을 지움(미문서화). 자발 흐름상 "철회"로 볼 수 있어 Minor. 조이려면 `_receiveWitness` 필터를 `dice.length` 체크 뒤로, 또는 다이얼로그 witness 분기에 `≥1` 가드.
- 직전 핸드오프의 입회 1·2번(공개 타이밍/거부 표현)은 **GM 재량 pass로 의도 확정** — opt-in 전환으로 자연 정합(패널은 제출분만 표시).

## 5. 다음 작업

1. **F5 육안 검증**(§2) — 최우선. 솔로 GM으로는 소켓 PL 경로 검증 불가(별도 PL 클라).
2. M2(입회 빈제출) 조일지 결정.
3. **main 병합**(원하면) — develop→main 별도 결정.

## 6. 함정 / 참고

- **커밋**: 영어 한 줄 conventional, **co-author 없음**. lint-staged 자동 정렬. **specs/plans/`.superpowers/sdd/` 커밋 금지(gitignore)**. 핸드오프·코드 OK.
- **소켓**: `system.json` `socket:true` 필수. 매니페스트 변경=Foundry 재시작, 클라 번들=전 클라 하드 리프레시. emit은 자기 자신에 안 옴.
- **§4.4 순수 경계**: `magic-battle.mjs`는 vitest 로드되므로 Foundry-로드 모듈(`battle-dice-dialog`=top-level `foundry.applications.api`, `battle-socket`)을 top-level import 금지 → 클릭 핸들러 내 **동적 import** 유지.
- **`<select>`**: ApplicationV2 click-action이 change 못 잡음 → `_onRender` 직접 리스너.
- 시안 토큰(`--mg-*`) 재사용, 채팅 카드 라이트 고정, 신규 색 토큰 0.
