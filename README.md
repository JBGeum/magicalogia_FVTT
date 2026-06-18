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
