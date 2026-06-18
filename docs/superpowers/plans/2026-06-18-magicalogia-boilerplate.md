# 마기카로기아 보일러플레이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Foundry VTT V13용 마기카로기아 시스템의 동작하는 빈 골격(보일러플레이트)을 구축한다.

**Architecture:** aster_FVTT와 동일한 Vite(lib 모드 ESM 번들) + DataModel(TypeDataModel) + ApplicationV2 시트 구조. template.json 없이 `system.json`의 `documentTypes`와 각 DataModel의 `defineSchema()`가 스키마를 책임진다. 진입점 `module/magicalogia.mjs`가 init 훅에서 documentClass·dataModels·시트를 등록한다.

**Tech Stack:** Node ≥20, Vite 8, vite-plugin-static-copy, SCSS(sass), ESLint 10(flat) + typescript-eslint, Prettier, Husky + lint-staged + commitlint, vitest, TypeScript(typecheck only) + fvtt-types, @foundryvtt/foundryvtt-cli.

## Global Constraints

- **시스템 id**: `magicalogia` (모든 경로·등록 키·`systems/magicalogia/...` 템플릿 경로에 정확히 사용)
- **Foundry 호환**: minimum `13`, verified `13`, maximum `14`
- **Node**: `>=20`
- **소스 확장자**: 런타임 코드는 `.mjs`, 빌드/도구 스크립트는 `.mts`/`.ts`
- **모듈 타입**: `package.json`에 `"type": "module"`
- **V13 네임스페이스**: 컬렉션은 `foundry.documents.collections.Actors/Items`, 시트는 `foundry.applications.api.HandlebarsApplicationMixin` + `foundry.applications.sheets.ActorSheetV2/ItemSheetV2`, 템플릿 로드는 `foundry.applications.handlebars.loadTemplates`
- **template.json 사용 안 함** (DataModel-only)
- **언어**: 한국어(`lang/ko.json`) 1종
- **i18n 키 접두사**: `MAGICALOGIA.`
- **CONFIG 상수 네임스페이스**: `CONFIG.MAGICALOGIA`
- **커밋**: Conventional Commits. 각 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` 추가

---

## Task 1: 프로젝트 스캐폴딩 + 빌드/품질 파이프라인

빈 repo에 패키지 정의·빌드/lint/test/typecheck 설정을 깔고, 샘플 테스트로 파이프라인이 도는지 확인한다.

**Files:**
- Create: `package.json`, `.gitignore`, `.prettierrc.json`, `.prettierignore`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `commitlint.config.js`
- Create: `test/sample.test.mjs`

**Interfaces:**
- Produces: npm 스크립트 `build`, `dev`, `typecheck`, `lint`, `format`, `test`, `link:foundry`, `build:packs`, `prepare`. 빌드 진입점은 `module/magicalogia.mjs`(Task 4에서 생성), 출력은 `dist/`.

- [ ] **Step 1: `package.json` 작성**

```json
{
  "name": "magicalogia",
  "version": "0.1.0",
  "description": "Magicalogia - 마기카로기아 Foundry VTT system (V13+)",
  "type": "module",
  "private": true,
  "license": "MIT",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "vite build --mode development --watch",
    "build": "vite build && npm run build:packs",
    "build:packs": "tsx tools/build-packs.mts",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "link:foundry": "tsx tools/link-to-foundry.mts",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,mjs,ts,mts,cjs,cts}": ["eslint --fix", "prettier --write"],
    "*.{json,md,scss,css,html,hbs,handlebars,yml,yaml}": ["prettier --write"]
  },
  "devDependencies": {
    "@commitlint/cli": "^21.0.1",
    "@commitlint/config-conventional": "^21.0.1",
    "@eslint/js": "^10.0.1",
    "@foundryvtt/foundryvtt-cli": "^3.0.3",
    "@types/node": "^22.10.0",
    "eslint": "^10.4.0",
    "eslint-config-prettier": "^10.1.8",
    "fvtt-types": "github:League-of-Foundry-Developers/foundry-vtt-types#main",
    "globals": "^17.6.0",
    "husky": "^9.1.7",
    "lint-staged": "^17.0.5",
    "prettier": "^3.8.3",
    "sass": "^1.100.0",
    "tsx": "^4.22.3",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.60.0",
    "vite": "^8.0.14",
    "vite-plugin-static-copy": "^4.1.0",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: `.gitignore` 작성**

```gitignore
# IDE
.idea/
.vs/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# Node
node_modules/
npm-debug.log
.npm/
*.log

# Build outputs
dist/
.vite/
*.tsbuildinfo

# Foundry
*.lock
jsconfig.json
foundry/

# OS
.DS_Store
Thumbs.db

# Claude
/.claude/*
*.zip
```

- [ ] **Step 3: `.prettierrc.json` 작성**

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "overrides": [
    {
      "files": ["*.html", "*.hbs", "*.handlebars"],
      "options": { "printWidth": 120 }
    }
  ]
}
```

- [ ] **Step 4: `.prettierignore` 작성**

```gitignore
dist/
node_modules/
lib/
package-lock.json
```

- [ ] **Step 5: `tsconfig.json` 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "checkJs": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": false,
    "noUncheckedIndexedAccess": false,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "useDefineForClassFields": true,
    "types": ["vite/client", "fvtt-types"],
    "paths": {
      "@/*": ["./module/*"]
    }
  },
  "include": [
    "module/**/*",
    "tools/**/*",
    "test/**/*",
    "vite.config.ts",
    "vitest.config.ts",
    "eslint.config.js"
  ],
  "exclude": ["node_modules", "dist", "foundry"]
}
```

