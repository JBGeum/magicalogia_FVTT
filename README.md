# Magicalogia (마기카로기아) — Foundry VTT System

Foundry VTT V13+ 용 마기카로기아 시스템. 현재 보일러플레이트(빈 골격) 단계입니다.

## 개발

```bash
npm install
npm run build          # dist/ 빌드
npm run dev            # watch 빌드
npm run link:foundry   # dist/ 를 Foundry Data/systems/magicalogia 로 심볼릭 링크
npm test               # vitest
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
```

## Foundry 연동

```bash
# Windows 예시 (관리자/개발자 모드 필요할 수 있음)
$env:FOUNDRY_DATA_PATH = "C:\Users\<USER>\AppData\Local\FoundryVTT\Data"
npm run build
npm run link:foundry
```

## 컴펜디움 팩 (표·원형 데이터)

표(RollTable)·원형(Actor) 데이터는 `packs/_source/<name>.json`에 작성하면 빌드 시 LevelDB(`dist/packs/<name>`)로 컴파일됩니다. 실제 데이터는 저작권 보호를 위해 커밋하지 않습니다(`packs/_source/*.json` gitignore). 형식 참고용 `*_example.json`만 저장소에 포함됩니다.

```bash
# 1. 예시를 원본 파일명으로 복사
cp packs/_source/tables_example.json packs/_source/tables.json
cp packs/_source/archetypes_example.json packs/_source/archetypes.json

# 2. JSON에 실제 데이터를 채운다
#    (_id 및 embedded(results 등) _id 는 16자 영숫자·고유해야 함)

# 3. 빌드 → dist/packs/<name> (LevelDB) 생성
npm run build
```

- 원본 JSON이 없으면 해당 팩은 빈 채로 생성됩니다(에러 없음).
- 새 팩 추가 시 `tools/build-packs.mts`의 `PACKS`와 `system.json`의 `packs`에 함께 등록하세요.
