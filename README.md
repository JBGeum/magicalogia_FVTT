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

## 컴펜디움 팩 (표 데이터)

표(RollTable) 데이터는 `packs/_source/tables.json`에 작성하면 빌드 시 LevelDB(`dist/packs/tables`)로 컴파일됩니다. 형식 참고용 `tables_example.json`만 저장소에 포함되며, 원본이 없으면 example로 fallback합니다.

```bash
# 1. 예시를 원본 파일명으로 복사
cp packs/_source/tables_example.json packs/_source/tables.json

# 2. JSON에 실제 데이터를 채운다
#    (_id 및 embedded(results 등) _id 는 16자 영숫자·고유해야 함)

# 3. 빌드 → dist/packs/tables (LevelDB) 생성
npm run build
```

원형(archetype)·장서(library) 등 저작권 콘텐츠는 시스템에 포함하지 않으며, 별도 컴펜디움 모듈로 제공됩니다(사용자 커스텀 덮어쓰기 방지).