- [ ] **Step 6: `vite.config.ts` 작성**

```ts
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";

/**
 * Magicalogia Foundry VTT 시스템 Vite 빌드 설정.
 * 진입점 module/magicalogia.mjs → dist/module/magicalogia.mjs (ESM, lib 모드).
 * SCSS는 단일 magicalogia.css로 추출. 정적 자원은 viteStaticCopy로 dist/ 복사.
 */
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    root: ".",
    base: "./",
    publicDir: false,

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "module"),
      },
    },

    css: {
      devSourcemap: true,
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: isDev ? "inline" : true,
      minify: isDev ? false : "esbuild",
      target: "es2022",
      cssCodeSplit: false,
      lib: {
        entry: path.resolve(__dirname, "module/magicalogia.mjs"),
        formats: ["es"],
        fileName: () => "module/magicalogia.mjs",
      },
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name ?? "";
            if (name.endsWith(".css")) return "magicalogia.css";
            return "assets/[name][extname]";
          },
        },
      },
    },

    plugins: [
      viteStaticCopy({
        targets: [
          { src: "system.json", dest: "." },
          { src: "LICENSE.txt", dest: "." },
          { src: "CHANGELOG.md", dest: "." },
          { src: "templates", dest: "." },
          { src: "lang", dest: "." },
          { src: "lib", dest: "." },
          { src: "assets", dest: "." },
        ],
      }),
    ],
  };
});
```

