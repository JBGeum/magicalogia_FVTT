# 핸드오프 — 마법전 + 입회인/집중방어 (2026-06-22)

> 브랜치 `develop`. 다음 세션/다른 PC 이어가기 노트. 직전 핸드오프 `2026-06-21-handoff-3.md`(장서충전)의 후속.

## 0. 상태 요약

- 이번 세션에 **마법전(다이스 대결) 본체 + 다수 F5 수정 + 입회인/집중방어 2-눈 확장**을 구현하고, **이 핸드오프까지 포함해 `develop`을 `origin/develop`에 push 함**(범위 `f657e82..`이 핸드오프 커밋, 약 38커밋). 워킹트리 클린.
- **`npm test` 105개 통과**, `npm run build` 통과. 순수 로직(resolveExchange/renderBattleDie/buildBattleCard/buildBoostCard)만 vitest, Foundry 의존부는 F5.
- ✅ **소켓 PL 다이얼로그 해결**: 전투원 PC 픽·입회인 다이얼로그가 PL 화면에 정상 표시됨(§3). 원인=매니페스트 `socket:true` 누락(`0a286bf`로 추가) + 클라이언트 옛 번들 캐시. **추가 코드 변경 없음.**
- ⚠️ **새 규칙(이번 세션 사용자 지시)**: **specs/plans 문서는 git 커밋 금지**(룰 외부 유출 우려). `docs/superpowers/specs/`·`docs/superpowers/plans/`는 `.gitignore` 등록 + 추적 해제됨(로컬만 보관). 핸드오프(`docs/handoff/`)·코드는 정상 커밋. 메모리 `[[no-commit-spec-docs]]` 참조.
- ⚠️ **Foundry 소스 참고처**: `H:\foundry13`에 V13 소스 있음. API 불명 시 추측 말고 grep/read로 검증. 메모리 `[[foundry13-source-ref]]`.
- 이어가려면(다른 PC): `git pull` 후 `npm install && npm run build && npm test`(105 통과). **specs/plans는 gitignore라 다른 PC면 로컬 사본 없음** — 필요 시 이 핸드오프 + git 히스토리(`f657e82` spec, `5590e64` plan)에서 참조.

## 1. 완료 작업 (모두 develop, push됨)

### 1-A. 마법전 본체 (`be4c159..7b18004`, SDD T1-T11)

GM 패널에서 선공/후공 지정 → 라운드(양방향 2교전) → 각 측 다이스(눈 1~6) 숨김 선택 → 공개 → **공격/방어 1:1 비대칭 상쇄**(남은 공격 다이스 = 대미지) → 부스트(표시 전용). 신규 파일:

- `module/system/magic-battle.mjs` — 순수(resolveExchange/renderBattleDie/buildBattleCard/buildBoostCard) + Foundry(postBattleCard/postBoostCard/applyBattleDamage/bindBattleCardActions).
- `module/system/battle-socket.mjs` — `game.socket` 요청/응답(pick/boost/witness) + `ready` 등록.
- `module/apps/magic-battle-panel.mjs` — GM 패널(ApplicationV2), 오케스트레이션.
- `module/apps/battle-dice-dialog.mjs` — 다이스 선택/부스트/집중/입회 공용 다이얼로그.
- `templates/chat/{battle-card,boost-card,mp-damage-card}.hbs`, `templates/apps/{magic-battle-panel,battle-dice-dialog}.hbs`.
- `module/magicalogia.mjs` — `getSceneControlButtons`(GM 전용 버튼)·`renderChatMessageHTML`(적용 버튼)·`ready`(소켓) 훅.

### 1-B. F5 수정 (`3385f15..a363e4d`, `0a286bf`)

