# 핸드오프 — 시트 개편 ①② 완료 · 다음은 장서/관계 Item화 (2026-06-19, 저녁)

> 브랜치: `develop`. 새 세션/다른 PC에서 이어가기 위한 노트.
> 같은 날 오후 핸드오프(`2026-06-19-tabs-and-tables.md`)의 후속.

## 0. 새 세션에서 먼저 할 일

`dist/`·`node_modules/`·`docs/design/`는 git 추적 대상이 아니다. 클론/풀 후:

```bash
npm install
npm run build      # dist/magicalogia.css 생성
npm test           # 38개 통과 확인
```

진행 순서·맥락은 메모리 `next-work-order`, `grimoire-item-migration` 참조.

## 1. 이 세션 작업 요약 (커밋)

| 해시      | 내용                                                            |
| --------- | --------------------------------------------------------------- |
| `f2bf46a` | refactor: 헤더 효과 dots 제거(의미 없는 장식)                   |
| `4c2c9ec` | refactor: `.mg-check` 스타일 중복 제거(전역 규칙으로 일원화)    |
| `74a4a45` | docs: 시트 개편 로드맵 spec                                     |
| `45a93d8` | docs: 데이터 모델 확장 plan                                     |
| `a59622f` | feat: config 상수(CAREER/ORG/EFFECT_TYPES)                      |
| `3da114c` | feat: gender/age 분리 + effectType/trueFormRevealed 필드        |
| `dc2460d` | feat: genderAge → gender 마이그레이션                           |
| `c0c3204` | docs: ② 단계용 genderAge 템플릿 바인딩 추적 노트                |
| `46c3d28` | docs: 스테이지 ② 헤더 개편 spec                                 |
| `62d659e` | docs: 스테이지 ② 헤더 개편 plan                                 |
| `d5aa154` | feat: mg-field partial에 fieldClass/valueClass 파라미터         |
| `0e7d522` | feat: 식별그리드 재구성(datalist/effect select/진정한모습 토글) |
| `3c3d038` | feat: portcol 레이아웃 + key/muted 강조 위계                    |

spec/plan: `docs/superpowers/specs/2026-06-19-sheet-redesign-roadmap-design.md`,
`…/2026-06-19-stage2-header-redesign-design.md`,
`docs/superpowers/plans/2026-06-19-data-model-expansion.md`,
`…/2026-06-19-stage2-header-redesign.md`.

## 2. 스테이지 ① 데이터 모델 (완료)

- `character.mjs`: `effectType`(choices=EFFECT_TYPES, initial "없음"), `gender`/`age`(분리),
  `trueFormRevealed`(boolean) 추가. `genderAge` 제거 + `migrateData`로 `gender` 이관.
- `config.mjs`: `CAREER_OPTIONS`/`ORG_OPTIONS`(datalist 추천목록), `EFFECT_TYPES`.
- 테스트: `test/character-model.test.mjs`, `test/config.test.mjs`(총 38개 통과).

## 3. 스테이지 ② 헤더 개편 (커밋 완료 · ⚠️ 실렌더 미검증)

- `mg-field.hbs`: 선택적 `fieldClass`(label)·`valueClass`(input) 파라미터.
- 식별그리드(`character-sheet.hbs`): 임시이름/마법명(`--lg`), 경력/기관 datalist,
  진정한모습(mark·label 사이 `mg-check`=`trueFormRevealed` 토글), 효과(`--box`+`effectType` select),
  혼의특기(`soulSkill`, accent). `player`/`socialStatus`/`genderAge` 바인딩 제거.
- `mg-portcol`: 초상화 + 공적점/마화 카운터 묶음. statrail은 공격/방어/근원·마력=`--key`,
  일시마력·계제=`--muted`, 순서 stats→마력→일시마력→계제.
- `actor-sheet.mjs`: `_prepareContext`에 careerOptions/orgOptions/effectTypes 전달,
  `toggleTrueForm` 액션. 입력은 `submitOnChange` 자동 저장.
- 신규 SCSS: `mg-ident-select`(+`--wide`), `mg-portcol`, `mg-field--lg/--box`,
  `mg-stat--key/--muted`, `mg-gauge--key/--muted`, `mg-counter--muted`.
- 최종 리뷰(opus): Ready to merge = Yes. 빌드/38테스트 통과.
- **⚠️ Foundry 실렌더 미확인** — 사용자가 디자인 대폭 재변경을 결정하여 검증 생략.

## 4. 다음 작업 & 보류

### 다음: 장서/관계 Item화

- `spells`/`anchors` ArrayField → Foundry Item 문서 방식 전환. 메모리 `grimoire-item-migration`.
- 디자인과 비교적 독립적인 데이터 구조 작업이라 먼저 진행.

### 보류 (디자인 대폭 재변경 예정)

- 시트 디자인을 큰 폭으로 다시 바꿀 예정 → 아래는 새 디자인 확정 후 재계획:
  - 스테이지 ③ 정보 탭(`player`/`socialStatus`/`gender`/`age` 입력 — **현재 이 4필드는 입력 UI가
    없는 상태**. 데이터/마이그레이션은 ①에 존재).
  - 스테이지 ④ 라이트 테마(`scss/theme/_tokens.scss`에 `.theme-light`; config `themes`는 이미 존재).
  - 헤더 실렌더 검증·`example.html` 동기화.
- 미처리 Minor: `scss/sheet/_layout.scss`의 `.mg-counter-row` 중복 규칙(`:27` portcol scope + standalone)
  통합 — 헤더 재디자인 시 함께 정리.
- 시안 파일: `docs/design/magilogi_2.html`(다크/라이트). **재디자인 시 무효화 가능**.

## 5. 함정 / 참고

- 탭 시스템 함정(nav `tabs` 클래스, `active` 클래스)은 `2026-06-19-tabs-and-tables.md` 참조.
- 시트 액션은 단위테스트 인프라 없음(ApplicationV2) — `toggleStatus`/`toggleTrueForm` 등 무테스트.
- `docs/feature` 파일이 working tree에 수정된 채 있었음(작업과 무관, 미커밋) — 정체 확인 필요.
- 커밋 메시지: 영어 한 줄, co-author 없음(메모리 `commit-message-style`).

## 6. 참고 경로

- 시트 클래스: `module/sheets/actor-sheet.mjs`
- 데이터 모델: `module/data/actors/character.mjs`
- 설정 상수: `module/helpers/config.mjs`
- 템플릿: `templates/actor/character-sheet.hbs`, `parts/{mg-field,magic-chart,grimoire,relations}.hbs`
- 스타일: `scss/` (엔트리 `magicalogia.scss`, 레이아웃 `sheet/_layout.scss`, 컴포넌트 `component/`)
