# 핸드오프 — S2(헤더밴드) 코드 완료, Foundry 재검증 대기 중 (2026-06-20)

> 브랜치 `develop`. 다른 PC/다음 세션에서 이어가기 위한 노트.

## 0. ⚠️ 먼저 할 일 / 상태 요약

- **S2 코드는 전부 로컬 커밋만 됨 — 아직 push 안 함.** `origin/develop`은 S1까지(`7482485`). 로컬 HEAD는 `58e8195`. **미푸시 9커밋**(S2 spec/plan + 6 task + statrail fix).
- **남은 게이트: Foundry 육안 재검증** (아래 §3). 검증 OK면 `git push origin develop`.
- 다른 PC에서 이어가려면 **먼저 이 PC에서 push** 필요(검증 후). 같은 PC면 로컬 커밋 그대로 사용.

```bash
git pull            # (push 된 경우)
npm install
npm run build       # dist/ 생성
npm test            # 48 통과 확인
```

**시안 파일은 git에 없음:** `docs/design/`(신·구 시안)은 gitignore. 새 PC에서 S3 이후 작업하려면 `docs/design/new/`(`example.html`, `styles/magicalogia.css`, `templates/`, `scripts/`, `assets/`)를 수동 복사해 와야 함.

## 1. 지금까지

### S1 (토큰/폰트/골드 프레임) — 완료·푸시됨

- `449d348..7482485`, `origin/develop`에 반영. Foundry 검증 통과.
- 토큰 델타, Pretendard 폰트, `.mg-content` 이중 골드선 + 모서리 필리그리. (deco는 `background`로 병합.)

### S2 (헤더밴드 델타) — 코드 완료, **미푸시**, 재검증 대기

- spec `9a3f4f7`, plan `eb33b0b`. 6 task(subagent-driven) 전부 spec+quality 리뷰 통과, 최종 whole-branch 리뷰(opus) **Ready to merge: Yes**(Critical/Important 0).
  - `caa4d2f` rankTitles config + rankTitle 컨텍스트
  - `3441fde` 초상화 SVG 필리그리(mg-pcorner, partial 신설)
  - `ee59212` 게이지 head/body 골드헤더
  - `99c0180` 스탯 타일 골드헤더
  - `7d9d1e2` 계제 타일 재구조화(mg-rank + 등급명·플로리시, partial 신설)
  - `f32248c` divider(`assets/divider.png` 동봉)
- **후속 fix `58e8195`**: 사용자가 Foundry에서 발견한 시안 불일치 수정.
  - 근본 원인: `scss/sheet/_layout.scss`의 `.mg-statrail` 블록이 **이전 평면 디자인 잔재**라 S2 때 갱신 안 됨.
  - 시안에 없는 `.mg-statrail .mg-stat{padding:6px 0}` 제거 + 시안의 `.mg-gauge__head{height:100%}` 추가.

## 2. 다음 작업 (바로 이어서)

1. **Foundry 재검증**(§3) → OK면 `git push origin develop`.
2. 그 후 **S3 시작**: 자체 spec→plan→subagent-driven 사이클(S1/S2와 동일 흐름).

## 3. 남은 게이트 — Foundry 육안 재검증 (F5)

S2 전체 + statrail fix를 한 번에 확인:

- 초상화 네 모서리 SVG 필리그리(곡선), img 유무 무관. (사진 위에 골드 필리그리 겹침이 의도대로 OK인지)
- 공격/방어/근원 스탯: 골드 그라데이션 헤더 + field 값. **타일 크기가 시안과 일치(불필요한 상하 padding 없음).** 강조(20px) vs 일반(18px) 위계 확인.
- 마력/일시 마력 게이지: 골드 head(아이콘+라벨) + field body. **head가 body와 같은 높이로 꽉 참.**
- 계제 타일: 골드헤더 "계제" + 플로리시 SVG + 골드 숫자 + 등급명(rank=4 → "실천자 (Practicus)").
- 헤더밴드↔상태이상 사이 divider 이미지.
- 정체성 그리드/마법표/탭/카운터 무손상.

