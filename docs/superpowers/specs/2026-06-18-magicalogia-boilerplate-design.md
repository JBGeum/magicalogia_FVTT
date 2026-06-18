# 마기카로기아(Magicalogia) Foundry VTT 시스템 보일러플레이트 설계

- **작성일**: 2026-06-18
- **대상**: Foundry VTT V13+
- **시스템 id**: `magicalogia`
- **참고**: `aster_FVTT`(주 참고, 동일 툴체인), `amadeusTRPG_FVTT`, [asacolips boilerplate](https://github.com/asacolips-projects/boilerplate)

## 1. 목표와 범위

V13용 마기카로기아 시스템의 **동작하는 빈 골격**을 구축한다. 이번 단계의 완료 정의는 다음과 같다.

- Foundry가 시스템을 인식하고 로드한다.
- `character` 액터 시트와 `generic` 아이템 시트가 정상적으로 열린다.
- 빌드 / lint / typecheck / test 파이프라인이 모두 통과한다.

마기카로기아 고유 룰(특기표, 주문, 마법서, 공적점 등)은 **이번 범위 밖**이며 이후 단계에서 확장한다. 이 보일러플레이트는 그 확장의 기반이다.

비목표(Non-goals):
- 마기카로기아 게임 룰 구현
- 컴펜디움 팩 콘텐츠 채우기 (도구만 준비, 데이터는 비움)
- 다국어 (한국어 1종만, 영어 등은 이후)

## 2. 툴체인 (aster_FVTT 스택 그대로)

사용자의 검증된 기존 설정을 그대로 채택하여 학습 비용을 없애고 즉시 확장 가능하게 한다.

| 영역 | 도구 |
| --- | --- |
| 빌드 | Vite (lib 모드, ESM 단일 번들 → `dist/`) + `vite-plugin-static-copy` |
| 스타일 | SCSS → Vite가 단일 `magicalogia.css`로 추출 |
| 코드 품질 | ESLint + Prettier + eslint-config-prettier |
| 커밋 훅 | Husky + lint-staged + commitlint(config-conventional) |
| 테스트 | vitest |
| 타입체크 | TypeScript `--noEmit` (소스는 `.mjs`, 타입만 검사) + `fvtt-types` |
| 팩/연동 | `tools/build-packs.mts`, `tools/link-to-foundry.mts` (foundryvtt-cli) |

`package.json` 스크립트는 aster와 동일하게: `dev`, `build`, `build:packs`, `preview`, `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `test`, `test:watch`, `link:foundry`, `prepare`.

## 3. 디렉터리 구조

```
magicalogia_FVTT/
├─ module/
│  ├─ magicalogia.mjs           # 진입점: init/ready 훅, CONFIG 등록, SCSS import
│  ├─ documents/
│  │  ├─ actor.mjs              # MagicalogiaActor extends Actor
│  │  └─ item.mjs               # MagicalogiaItem extends Item
│  ├─ data/
│  │  ├─ base-actor.mjs         # BaseActorModel extends TypeDataModel
│  │  ├─ base-item.mjs          # BaseItemModel extends TypeDataModel
│  │  ├─ actors/character.mjs   # CharacterDataModel extends BaseActorModel
│  │  └─ items/generic.mjs      # GenericItemDataModel extends BaseItemModel
│  ├─ sheets/
│  │  ├─ actor-sheet.mjs        # MagicalogiaActorSheet (ApplicationV2)
│  │  └─ item-sheet.mjs         # MagicalogiaItemSheet (ApplicationV2)
│  └─ helpers/
│     ├─ config.mjs             # MAGICALOGIA 상수 객체
│     └─ templates.mjs          # preloadHandlebarsTemplates + registerHandlebarsHelpers
├─ templates/
│  ├─ actor/character-sheet.hbs # 최소 시트 템플릿
│  └─ item/generic-sheet.hbs
├─ scss/
│  ├─ magicalogia.scss          # 진입 + @use 골격
│  ├─ global/                   # 빈 골격
│  └─ component/                # 빈 골격
├─ lang/ko.json                 # 한국어 1종
├─ tools/
│  ├─ build-packs.mts           # aster에서 id만 교체
│  └─ link-to-foundry.mts       # aster에서 id만 교체
├─ test/sample.test.mjs         # 파이프라인 확인용 1개
├─ lib/                         # 외부 라이브러리 (필요 시)
├─ assets/                      # 정적 이미지 (빈 골격)
├─ system.json                  # id=magicalogia, V13 compatibility, documentTypes
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ eslint.config.js
├─ vitest.config.ts
├─ commitlint.config.js
├─ .gitignore
├─ .prettierrc
├─ LICENSE.txt
├─ README.md
└─ CHANGELOG.md
```

## 4. 데이터 모델 (제너릭 최소 골격)

`template.json`은 **사용하지 않는다**. V13 + DataModel에서는 `system.json`의 `documentTypes`와 각 DataModel의 `defineSchema()`가 스키마를 책임지므로 template.json은 중복이다. 이것이 aster(레거시로 병행)와의 유일한 의도적 차이이며, 깨끗한 보일러플레이트를 위해 DataModel-only로 간다.

### Actor: `character`

- `BaseActorModel` (공통 골격): 최소 필드만.
  - `health`: SchemaField { `value`, `min`, `max` } (NumberField, integer)
  - `biography`: HTMLField
- `CharacterDataModel extends BaseActorModel`: 현 단계에선 추가 필드 없이 상속만 (확장 지점 표시).

### Item: `generic`

- `BaseItemModel` (공통 골격):
  - `description`: HTMLField
- `GenericItemDataModel extends BaseItemModel`: 상속만.

`CONFIG.Actor.dataModels` / `CONFIG.Item.dataModels`에 등록하고, `system.json`의 `documentTypes`와 키를 정합시킨다.

## 5. 핵심 컴포넌트 책임

각 단위는 단일 책임을 가지며 잘 정의된 인터페이스로 통신한다.

- **`magicalogia.mjs`** — 부트스트랩. `init` 훅에서 documentClass/dataModels 등록, 시트 등록(V13 `foundry.documents.collections.Actors/Items`), `CONFIG.MAGICALOGIA` 주입, Handlebars 헬퍼/템플릿 preload. 비즈니스 로직 없음.
- **`documents/*.mjs`** — Document 서브클래스. 현 단계는 빈 확장(이후 prepareDerivedData 등 추가 지점).
- **`data/*.mjs`** — 스키마 정의(`defineSchema`)만. 검증·기본값 책임.
- **`sheets/*.mjs`** — `HandlebarsApplicationMixin(ActorSheetV2/ItemSheetV2)`. `_prepareContext`로 템플릿 데이터 구성, PARTS로 템플릿 연결. 최소 렌더만.
- **`helpers/config.mjs`** — 상수 단일 출처.
- **`helpers/templates.mjs`** — 템플릿 경로 preload, 공용 Handlebars 헬퍼.

## 6. 검증 기준 (완료 정의)

| 검증 | 명령 / 방법 | 기대 결과 |
| --- | --- | --- |
| 빌드 | `npm run build` | `dist/`에 `module/magicalogia.mjs`, `magicalogia.css`, `system.json` 등 산출, 에러 0 |
| Lint | `npm run lint` | clean |
| 타입체크 | `npm run typecheck` | clean |
| 테스트 | `npm test` | sample 테스트 통과 |
| 런타임 | `npm run link:foundry` 후 Foundry 기동 | 시스템 목록에 표시, 월드 생성 후 character 액터 / generic 아이템 생성 및 시트 오픈 정상 |

## 7. 의도적으로 제외한 것 (YAGNI)

- template.json (4절 사유)
- npc 등 추가 액터 타입
- 다중 아이템 타입
- Active Effects / Combat / 다이스 로직
- 다국어 (ko만)
- 테마 토글 등 aster의 부가 기능

이들은 마기카로기아 룰 구현 단계에서 필요할 때 도입한다.