- [ ] **Step 7: `vitest.config.ts` 작성**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.{test,spec}.{js,mjs,ts,mts}"],
    coverage: {
      reporter: ["text", "html"],
      include: ["module/**/*.{js,mjs,ts,mts}"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "module"),
    },
  },
});
```

- [ ] **Step 8: `eslint.config.js` 작성**

```js
// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "foundry/**", "lib/**", "coverage/**"],
  },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        foundry: "readonly",
        game: "readonly",
        ui: "readonly",
        canvas: "readonly",
        CONFIG: "readonly",
        CONST: "readonly",
        Hooks: "readonly",
        Roll: "readonly",
        ChatMessage: "readonly",
        Macro: "readonly",
        Item: "readonly",
        Actor: "readonly",
        Handlebars: "readonly",
        fromUuid: "readonly",
        $: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.{ts,mts,cts}"],
  })),

  {
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },

  {
    files: ["tools/**/*", "*.config.{js,ts,mjs,mts}"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "off",
    },
  },

  prettier,
);
```

- [ ] **Step 9: `commitlint.config.js` 작성**

```js
/**
 * Conventional Commits 규칙. 허용 type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
  },
};
```

- [ ] **Step 10: 샘플 테스트 `test/sample.test.mjs` 작성**

```js
import { describe, it, expect } from "vitest";

describe("boilerplate sanity", () => {
  it("vitest 파이프라인이 동작한다", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 11: 의존성 설치**

Run: `npm install`
Expected: `node_modules/` 생성, 에러 없이 완료. (`prepare` 스크립트가 husky를 실행하나 `.git`이 있으므로 통과. `.husky/`는 Task 6에서 채운다.)

- [ ] **Step 12: 테스트 + lint 실행으로 파이프라인 검증**

Run: `npm test`
Expected: PASS — "boilerplate sanity > vitest 파이프라인이 동작한다"

Run: `npm run lint`
Expected: 에러 0 (경고 허용)

- [ ] **Step 13: 커밋**

```bash
git add package.json package-lock.json .gitignore .prettierrc.json .prettierignore tsconfig.json vite.config.ts vitest.config.ts eslint.config.js commitlint.config.js test/sample.test.mjs
git commit -m "build: 빌드/품질 파이프라인 스캐폴딩

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 시스템 매니페스트 + 메타 파일 + 언어

Foundry가 시스템을 인식하는 데 필요한 `system.json`과 부속 메타·언어 파일을 만든다.

**Files:**
- Create: `system.json`, `LICENSE.txt`, `README.md`, `CHANGELOG.md`, `lang/ko.json`
- Create: `lib/.gitkeep`, `assets/.gitkeep` (viteStaticCopy 대상 디렉터리 존재 보장)

**Interfaces:**
- Produces: `documentTypes` = Actor:{character}, Item:{generic}. i18n 키 `MAGICALOGIA.*`. 이 타입 키는 Task 3의 dataModels, Task 5의 시트 PARTS와 정합해야 한다.

- [ ] **Step 1: `system.json` 작성**

```json
{
  "id": "magicalogia",
  "title": "Magicalogia",
  "description": "마기카로기아 - Foundry VTT 시스템",
  "version": "0.1.0",
  "compatibility": {
    "minimum": "13",
    "verified": "13",
    "maximum": "14"
  },
  "authors": [{ "name": "JBGeum" }],
  "esmodules": ["module/magicalogia.mjs"],
  "styles": ["magicalogia.css"],
  "scripts": [],
  "packs": [],
  "documentTypes": {
    "Actor": {
      "character": {}
    },
    "Item": {
      "generic": {}
    }
  },
  "languages": [
    {
      "lang": "ko",
      "name": "Korean",
      "path": "lang/ko.json"
    }
  ],
  "grid": {
    "distance": 1,
    "units": "m"
  },
  "primaryTokenAttribute": "health",
  "url": "",
  "manifest": "",
  "download": "",
  "license": "LICENSE.txt",
  "changelog": "CHANGELOG.md"
}
```

- [ ] **Step 2: `LICENSE.txt` 작성 (MIT)**

```text
MIT License

Copyright (c) 2026 JBGeum

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: `README.md` 작성**

```markdown
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
```

- [ ] **Step 4: `CHANGELOG.md` 작성**

```markdown
# Changelog

## 0.1.0 - 2026-06-18

- 보일러플레이트 초기 골격: 빌드/품질 파이프라인, character 액터 · generic 아이템, ApplicationV2 시트.
```

- [ ] **Step 5: `lang/ko.json` 작성**

```json
{
  "MAGICALOGIA": {
    "actor": {
      "health": "생명력",
      "biography": "설정"
    },
    "item": {
      "description": "설명"
    },
    "type": {
      "character": "캐릭터",
      "generic": "일반 아이템"
    }
  },
  "TYPES": {
    "Actor": {
      "character": "캐릭터"
    },
    "Item": {
      "generic": "일반 아이템"
    }
  }
}
```

- [ ] **Step 6: `lib/.gitkeep`, `assets/.gitkeep` 생성**

두 파일 모두 빈 파일로 생성. (viteStaticCopy가 `lib`·`assets`를 복사하므로 디렉터리가 존재해야 한다.)

- [ ] **Step 7: 검증 — JSON 유효성**

Run: `node --input-type=module -e "import fs from 'node:fs'; JSON.parse(fs.readFileSync('system.json','utf8')); JSON.parse(fs.readFileSync('lang/ko.json','utf8')); console.log('json ok')"`
Expected: `json ok`

- [ ] **Step 8: 커밋**

```bash
git add system.json LICENSE.txt README.md CHANGELOG.md lang/ko.json lib/.gitkeep assets/.gitkeep
git commit -m "feat: 시스템 매니페스트 · 메타 · 한국어 언어 파일

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 데이터 모델 (DataModel-only)

`TypeDataModel` 기반 스키마를 정의한다. base → character/generic 상속 구조.

**Files:**
- Create: `module/data/base-actor.mjs`, `module/data/base-item.mjs`
- Create: `module/data/actors/character.mjs`, `module/data/items/generic.mjs`
- Test: `test/data-models.test.mjs`

**Interfaces:**
- Produces:
  - `BaseActorModel` (export class) — schema: `health: { value, min, max }` (NumberField), `biography` (HTMLField)
  - `CharacterDataModel extends BaseActorModel`
  - `BaseItemModel` — schema: `description` (HTMLField)
  - `GenericItemDataModel extends BaseItemModel`
- 이 클래스들은 Task 4의 `magicalogia.mjs`가 `CONFIG.Actor.dataModels.character`, `CONFIG.Item.dataModels.generic`로 등록한다.

- [ ] **Step 1: 실패하는 테스트 작성 `test/data-models.test.mjs`**

`foundry.data.fields`는 Foundry 런타임에만 존재하므로, 테스트에서는 최소 스텁을 전역에 주입해 `defineSchema()`가 각 필드를 올바른 키로 생성하는지 검증한다.

```js
import { describe, it, expect, beforeAll } from "vitest";

// Foundry 런타임 전역 최소 스텁 — defineSchema가 참조하는 필드 팩토리만 모킹.
beforeAll(() => {
  class FakeField {
    constructor(opts = {}) {
      this.options = opts;
    }
  }
  globalThis.foundry = {
    data: {
      fields: {
        NumberField: FakeField,
        StringField: FakeField,
        HTMLField: FakeField,
        SchemaField: class extends FakeField {
          constructor(schema, opts) {
            super(opts);
            this.fields = schema;
          }
        },
      },
    },
    abstract: {
      // TypeDataModel을 단순 베이스로 스텁.
      TypeDataModel: class {},
    },
  };
});

describe("DataModels", () => {
  it("BaseActorModel 스키마에 health·biography가 있다", async () => {
    const { BaseActorModel } = await import("../module/data/base-actor.mjs");
    const schema = BaseActorModel.defineSchema();
    expect(Object.keys(schema)).toEqual(expect.arrayContaining(["health", "biography"]));
    expect(Object.keys(schema.health.fields)).toEqual(
      expect.arrayContaining(["value", "min", "max"]),
    );
  });

  it("CharacterDataModel은 base 스키마를 상속한다", async () => {
    const { CharacterDataModel } = await import("../module/data/actors/character.mjs");
    const schema = CharacterDataModel.defineSchema();
    expect(Object.keys(schema)).toEqual(expect.arrayContaining(["health", "biography"]));
  });

  it("BaseItemModel 스키마에 description이 있다", async () => {
    const { BaseItemModel } = await import("../module/data/base-item.mjs");
    expect(Object.keys(BaseItemModel.defineSchema())).toContain("description");
  });

  it("GenericItemDataModel은 base 스키마를 상속한다", async () => {
    const { GenericItemDataModel } = await import("../module/data/items/generic.mjs");
    expect(Object.keys(GenericItemDataModel.defineSchema())).toContain("description");
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run test/data-models.test.mjs`
Expected: FAIL — 모듈을 찾을 수 없음(`Cannot find module ../module/data/base-actor.mjs`)

- [ ] **Step 3: `module/data/base-actor.mjs` 작성**

```js
const fields = foundry.data.fields;

/**
 * 모든 Actor 타입이 공유하는 공통 스키마. 보일러플레이트 단계의 최소 필드.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class BaseActorModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({ initial: 10, min: 0, integer: true }),
        min: new fields.NumberField({ initial: 0, integer: true }),
        max: new fields.NumberField({ initial: 10, integer: true }),
      }),
      biography: new fields.HTMLField({ initial: "" }),
    };
  }
}
```

- [ ] **Step 4: `module/data/actors/character.mjs` 작성**

```js
import { BaseActorModel } from "../base-actor.mjs";

/**
 * character 액터 데이터 모델. 현 단계는 공통 스키마 상속만 — 마기카로기아 고유 필드의 확장 지점.
 */
