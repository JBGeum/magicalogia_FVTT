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