- **다이스 수 = 능력치 정정**(`3385f15`): 공격 다이스=`abilities.attack`, 방어=`abilities.defense`(이전엔 둘 다 `abilities.source` 참조 버그). 부스트 n=상한 없음. `abilities.source`는 마법전 미사용.
- **대미지=마력(MP) 적용 + 컴팩트 카드**(`de9b0d7`): 적용 시 `health` 아닌 **`mp.value`** 차감(Math.max 0), "{who} 마력 N 감소 (a→b)" 한줄 카드(`mp-damage-card.hbs`, `.mg-mpd`). 결과 표기 "N 대미지"만.
- **집중방어**(`744d0a9`, 이후 입회인 확장에서 2-눈으로 일반화): 방어력≥3에서 다이얼로그 `0`(집중) 버튼.
- **스크롤 보존**(`6051029`): 액터 시트 재렌더 시 `_onRender`에서 `.window-content > div` scrollTop 수동 저장/복원(part `scrollable` 옵션이 이 빌드에서 미작동해 수동 방식).
- **채팅 카드 edge-to-edge**(`8f34b80`): `_foundry.scss` — 우리 카드(.mg-card/.mg-cc/.mg-mpd)가 든 `.chat-message`의 기본 헤더 숨김+패딩 제거(`:has()`), 다이얼로그 `.window-content` 패딩 0. (삭제는 메시지 우클릭 컨텍스트 메뉴로 가능 — V13 확인.)
- **장서충전 카드 줄바꿈**(`8ae5b4d`,`a363e4d`): PC명 │ 「장서」+충전변경 경계에서만 접힘(`.mg-cc__head`/`__detail` 그룹), delta 우측 끝.
- **소켓 릴레이 활성화**(`0a286bf`): `system.json`에 `"socket": true`(§3).

### 1-C. 입회인 + 집중방어 2-눈 (`32d4971..8ce4a69`, SDD W1-W7)

- **입회인(witness)**: 현 전투 외 활성 PC(액터 단위, 비-GM 소유자) → 측(기본 방어)+눈 0~2개를 **공개 전** 측 풀에 가산 → 1:1 상쇄 참여. 소켓 다이얼로그. 카드에 `mg-die--witness` 표식 + 하단 "입회 · 이름 측 눈"(상쇄=취소선).
- **집중방어 2-눈**: 인코딩 `[focus눈…, 0, 1:1다이스…]`(0 앞=집중 눈 0~2개 무제한 상쇄, 뒤=1:1/입회). `resolveExchange.focus`가 **배열**.
- 최종 whole-branch 리뷰(opus): **Ready to merge = YES**, 0 Critical/Important.
- (집중방어 인코딩이 `[0,X]`→`[X…,0]`로 바뀌어 기존 다이얼로그/카드/테스트 동반 수정됨.)

## 2. 미푸시였던 doc-히스토리 메모 (이제 push됨)

- `f657e82`(spec), `5590e64`(plan), `e270b2f`/`6a88df1`/`5c78b6d`(spec 배너)는 **no-commit 규칙 이전** 커밋이라 히스토리에 spec/plan 내용 포함. `4b96aba`에서 추적 해제(이후 차단). 사용자 결정: **"앞으로만 차단", 히스토리는 그대로** → push로 이 커밋들도 origin에 올라감(수용됨). 과거 마법전 spec/plan은 이전 세션에 이미 origin/develop에 있었음.

## 3. 소켓 PL 다이얼로그 — 해결됨 ✅

**증상(해결 전)**: GM 로컬(NPC) 다이얼로그는 떴으나, PL(접속 중·소유 PC 보유)에게 전투원 PC 픽·입회인 다이얼로그가 안 뜸 — 소켓→PL 경로 전체.

**원인 & 해결**:

- 매니페스트에 **`"socket": true`** 누락 → Foundry가 `system.magicalogia` 채널을 다른 클라로 릴레이 안 함. `0a286bf`로 추가(소스 `common/packages/base-package.mjs:387`의 `socket` 필드). 빌드가 `dist/system.json`에 복사.
- 매니페스트 변경은 **Foundry 재시작** 필요, 클라 JS 번들 변경은 **각 클라(특히 PL) 하드 리프레시(Ctrl+Shift+R)** 필요(서버 재시작만으론 PL 브라우저 캐시 안 비워짐).
- 적용 후 PL 소켓 다이얼로그(전투원 PC 픽·입회인) **정상 동작 확인. 추가 코드 변경 없음.**