export class CharacterDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
    };
  }
}
```

- [ ] **Step 5: `module/data/base-item.mjs` 작성**

```js
const fields = foundry.data.fields;

/**
 * 모든 Item 타입이 공유하는 공통 스키마.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class BaseItemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}
```

- [ ] **Step 6: `module/data/items/generic.mjs` 작성**

```js
import { BaseItemModel } from "../base-item.mjs";

/**
 * generic 아이템 데이터 모델. 현 단계는 공통 스키마 상속만 — 향후 아이템 타입 분화의 기준.
 */
export class GenericItemDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
    };
  }
}
```

- [ ] **Step 7: 테스트 실행 — 통과 확인**

Run: `npx vitest run test/data-models.test.mjs`
Expected: PASS — 4개 테스트 모두 통과

- [ ] **Step 8: 커밋**

```bash
git add module/data test/data-models.test.mjs
git commit -m "feat: character·generic DataModel 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Document 클래스 + 헬퍼 + 진입점

Document 서브클래스, config·templates 헬퍼, 그리고 모든 것을 등록하는 진입점 `magicalogia.mjs`를 만든다. (시트는 Task 5에서 import 추가.)

**Files:**
- Create: `module/documents/actor.mjs`, `module/documents/item.mjs`
- Create: `module/helpers/config.mjs`, `module/helpers/templates.mjs`
- Create: `module/magicalogia.mjs`
- Create: `scss/magicalogia.scss`, `scss/global/_base.scss`, `scss/sheet/_sheet.scss`