(partial 신규 등록이라 F5로 시스템 템플릿 재로드 필요. documentTypes 변경 아니므로 서버 재시작 불필요.)

## 4. 스테이지 로드맵 (남은 것)

- **S3: 상태칩 컬러 마크 + 마법표.** `mg-status__mark`, 마법표 열 SVG 아이콘, 푸터 플로리시(`mg-svg-miniflr`).
- **S4: 탭 재편 + 정보 탭.** 장서·관계 탭 → 하단 아코디언(`mg-accordion`), 탭을 main/info/속성(비활성)으로, 정보 탭(플레이어/신분/성별/연령) 추가.
- **S5: 라이트 테마.** `.magicalogia.theme-light` 토큰 오버라이드 + 토글.

## 5. S2에서 이월된 메모 (S3+에서 확인)

`.git/sdd/progress.md`에 상세. 요약:

- `--mg-paper-edge` 토큰 미정의(현재 `mg-fdia` box-shadow가 fallback `transparent` 사용) — 필요 시 S2/S3에서 신설 고려.
- `_vars.scss`의 Sass `$mg-row-h`(22px)/`$mg-head-h`(36px)가 CSS 토큰(21/30px)과 어긋남. 소비처가 Sass 변수를 읽는지 확인(현재는 무해).
- 시안 `.mg-content` border는 2px이나 현재 1px 유지(변경 최소). S2 헤더 작업 일관성 위해 재고 가능.
- 최종 리뷰 Minor(시각 확인용, 코드 이슈 아님): 강조 스탯 20px vs 18px 위계, 초상화 필리그리-위-사진.

## 6. 함정 / 참고

- **`docs/design`은 gitignore** — 시안 SVG/asset은 partial 신설·`assets/` 복사로 시스템에 들여와야 배포 포함. divider.png는 이미 `assets/divider.png`로 동봉됨(`f32248c`).
- **partial 신규 등록은 `module/helpers/templates.mjs` `loadTemplates`에 경로 추가 필수** — 누락 시 `{{> …}}`가 조용히 빈 출력(실렌더에서 SVG 안 보임).
- **statrail 컨텍스트는 SCSS가 두 곳에 나뉨**: 컴포넌트 본질은 `scss/component/_components.scss`(`.mg-stat`/`.mg-gauge`/`.mg-rank`), 레이아웃 오버라이드는 `scss/sheet/_layout.scss`(`.mg-statrail`). 한쪽만 고치면 이번 `58e8195` 같은 불일치 재발 — 둘 다 확인.
- 게이지/계제 `<input>` 값은 `.mg-statrail input{background:transparent}` 리셋 위에 그려짐 → 배경색은 감싸는 `<div>`(`.mg-stat`/`__body`)가 책임.
- 커밋 메시지: 영어 한 줄, co-author 없음.
- lint-staged(prettier)가 커밋 시 md 표·SCSS·hbs를 자동 정렬(정상).
- Foundry 스타일/템플릿 변경은 F5로 충분. documentTypes 변경만 서버 재시작 필요.

## 7. 참고 경로

- 진행 로그(복구용): `.git/sdd/progress.md` (S1·S2 task별 커밋·리뷰 결과·이월 메모)
- S2 spec: `docs/superpowers/specs/2026-06-20-newdesign-stage2-headband-design.md`
- S2 plan: `docs/superpowers/plans/2026-06-20-newdesign-stage2-headband.md`
- S1 spec(공통 결정·로드맵): `docs/superpowers/specs/2026-06-19-newdesign-roadmap-and-stage1-design.md`
- 헤더밴드 마크업: `templates/actor/character-sheet.hbs`(line 27~), SVG partial: `templates/actor/parts/mg-svg-{pcorner,rankflr}.hbs`
- 헤더밴드 SCSS: `scss/component/_components.scss`(stat/gauge/rank/portrait/divider) + `scss/sheet/_layout.scss`(`.mg-statrail` 레이아웃)
- 데이터: `module/helpers/config.mjs`(rankTitles 등), `module/helpers/templates.mjs`(partial 등록), `module/sheets/actor-sheet.mjs`(`_prepareContext`)
