# 핸드오프 — 새 시안 적용 시작(로드맵+S1 스펙 완료), 다음은 S1 plan (2026-06-19, 밤)

> 브랜치 `develop`. 다른 PC에서 이어가기 위한 노트.

## 0. ⚠️ 새 PC에서 먼저 할 일

```bash
git pull
npm install
npm run build      # dist/ 생성
npm test           # 48개 통과 확인
```

**중요 — 시안 파일은 git에 없음:** `docs/design/`(신·구 시안 전체)은 **gitignore 대상**이라 `git pull`로 넘어오지 않는다. 새 시안 `docs/design/new/`(특히 `example.html`, `styles/magicalogia.css`, `assets/divider.png`, SVG partial들)를 **이 PC에서 수동으로 복사**해 와야 S2 이후 SVG/divider 작업을 할 수 있다. (S1은 시안 없이도 스펙만으로 진행 가능 — 토큰값·프레임 규칙이 스펙에 인라인돼 있음.)

## 1. 지금까지 (이번 세션)

- **장서/관계 Item화 완료·푸시**(`ab82b73`..`ca20cdc`). Foundry 실렌더 확인됨. → 메모리 `grimoire-item-migration`.
- `docs/feature` 빈 플레이스홀더 제거(`2732bde`).
- **새 시안 적용 브레인스토밍 완료 → 로드맵+S1 스펙 작성**(`f993c1b`).

## 2. 새 시안 = 현재 디자인의 "진화판" (핵심 발견)

`docs/design/new/`의 새 목업은 처음부터 재작성이 아니다. **현재 시트가 이미 이 디자인의 `--mg-*` 토큰·구조 대부분을 구현**하고 있어, 컴포넌트 단위 추가/교체를 **단계분해**로 적용한다.

스펙: `docs/superpowers/specs/2026-06-19-newdesign-roadmap-and-stage1-design.md` (공통 결정 + 로드맵 + S1 상세).

## 3. 확정된 공통 결정 (모든 스테이지)

- **데이터 모델 유지 + 템플릿 재바인딩**(마이그레이션 없음). 경로 매핑표는 스펙 참조(예: 시안 `system.attack`→현 `system.abilities.attack`, `system.mana`→`system.mp`, `system.maHwa`→`system.mabloom`, `system.memo`→`system.biography`).
- **SCSS 분할 + Vite 유지**(시안 단일 CSS 그대로 안 씀, 내용만 재작성).
- 시안 V1 관용구(`data-edit`/`data-toggle`) → **V2 액션(`data-action`)**.
- **폰트 → Pretendard**(본문/디스플레이) + Cinzel(라틴). Nanum Myeongjo/Gowun Batang 제거.
- 라이트 테마는 **S5로 분리**.

## 4. 스테이지 로드맵

- **S1: 토큰 델타 + Pretendard 폰트 + 골드 프레임 모서리** ← 다음 작업
- S2: 헤더밴드 델타(초상화 SVG·divider·계제 등급명+플로리시·게이지/스탯 타일)
- S3: 상태칩 마크 + 마법표 아이콘/푸터 플로리시
- S4: 탭 재편(main/info/속성) + 장서·관계 아코디언화 + 정보 탭
- S5: 라이트 테마

각 스테이지는 자체 spec→plan→구현(subagent-driven) 사이클. 끝나면 시트가 정상 렌더되는 상태 유지.

## 5. 다음 작업 (S1) — 바로 이어서

스펙은 이미 승인·커밋됨. **다음 액션 = S1 구현 플랜 작성**:

1. brainstorming은 끝났으니 `superpowers:writing-plans` 스킬로 S1 plan 작성(스펙의 "Stage 1 상세" 기반).
2. 그 후 `superpowers:subagent-driven-development`로 실행.

S1 변경 요약(상세는 스펙):

- `_tokens.scss`: `--mg-soft`→#d4c8f6, `--mg-row-h`→21px, `--mg-head-h`→30px, 신규 `--mg-head-bg`/`--mg-head-ink`.
- `_vars.scss`: 폰트 → Pretendard.
- `magicalogia.scss`: @import를 Pretendard CDN + Cinzel로 교체.
- `_components.scss`: `.mg-content` 이중 골드선 + `.mg-fcorner`/`.mg-fdia`(시안 CSS 이식).
- `character-sheet.hbs`: `.mg-content` 안에 프레임 모서리 span 4개.
- 검증: build + 48테스트 + Foundry 실렌더(프레임 모서리·폰트).

## 6. 함정 / 참고

- **Foundry documentTypes 갱신은 서버 재시작 필요**(F5로 부족) — Item화 때 겪은 함정. S4 탭/구조 변경 시 주의.
- `docs/design`은 gitignore — §0 참조.
- 커밋 메시지: 영어 한 줄, co-author 없음(메모리 `commit-message-style`).
- lint-staged(prettier)가 커밋 시 md 표 정렬을 자동 수정함(정상).

## 7. 참고 경로

- 스펙: `docs/superpowers/specs/2026-06-19-newdesign-roadmap-and-stage1-design.md`
- 시안(gitignore): `docs/design/new/{example.html, styles/magicalogia.css, templates/, scripts/, assets/}`
- 현재 토큰/폰트: `scss/theme/_tokens.scss`, `scss/theme/_vars.scss`, `scss/magicalogia.scss`
- 현재 컴포넌트 SCSS: `scss/component/_components.scss`
- 메인 템플릿: `templates/actor/character-sheet.hbs`
