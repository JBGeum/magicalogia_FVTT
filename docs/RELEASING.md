# 릴리스 절차

릴리스는 버전 태그(`vX.Y.Z`) 푸시로 자동화되어 있다(`.github/workflows/release.yml`).

## 새 버전 릴리스하기

1. `CHANGELOG.md`에 새 버전 항목(`## X.Y.Z - YYYY-MM-DD`)을 추가 → 커밋/푸시.
2. 버전 태그를 만들어 푸시한다(태그가 버전의 단일 원천):

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. 태그 푸시에 트리거된 `Release` 워크플로가 자동으로:
   - 태그에서 버전을 추출해 `system.json`에 주입,
   - `npm run build`로 `dist/` 생성,
   - `dist/`를 `magicalogia.zip`으로 압축,
   - `CHANGELOG.md`의 해당 버전 섹션을 릴리스 노트로 사용해 GitHub Release를 생성하고 `system.json`·`magicalogia.zip`을 첨부.

## Foundry에 설치 (사용자 안내)

최초 1회만 아래 manifest URL을 Foundry의 "Install System"에 입력한다. 이후 업데이트는 자동 감지된다.

```
https://github.com/JBGeum/magicalogia_FVTT/releases/latest/download/system.json
```

## 공개 릴리스와 컴펜디움 데이터

공개 릴리스에 포함되는 컴펜디움 팩은 `*_example.json` 예시 데이터로 패키징된다(실제 표 데이터는 저작권 보호로 gitignore·로컬 전용).

## 버전 규약

- 태그 `vX.Y.Z` → `system.json` version `X.Y.Z`.
- 레포의 `system.json` version 필드는 워크플로가 덮어쓰므로 수동 동기화 불필요.
- `manifest`는 항상 `releases/latest/...`(고정), `download`는 해당 태그의 zip을 가리킨다.