**Interfaces:**
- Consumes: Task 3의 `CharacterDataModel`, `GenericItemDataModel`.
- Produces:
  - `MagicalogiaActor extends Actor`, `MagicalogiaItem extends Item`
  - `MAGICALOGIA` 상수 객체 (export)
  - `preloadHandlebarsTemplates()`, `registerHandlebarsHelpers()` (export)
  - `magicalogia.mjs`: init 훅에서 documentClass·dataModels 등록 + SCSS import. 시트 등록은 Task 5에서 추가.

- [ ] **Step 1: `module/documents/actor.mjs` 작성**

```js
/**
 * Magicalogia Actor document. 현 단계는 기본 동작 그대로 — prepareDerivedData 등 확장 지점.
 * @extends {Actor}
 */
export class MagicalogiaActor extends Actor {}
```

- [ ] **Step 2: `module/documents/item.mjs` 작성**

```js
/**
 * Magicalogia Item document.
 * @extends {Item}
 */
export class MagicalogiaItem extends Item {}
```

- [ ] **Step 3: `module/helpers/config.mjs` 작성**

```js
/**
 * 시스템 전역 상수 단일 출처. CONFIG.MAGICALOGIA로 주입된다.
 */
export const MAGICALOGIA = {};
```

- [ ] **Step 4: `module/helpers/templates.mjs` 작성**

```js
/**
 * Handlebars 템플릿 preload. V13: loadTemplates는 foundry.applications.handlebars 네임스페이스.
 * @returns {Promise<Function[]>}
 */
export const preloadHandlebarsTemplates = async function () {
  const { loadTemplates } = foundry.applications.handlebars;
  return loadTemplates([
    "systems/magicalogia/templates/actor/character-sheet.hbs",
    "systems/magicalogia/templates/item/generic-sheet.hbs",
  ]);
};

/**
 * 공용 Handlebars 헬퍼 등록.
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("checked", (condition) => (condition ? "checked" : ""));
  Handlebars.registerHelper("selected", (condition) => (condition ? "selected" : ""));
}
```

- [ ] **Step 5: `scss/global/_base.scss` 작성**

```scss
// 전역 기본 — 보일러플레이트 골격. 시스템 클래스 스코프 안에서 확장한다.
.magicalogia.sheet {
  .sheet-body {
    padding: 0.5rem;
  }
}
```

- [ ] **Step 6: `scss/sheet/_sheet.scss` 작성**

```scss
// 시트 공통 레이아웃 골격.
.magicalogia.sheet {
  form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .resource {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
}
```

- [ ] **Step 7: `scss/magicalogia.scss` 작성**

```scss
@use "global/base";
@use "sheet/sheet";
```

- [ ] **Step 8: `module/magicalogia.mjs` 작성 (시트 등록 제외 — Task 5에서 추가)**

```js
// SCSS는 Vite가 번들 시 magicalogia.css로 추출한다.
import "../scss/magicalogia.scss";

// Documents
import { MagicalogiaActor } from "./documents/actor.mjs";
import { MagicalogiaItem } from "./documents/item.mjs";
// DataModels
import { CharacterDataModel } from "./data/actors/character.mjs";
import { GenericItemDataModel } from "./data/items/generic.mjs";
// Helpers
import { MAGICALOGIA } from "./helpers/config.mjs";
import { preloadHandlebarsTemplates, registerHandlebarsHelpers } from "./helpers/templates.mjs";

Hooks.once("init", async function () {
  game.magicalogia = {
    MagicalogiaActor,
    MagicalogiaItem,
  };

  CONFIG.MAGICALOGIA = MAGICALOGIA;

  CONFIG.Actor.documentClass = MagicalogiaActor;
  CONFIG.Item.documentClass = MagicalogiaItem;

  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
  };
  CONFIG.Item.dataModels = {
    generic: GenericItemDataModel,
  };

  registerHandlebarsHelpers();
  return preloadHandlebarsTemplates();
});
```

