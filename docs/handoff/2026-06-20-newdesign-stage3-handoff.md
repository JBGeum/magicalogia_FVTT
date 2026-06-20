# 핸드오프 — S3(상태칩 마크·마법표 아이콘·푸터 플로리시) 완료·푸시됨 (2026-06-20)

> 브랜치 `develop`. 다른 PC/다음 세션에서 이어가기 위한 노트.

## 0. 상태 요약

- **S3 코드 완료·푸시됨.** `origin/develop` = 로컬 HEAD = `52c7683`. S1·S2·S3 모두 반영.
- **⚠️ S3는 Foundry 육안 검증 전에 push함**(사용자 선택). 코드 리뷰(opus, "Ready to merge: Yes")·48테스트·build는 통과. 다음에 Foundry F5로 시각 확인 권장(아래 §3). 문제 발견 시 후속 fix 커밋.
- 다른 PC에서 이어가려면 `git pull` 후 `npm install && npm run build && npm test`(48 통과).

**시안 파일은 git에 없음:** `docs/design/`(신·구 시안)은 gitignore. 새 PC에서 S4 이후 작업하려면 `docs/design/new/`(`example.html`, `styles/magicalogia.css`, `templates/`, `scripts/`, `assets/`)를 수동 복사해 와야 함.

## 1. 지금까지 (S1~S3 완료·푸시)

- **S1 (토큰/폰트/골드 프레임):** `449d348..7482485`. Foundry 검증 통과.
- **S2 (헤더밴드 델타):** `..7074e33`(handoff 포함). Foundry 검증 통과 후 이번 세션 시작 시 push.
- **S3 (상태칩 마크 + 마법표 아이콘 + 푸터 플로리시):** spec `84d6665`(amended chain → `d5aca12` plan). 3 task subagent-driven, 각 spec+quality 리뷰 통과, 최종 whole-branch 리뷰(opus) **Ready to merge: Yes**(Critical/Important 0).
  - `c024ef4` 상태칩 골드 체크박스 마크(`mg-status__mark`) — 비활성=빈 테두리, hover=골드 테두리, active=`--mg-check` 채움+✓. toggleStatus 동작 무변경.
  - `e429097` 마법표 6열 헤더 SVG 아이콘 — partial `mg-svg-chart-icon.hbs`(key 분기: star/beast/force/song/dream/dark), `templates.mjs` 등록, `.ico` SCSS.
  - `52c7683` 마법표 푸터 플로리시 — partial `mg-svg-miniflr.hbs`, 푸터 "소속영역"·"혼의 특기" 라벨 앞 삽입, `.mg-flourish` SCSS.
  - 데이터 모델·토큰 변경 없음. 신규 partial 2개 모두 `loadTemplates` 등록 확인됨.

## 2. 다음 작업 (S4) — 바로 이어서

**S4: 탭 재편 + 정보 탭.** 자체 spec→plan→subagent-driven 사이클(S1~S3와 동일 흐름).

- 장서·관계 탭 제거 → 캐릭터 시트 하단 **아코디언**(`mg-accordion`)으로 이동.
- 탭을 `main / info / 속성(비활성)`으로 재편.
- **정보 탭** 신설: 플레이어/신분(socialStatus)/성별(gender)/연령(age) 입력 UI. (데이터 필드는 이미 존재 — S1 매핑표 참조.)

흐름: `brainstorming`(시안 info 탭·아코디언 확인) → `writing-plans` → `subagent-driven-development`.

## 3. S3 잔여 게이트 — Foundry 육안 확인 (선택, 권장)

F5로 시스템 템플릿 재로드(신규 partial 2개라 재로드 필요, documentTypes 미변경이므로 서버 재시작 불필요):

- **상태칩:** 각 칩 앞 골드 체크박스. 비활성=빈 테두리, hover=골드 테두리, 클릭(toggleStatus)→`--mg-check` 채움 + ✓ 노출. 토글 동작 무손상.
- **마법표:** 6열 헤더에 골드 SVG 아이콘(별/짐승/힘/노래/꿈/어둠) + 번호 + 제목. is-domain 강조·셀·체크 무손상.
- **푸터:** "소속영역"·"혼의 특기" 라벨 앞 골드 플로리시.
- 헤더밴드(S2)·프레임 모서리(S1)·탭·카운터 무손상.

## 4. 스테이지 로드맵 (남은 것)

- **S4: 탭 재편 + 정보 탭** (위 §2).
- **S5: 라이트 테마.** `.magicalogia.theme-light` 토큰 오버라이드 + 토글.

## 5. 함정 / 참고

- **⚠️ S4는 documentTypes/탭 구조 변경 가능성 — 서버 재시작 필요할 수 있음**(F5로 부족). 장서·관계 탭 제거가 sheet 등록/탭 정의를 건드리면 재시작. Item화 때 겪은 함정.
- **partial 신규 등록은 `module/helpers/templates.mjs` `loadTemplates`에 경로 추가 필수** — 누락 시 `{{> …}}`가 조용히 빈 출력.
- `docs/design/`은 gitignore — 시안 SVG/asset은 partial 신설·`assets/` 복사로 시스템에 들여와야 배포 포함.
- 커밋 메시지: 영어 한 줄, co-author 없음. lint-staged(prettier)가 커밋 시 md·SCSS·hbs 자동 정렬(정상). **Write로 md 생성 시 파일 끝에 도구 태그가 새어들어가는 경우가 있으니 tail로 확인할 것**(S3에서 spec/plan 모두 발생, 제거함).
- SCSS 위치: 상태칩 = `scss/component/_components.scss`(`.mg-status` 블록), 마법표 = `scss/component/_magic-chart.scss`(`.mg-chart__head .ico`, `.mg-flourish`).

## 6. 참고 경로

- 진행 로그(복구용): `.git/sdd/progress.md` (S1·S2·S3 task별 커밋·리뷰 결과·이월 메모)
- S3 spec: `docs/superpowers/specs/2026-06-20-newdesign-stage3-status-chart-design.md`
- S3 plan: `docs/superpowers/plans/2026-06-20-newdesign-stage3.md`
- S1 spec(공통 결정·로드맵·데이터 매핑표): `docs/superpowers/specs/2026-06-19-newdesign-roadmap-and-stage1-design.md`
- S3 마크업: `templates/actor/character-sheet.hbs`(상태칩 ~140), `templates/actor/parts/magic-chart.hbs`(헤더·푸터)
- S3 SVG partial: `templates/actor/parts/mg-svg-{chart-icon,miniflr}.hbs`
- 데이터: `module/helpers/config.mjs`(attributes/statuses), `module/helpers/templates.mjs`(partial 등록), `module/sheets/actor-sheet.mjs`(context)