**교훈(다음에 또 밟지 말 것)**: `game.socket` 사용 시 ① 매니페스트 `"socket": true` 필수 ② 매니페스트 변경 후 재시작 ③ 코드 변경 후 PL 포함 전 클라 하드 리프레시. `game.socket.emit`은 보낸 클라 자신엔 안 옴 → 솔로 GM 테스트로는 검증 불가(별도 PL 클라 필요).

## 4. 핵심 경로

- 순수+발행: `module/system/magic-battle.mjs` (resolveExchange 인코딩 `[focus…,0,1:1…]`, focus 배열; buildBattleCard witnesses 합산·span; applyBattleDamage→mp.value).
- 소켓: `module/system/battle-socket.mjs` (CHANNEL `system.magicalogia`; requestPick/requestBoost/requestWitness + onSocket). **`system.json`에 `socket:true` 필수.**
- 패널: `module/apps/magic-battle-panel.mjs` (\_beginExchange→_requestPick+\_requestWitnesses; #onReveal 합산 풀로 postBattleCard+lastResult; \_ownerUser=활성 비-GM OWNER).
- 다이얼로그: `module/apps/battle-dice-dialog.mjs` (mode attack/defense/boost/witness; focusMode→[...dice,0]; witness→onSubmit(dice,{side})).
- 카드/SCSS: `templates/chat/battle-card.hbs`(focus each·입회 요약), `scss/component/_chat-card.scss`(.mg-die--witness/.mg-battle-witness/.mg-mpd/.mg-cc), `_battle-ui.scss`(패널·다이얼로그·측토글), `_foundry.scss`(채팅 edge-to-edge·다이얼로그 패딩).
- 매니페스트: `system.json` (`"socket": true`; 빌드가 dist로 복사).
- 데이터: `abilities.{attack,defense,source}`, `mp.{value,max}`, `health.{value,min,max}` (`module/data/actors/character.mjs`, `base-actor.mjs`).
- SDD 진행 로그(복구용, gitignore 스크래치): `.superpowers/sdd/progress.md` (마법전 T1-T11 + 입회인 W1-W7 + F5 + 최종 리뷰 전부 기록).
- spec/plan(로컬·미커밋): `docs/superpowers/specs/2026-06-21-magic-battle-design.md`(+정정 배너), `…-witness-design.md`; plans 동명.

## 5. 함정 / 참고

- **커밋**: 영어 한 줄 conventional, **co-author 없음**. lint-staged(prettier/eslint) 자동 정렬. **specs/plans 커밋 금지**(gitignore). 핸드오프/코드는 OK.
- **소켓**: `system.json` `"socket": true` 필수. 매니페스트 변경=Foundry 재시작, 클라 번들 변경=전 클라 하드 리프레시. emit은 자기 자신엔 안 옴.
- 검증 분리: 순수=vitest, Foundry(소켓/패널/다이얼로그/post\*/훅/씬버튼)=F5(서버 재시작/하드 리프레시).
- 시안 토큰(`--mg-*`)·폰트 @import 이식 금지(우리 `_tokens.scss` 재사용), 채팅 카드 라이트 고정, 신규 색 토큰 0 유지.
- `scrollable` part 옵션이 이 빌드에서 미작동 → 수동 `_onRender` 스크롤 보존 패턴 사용(actor-sheet).

## 6. 다음 작업

1. **F5 육안 검증**(서버 재시작 + 전 클라 하드 리프레시 후): 마법전 전체 흐름 — 라운드 2교전, 집중 2-눈, **입회인(PL 다이얼로그)**, 부스트, 대미지(MP) 적용. 카드 다크/라이트. (소켓 PL 경로는 동작 확인됨; 잔여 시나리오 육안만.)
2. **main 병합**(원하면): develop→main squash 등 별도 결정(squash 시 main 이력엔 doc 커밋 안 남음; develop/origin엔 잔존).
3. 잔여 Minor(최종 리뷰 triage, 비차단): 입회 다이스 색 골드(→--mg-soft 검토), `_receiveWitness` 빈제출 render, 미사용 `.mg-bdd__chip--focus` SCSS, battle-socket↔panel 순환 import(call-time 안전하나 향후 정리), `requestBoost` 미사용 `side` 페이로드.
