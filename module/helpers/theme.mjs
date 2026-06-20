import { MAGICALOGIA } from "./config.mjs";

/** 현재 테마 설정을 읽어 시트 루트 element에 테마 클래스를 부여한다. */
export function applyTheme(element) {
  if (!element) return;
  const theme = game.settings.get("magicalogia", "theme");
  element.classList.remove(MAGICALOGIA.themes.dark, MAGICALOGIA.themes.light);
  element.classList.add(MAGICALOGIA.themes[theme] ?? MAGICALOGIA.themes.dark);
}

/** 테마 클라이언트 설정 등록(init hook에서 호출). 변경 시 열린 시트에 즉시 반영. */
export function registerThemeSetting() {
  game.settings.register("magicalogia", "theme", {
    name: "MAGICALOGIA.settings.theme.name",
    hint: "MAGICALOGIA.settings.theme.hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      dark: "MAGICALOGIA.settings.theme.dark",
      light: "MAGICALOGIA.settings.theme.light",
    },
    default: "dark",
    onChange: () => {
      for (const app of foundry.applications.instances.values()) {
        if (app.element?.classList.contains("magicalogia")) applyTheme(app.element);
      }
    },
  });
}