- [ ] **Step 9: lint + typecheck 검증**

Run: `npm run lint`
Expected: 에러 0 (경고 허용)

Run: `npm run typecheck`
Expected: 에러 0

- [ ] **Step 10: 커밋**

```bash
git add module/documents module/helpers module/magicalogia.mjs scss/
git commit -m "feat: document·헬퍼·진입점·SCSS 골격 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: ApplicationV2 시트 + 템플릿 + 시트 등록

character/generic 시트(ApplicationV2)와 최소 hbs 템플릿을 만들고, 진입점에 시트 등록을 추가한다.

**Files:**
- Create: `module/sheets/actor-sheet.mjs`, `module/sheets/item-sheet.mjs`
- Create: `templates/actor/character-sheet.hbs`, `templates/item/generic-sheet.hbs`
- Modify: `module/magicalogia.mjs` (시트 import + 등록 추가)

**Interfaces:**
- Consumes: Task 4의 `magicalogia.mjs` init 훅, `preloadHandlebarsTemplates`가 참조하는 템플릿 경로.
- Produces: `MagicalogiaActorSheet`, `MagicalogiaItemSheet` (export). init 훅에서 `foundry.documents.collections.Actors/Items`로 등록.

- [ ] **Step 1: `module/sheets/actor-sheet.mjs` 작성**

```js
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class MagicalogiaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "actor"],
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: {
      handler: MagicalogiaActorSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    character: {
      template: "systems/magicalogia/templates/actor/character-sheet.hbs",
    },
  };

  get title() {
    return this.actor.name;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = [this.document.type];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actorData = this.actor.toObject(false);
    context.actor = this.actor;
    context.system = actorData.system;
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    context.cssClass = this.actor.type;
    context.enrichedBiography =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.biography,
        { secrets: this.actor.isOwner },
      );
    return context;
  }

  static async #onSubmit(_event, _form, formData) {
    await this.actor.update(formData.object);
  }
}
```

- [ ] **Step 2: `module/sheets/item-sheet.mjs` 작성**

```js
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class MagicalogiaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["magicalogia", "sheet", "item"],
    position: { width: 480, height: "auto" },
    window: { resizable: true },
    form: {
      handler: MagicalogiaItemSheet.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    generic: {
      template: "systems/magicalogia/templates/item/generic-sheet.hbs",
    },
  };

  get title() {
    return this.item.name;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = [this.document.type];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const itemData = this.item.toObject(false);
    context.item = this.item;
    context.system = itemData.system;
    context.editable = this.isEditable;
    context.owner = this.item.isOwner;
    context.cssClass = this.item.type;
    context.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.item.system.description,
        { secrets: this.item.isOwner },
      );
    return context;
  }

  static async #onSubmit(_event, _form, formData) {
    await this.item.update(formData.object);
  }
}
```

- [ ] **Step 3: `templates/actor/character-sheet.hbs` 작성**

```hbs
<form class="{{cssClass}}" autocomplete="off">
  <section class="sheet-body">
    <div class="resource">
      <label>{{localize "MAGICALOGIA.actor.health"}}</label>
      <input type="number" name="system.health.value" value="{{system.health.value}}" />
      <span>/</span>
      <input type="number" name="system.health.max" value="{{system.health.max}}" />
    </div>

    <div class="biography">
      <label>{{localize "MAGICALOGIA.actor.biography"}}</label>
      {{editor enrichedBiography target="system.biography" button=true editable=editable}}
    </div>
  </section>
</form>
```

- [ ] **Step 4: `templates/item/generic-sheet.hbs` 작성**

```hbs
<form class="{{cssClass}}" autocomplete="off">
  <section class="sheet-body">
    <div class="description">
      <label>{{localize "MAGICALOGIA.item.description"}}</label>
      {{editor enrichedDescription target="system.description" button=true editable=editable}}
    </div>
  </section>
</form>
```

- [ ] **Step 5: `module/magicalogia.mjs`에 시트 import 추가**

기존 DataModels import 블록 아래(`import { GenericItemDataModel } ...` 다음 줄)에 추가:

```js
// Sheets
import { MagicalogiaActorSheet } from "./sheets/actor-sheet.mjs";
import { MagicalogiaItemSheet } from "./sheets/item-sheet.mjs";
```

- [ ] **Step 6: `module/magicalogia.mjs` init 훅에 시트 등록 추가**

`CONFIG.Item.dataModels = { generic: GenericItemDataModel };` 블록과 `registerHandlebarsHelpers();` 사이에 추가:

```js
  // V13: 시트 컬렉션은 foundry.documents.collections 네임스페이스.
  const ActorsCls = foundry.documents.collections.Actors;
  const ItemsCls = foundry.documents.collections.Items;

  ActorsCls.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  ActorsCls.registerSheet("magicalogia", MagicalogiaActorSheet, { makeDefault: true });
  ItemsCls.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  ItemsCls.registerSheet("magicalogia", MagicalogiaItemSheet, { makeDefault: true });
