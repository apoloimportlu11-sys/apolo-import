import { describe, expect, it } from "vitest";
import {
  DEFAULT_FESTIVE_CONFIG,
  getActiveTheme,
  getAllThemes,
  isThemeInWindow,
  scheduleLabel,
  scheduleState,
  type FestiveConfig,
  type FestiveTheme,
} from "./festive-theme";

function config(partial: Partial<FestiveConfig> = {}): FestiveConfig {
  return {
    ...DEFAULT_FESTIVE_CONFIG,
    globalEnabled: true,
    ...partial,
  };
}

describe("calendario de temáticas", () => {
  it("muestra Navidad solo entre el 1 y el 26 de diciembre", () => {
    const theme = getAllThemes(DEFAULT_FESTIVE_CONFIG).find((item) => item.id === "navidad") as FestiveTheme;
    expect(isThemeInWindow(theme, "2026-12-10")).toBe(true);
    expect(isThemeInWindow(theme, "2026-11-07")).toBe(false);
    expect(isThemeInWindow(theme, "2026-12-27")).toBe(false);
  });

  it("cruza el año para Año Nuevo", () => {
    const theme = getAllThemes(DEFAULT_FESTIVE_CONFIG).find((item) => item.id === "ano-nuevo") as FestiveTheme;
    expect(isThemeInWindow(theme, "2026-12-31")).toBe(true);
    expect(isThemeInWindow(theme, "2027-01-02")).toBe(true);
    expect(isThemeInWindow(theme, "2026-01-03")).toBe(false);
    expect(scheduleLabel(theme, "2026-11-07")).toBe("Empieza el 27 dic");
    const halloween = getAllThemes(DEFAULT_FESTIVE_CONFIG).find((item) => item.id === "halloween-cancion-criolla") as FestiveTheme;
    expect(scheduleLabel(halloween, "2026-11-07")).toBe("Vuelve el 24 oct");
  });

  it("respeta una temporada con año completo y no la repite", () => {
    const theme: FestiveTheme = {
      ...getAllThemes(DEFAULT_FESTIVE_CONFIG)[0],
      startDate: "2026-11-01",
      endDate: "2026-11-15",
      repeatYearly: false,
    };
    expect(isThemeInWindow(theme, "2026-11-07")).toBe(true);
    expect(isThemeInWindow(theme, "2027-11-07")).toBe(false);
    expect(scheduleState(theme, "2026-11-20")).toBe("closed");
  });

  it("muestra la temática activada aunque su fecha todavía no llegue", () => {
    const off = getActiveTheme(config({ globalEnabled: false, activeThemeId: "navidad" }), "2026-12-10");
    expect(off).toBeNull();
    const early = getActiveTheme(config({ activeThemeId: "navidad" }), "2026-11-09");
    expect(early?.id).toBe("navidad");
    const paused = getActiveTheme(
      config({
        activeThemeId: "navidad",
        customThemes: [
          {
            ...getAllThemes(DEFAULT_FESTIVE_CONFIG).find((item) => item.id === "navidad")!,
            enabled: false,
          },
        ],
      }),
      "2026-12-10"
    );
    expect(paused).toBeNull();
  });

  it("un ajuste guardado pisa la temática original sin duplicarla", () => {
    const themes = getAllThemes(
      config({
        customThemes: [
          {
            id: "navidad",
            name: "Navidad Apolo (Diciembre)",
            category: "custom",
            enabled: true,
            tagline: "Nieve a medida",
            primaryColor: "#C41E3A",
            accentColor: "#2D6A4F",
            bannerBgGradient: "from-[#0F382A] via-[#1B4332] to-[#2D6A4F]",
            bannerTextColor: "#FFFFFF",
            icon: "🎄",
            effectType: "snow",
            effectIntensity: 0.5,
            effectsEnabled: false,
            showBadge: true,
            description: "Ajuste",
          },
        ],
      })
    );
    const christmas = themes.filter((theme) => theme.id === "navidad");
    expect(christmas).toHaveLength(1);
    expect(christmas[0].tagline).toBe("Nieve a medida");
    expect(christmas[0].effectIntensity).toBe(0.5);
    expect(christmas[0].effectsEnabled).toBe(false);
    expect(christmas[0].category).toBe("international");
    expect(christmas[0].startDate).toBe("12-01");
  });
});
