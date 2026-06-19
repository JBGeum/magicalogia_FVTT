# 시트 개편 로드맵 — 설계 (2026-06-19)

> 새 시안 `docs/design/magilogi_2.html`(example.html 기반 재작업)을 현재 구현에 반영하기
> 위한 상위 로드맵. 4개 작업으로 분해하며, 각 작업은 자체 spec→plan→구현 사이클을 갖는다.
> 이 문서는 상위 인덱스이자 ① 데이터 모델 작업의 상세 설계를 겸한다.

## 배경

`magilogi_2.html`은 단순 스냅샷이 아니라 헤더 식별부 재구성, 강조 위계 도입, 정보 탭
신설, 라이트 테마 토큰을 포함한 본격 개편안이다. 변경점이 데이터 모델·표현 계층에
걸쳐 있어 단일 작업으로 묶기엔 크다. 의존성에 따라 4개로 분해한다.

## 진행 순서 (접근 A — 의존성 위상순서)

```
① 데이터 모델 확장 → ② 헤더 전면 개편 → ③ 정보 탭 신설 → ④ 라이트 테마 이식
```

- ①은 ②③의 선행조건(신규 필드에 UI가 의존).
- ④는 완전 독립이나, 마크업이 다 바뀐 **마지막**에 두어 토큰 재검증/재작업을 없앤다.
- 기존 메모리 `next-work-order`(라이트 테마 먼저)는 이 개편안 등장 전 기준이므로 본
  로드맵으로 갱신한다.

---

## ① 데이터 모델 확장 (선행)

②③의 토대. 이 작업만 본 문서에서 상세화하고, 나머지는 윤곽만 둔다.

### 확정 네이밍

| 필드                      | 타입               | 비고                                                        |
| ------------------------- | ------------------ | ----------------------------------------------------------- |
| `effectType`              | StringField        | choices = `EFFECT_TYPES`, initial `"없음"`                  |
| `gender`                  | StringField        | initial `""`                                                |
| `age`                     | StringField        | initial `""` — 자유 입력("불명","20대" 등) 허용 위해 문자열 |
| `trueFormRevealed`        | BooleanField       | initial `false` — 진정한 모습 공개/판명 여부                |
| `genderAge`               | (제거)             | `gender`로 마이그레이션 후 스키마에서 삭제                  |
| `career` / `organization` | StringField (유지) | datalist는 표현 계층, 모델 변경 없음                        |
| `soulSkill`               | (기존 유지)        | 이미 존재 — UI 표시만 ②에서 추가                            |

### config.mjs 상수 추가

- `CAREER_OPTIONS` — 경력 datalist 추천목록(예: 서경/주화/야행 등 게임 규칙 목록)
- `ORG_OPTIONS` — 기관 datalist 추천목록(예: 마탑/결사 등)
- `EFFECT_TYPES` — `["없음", "지속", "순간", "장면"]`

> 입력 방식은 **목록+직접입력**(datalist). `career`/`organization`/효과 텍스트는 자유
> 입력을 유지하되 추천목록만 제공한다. `effectType`만 select(고정 choices).

### 마이그레이션

- `CharacterDataModel.migrateData`에서 기존 `genderAge` 값이 있으면 `gender`로 복사 후
  `genderAge` 키 제거. 개발 초기라 데이터가 희소하므로 split 없이 단순 이관.
- `age`는 빈 값으로 시작.

### 테스트 (vitest)

- 신규 필드 기본값 검증(`effectType==="없음"`, `trueFormRevealed===false`, `gender/age===""`).
- 마이그레이션: `{genderAge:"남/20"}` 입력 시 `gender==="남/20"`, `genderAge` 부재 확인.
- `EFFECT_TYPES` 외 값 거부(choices 검증).

---

## ② 헤더 전면 개편 (mg-headband 전체 · ①에 의존)

표현 계층 위주. 별도 spec에서 상세화.

- **식별그리드**: `mg-field--lg`(임시이름/마법명 강조), 경력/기관 datalist 입력,
  효과 `mg-field--box` + `effectType` select, 혼의특기(`soulSkill`) accent 표시,
  진정한모습 `mg-check`(`trueFormRevealed`) 토글.
- **강조 위계**: `mg-stat--key`/`--muted`, `mg-gauge--key`/`--muted`, `mg-counter--muted`.
- **레이아웃**: `mg-portcol`(초상화+공적점/마화 카운터 묶음), statrail 재배치
  (공격/방어/근원 → 마력 → 일시마력 → 계제).
- **신규 SCSS**: `mg-ident-select`(+`--wide`), `mg-portcol`, `mg-field--lg`, `mg-field--box`,
  `mg-stat--key`/`--muted`, `mg-gauge--key`/`--muted`, `mg-counter--muted`.
- 식별 정보 중 player/socialStatus/gender/age는 메인 그리드에서 제거 → 정보 탭(③)으로.

## ③ 정보 탭 신설 (①에 의존)

- `actor-sheet.mjs`의 `static TABS`에 `info` 탭 추가, `_prepareContext`의 tab active 처리.
- `templates/actor/parts/info.hbs` 신설 — player/socialStatus/gender/age 필드.
- 탭 시스템 함정(나브 `tabs` 클래스, `active` 클래스)은 기존 핸드오프
  `2026-06-19-tabs-and-tables.md` 참조.
- 시안은 관계 탭을 disabled로 표기했으나 **실제 관계 탭은 동작 유지**(시안 단순화 무시).

## ④ 라이트 테마 이식 (독립 · 마지막)

- `scss/theme/_tokens.scss`에 `.theme-light` 토큰 블록 이식(시안의 양피지 톤:
  `--mg-paper`/`--mg-panel`/`--mg-gold:#9a7430` 등).
- 테마 토글 수단(설정/시트 클래스) 검토.
- `example.html`/시안도 라이트 포함 상태로 동기화 확인.

---

## 범위 밖 (YAGNI)

- `mg-statbar*` 클래스: 시안 CSS에 정의는 있으나 마크업 미사용 → 이식하지 않는다.
- 시안 CSS에 남은 `mg-dot`/`mg-field__dots`: 이미 제거됨(`f2bf46a`), 무시.
- 장서/관계 Item 문서 전환: 별개 트랙(메모리 `grimoire-item-migration`), 본 로드맵 밖.