```

- [ ] **Step 7: lint + typecheck 검증**

Run: `npm run lint`
Expected: 에러 0

Run: `npm run typecheck`
Expected: 에러 0

- [ ] **Step 8: 커밋**

```bash
git add module/sheets templates/ module/magicalogia.mjs
git commit -m "feat: ApplicationV2 시트·템플릿 추가 및 등록

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 개발 도구(link/packs) + Husky + 최종 빌드 검증

Foundry 연동/팩 빌드 도구와 git 훅을 붙이고, 전체 빌드가 동작하는 dist를 산출하는지 최종 검증한다.

**Files:**
- Create: `tools/link-to-foundry.mts`, `tools/build-packs.mts`
- Create: `.husky/pre-commit`, `.husky/commit-msg`

**Interfaces:**
- Consumes: Task 1~5의 전체 빌드 산출물. `build-packs.mts`는 `system.json`의 빈 `packs`와 정합(현재 팩 없음 → no-op).
- Produces: `npm run build`가 `dist/`에 `module/magicalogia.mjs` · `magicalogia.css` · `system.json` 등 산출.

- [ ] **Step 1: `tools/link-to-foundry.mts` 작성**

```ts
/**
 * dist/ 를 Foundry의 Data/systems/magicalogia 로 심볼릭 링크.
 *
 * 사용법:
 *   $env:FOUNDRY_DATA_PATH = "C:\Users\me\AppData\Local\FoundryVTT\Data"
 *   npm run link:foundry
 *   # 또는: npm run link:foundry -- "C:\path\to\Data"
 */
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { platform } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SYSTEM_ID = "magicalogia";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const distDir = path.join(repoRoot, "dist");

function getFoundryDataPath(): string {
  const dataPath = process.argv[2] ?? process.env.FOUNDRY_DATA_PATH;
  if (!dataPath) {
    console.error(
      [
        "Foundry data 경로를 찾을 수 없습니다. 다음 중 하나로 지정하세요:",
        '  - 환경변수: $env:FOUNDRY_DATA_PATH = "<path-to-Data>"',
        '  - 명령 인자: npm run link:foundry -- "<path-to-Data>"',
        "참고(Windows 기본): C:\\Users\\<USER>\\AppData\\Local\\FoundryVTT\\Data",
      ].join("\n"),
    );
    process.exit(1);
  }
  return path.resolve(dataPath);
}

function ensureDistBuilt(): void {
  if (!existsSync(distDir)) {
    console.error(`dist/ 가 없습니다. 먼저 \`npm run build\` 실행. (경로: ${distDir})`);
    process.exit(1);
  }
}

function ensureSystemsDir(dataPath: string): string {
  const systemsDir = path.join(dataPath, "Data", "systems");
  if (!existsSync(systemsDir)) {
    const alt = path.join(dataPath, "systems");
    if (existsSync(alt)) return alt;
    mkdirSync(systemsDir, { recursive: true });
  }
  return systemsDir;
}

function linkDist(target: string, link: string): void {
  if (lstatSync(link, { throwIfNoEntry: false })) {
    const stat = lstatSync(link);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      rmSync(link, { recursive: true, force: true });
    } else {
      console.error(`기존 파일을 덮어쓰지 않습니다: ${link}`);
      process.exit(1);
    }
  }
  const type = platform() === "win32" ? "junction" : "dir";
  symlinkSync(target, link, type);
}

function main(): void {
  ensureDistBuilt();
  const dataPath = getFoundryDataPath();
  const systemsDir = ensureSystemsDir(dataPath);
  const linkPath = path.join(systemsDir, SYSTEM_ID);
  linkDist(distDir, linkPath);
  console.info("[link-to-foundry] 링크 생성 완료");
  console.info(`  source: ${distDir}`);
  console.info(`  target: ${linkPath}`);
  console.info("\nFoundry 재시작 후 시스템 목록에서 Magicalogia를 확인하세요.");
}

main();
```

- [ ] **Step 2: `tools/build-packs.mts` 작성 (현재 팩 없음 → 안전한 no-op)**

```ts
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { fileURLToPath } from "node:url";
import { rm, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * packs/_source/<pack> (JSON) → dist/packs/<pack> (LevelDB) 컴파일.
 * PACKS가 비어 있으면 no-op. 팩 추가 시 PACKS에 이름을 더하고 system.json packs에도 등록한다.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Item 팩 이름 목록. system.json의 packs[].path 와 정합. 현재 없음. */
const ITEM_PACKS: string[] = [];

for (const pack of ITEM_PACKS) {
  const srcFile = path.join(ROOT, "packs", "_source", `${pack}.json`);
  const dest = path.join(ROOT, "dist", "packs", pack);
  const staging = path.join(ROOT, "dist", ".pack-staging", pack);

  await rm(dest, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  let count = 0;
  if (existsSync(srcFile)) {
    const items = JSON.parse(await readFile(srcFile, "utf8"));
    for (const item of items) {
      item._key = `!items!${item._id}`;
      await writeFile(path.join(staging, `${item._id}.json`), JSON.stringify(item));
      count++;
    }
  }

  await compilePack(staging, dest, { log: true });
  await rm(staging, { recursive: true, force: true });
  console.log(`[build] ${pack}: ${count}개 아이템`);
}

console.log(`[build:packs] 완료 — 팩 ${ITEM_PACKS.length}개`);

// readdir는 향후 dir-기반 팩 확장용 import (현재 미사용 방지).
void readdir;
```

> 참고: `void readdir;`는 미사용 import 경고를 막기 위한 것. 거슬리면 `readdir` import를 빼도 된다. 안전하게는 import에서 `readdir` 제거를 권장 — 아래처럼 import 줄을 `import { rm, mkdir, readFile, writeFile } from "node:fs/promises";`로 바꾸고 마지막 `void readdir;` 줄을 삭제하라.

- [ ] **Step 3: `.husky/pre-commit` 작성**

```sh
npx lint-staged
```

- [ ] **Step 4: `.husky/commit-msg` 작성**

```sh
npx --no -- commitlint --edit "$1"
```

- [ ] **Step 5: 전체 빌드 실행**

Run: `npm run build`
Expected: 에러 0으로 완료. `[build:packs] 완료 — 팩 0개` 출력.

- [ ] **Step 6: dist 산출물 검증**

Run: `node -e "const fs=require('node:fs'); for (const p of ['dist/module/magicalogia.mjs','dist/magicalogia.css','dist/system.json','dist/templates/actor/character-sheet.hbs','dist/lang/ko.json']) { if(!fs.existsSync(p)) throw new Error('missing '+p); } console.log('dist ok')"`
Expected: `dist ok`

- [ ] **Step 7: 전체 파이프라인 재검증**

Run: `npm run lint`
Expected: 에러 0

Run: `npm run typecheck`
Expected: 에러 0

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 8: 커밋**

```bash
git add tools/ .husky/
git commit -m "build: foundry 연동·팩 빌드 도구 및 git 훅 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 9: (수동) Foundry 런타임 검증**

Run: `$env:FOUNDRY_DATA_PATH = "<Foundry Data 경로>"; npm run build; npm run link:foundry`
그 후 Foundry 기동 → 시스템 목록에 "Magicalogia" 표시 확인 → 새 월드 생성 → character 액터 생성 후 시트 오픈(생명력 입력·설정 에디터 동작) → generic 아이템 생성 후 시트 오픈(설명 에디터 동작).
Expected: 콘솔 에러 없이 두 시트 모두 정상 렌더.

---

## Self-Review 결과

- **Spec coverage**: 툴체인(Task 1) · system.json/documentTypes/lang(Task 2) · DataModel-only character·generic(Task 3) · documents/helpers/진입점(Task 4) · ApplicationV2 시트(Task 5) · tools/검증 기준(Task 6). spec 6절 검증 기준(build/lint/typecheck/test/런타임)은 Task 6 Step 5~9가 모두 커버.
- **Placeholder scan**: TBD/TODO 없음. 모든 코드 스텝에 완전한 내용 포함.
- **Type consistency**: 타입 키 `character`/`generic`가 system.json(Task 2)·dataModels(Task 4)·PARTS(Task 5) 전체에서 일치. 클래스명 `MagicalogiaActor/Item`, `Character/GenericItemDataModel`, `Magicalogia{Actor,Item}Sheet` 일관. `enrichedBiography`/`enrichedDescription` 컨텍스트 키가 시트와 hbs에서 정합.
