import type { SiteTheme, ColorScheme } from "./ThemeProvider";

export type ThemeAssetKey = "logo" | "header";

type ThemeAssetConfig = Partial<Record<ThemeAssetKey, Partial<Record<ColorScheme, string>>>>;

/**
 * Central theme assets registry.
 *
 * - Uses static public URLs.
 * - When a theme is missing an asset/scheme, we fallback to `default` or `light`.
 */
const ASSETS: Record<SiteTheme, ThemeAssetConfig> = {
  default: {
    logo: {
      light: "/images/themes/default/light/logo.png",
      dark: "/images/themes/default/dark/logo.png",
    },
    header: {
      light: "/images/themes/default/light/header.png",
      dark: "/images/themes/default/dark/header.png",
    },
  },
  summer: {
    logo: {
      light: "/images/themes/summer/light/logo.png",
      dark: "/images/themes/summer/dark/logo.png",
    },
    header: {
      light: "/images/themes/summer/light/header.png",
      dark: "/images/themes/summer/dark/header.png",
    },
  },
  autumn: {
    logo: {
      light: "/images/themes/autumn/light/logo.png",
      dark: "/images/themes/autumn/dark/logo.png",
    },
    header: {
      light: "/images/themes/autumn/light/header.png",
      dark: "/images/themes/autumn/dark/header.png",
    },
  },
  christmas: {
    logo: {
      light: "/images/themes/christmas/light/logo.png",
      dark: "/images/themes/christmas/dark/logo.png",
    },
    header: {
      light: "/images/themes/christmas/light/header.png",
      dark: "/images/themes/christmas/dark/header.png",
    },
  },
  lunar_new_year: {
    logo: {
      light: "/images/themes/lunar_new_year/light/logo.png",
      dark: "/images/themes/lunar_new_year/dark/logo.png",
    },
    header: {
      light: "/images/themes/lunar_new_year/light/header.png",
      dark: "/images/themes/lunar_new_year/dark/header.png",
    },
  },
  event: {
    logo: {
      light: "/images/themes/event/light/logo.png",
      dark: "/images/themes/event/dark/logo.png",
    },
    header: {
      light: "/images/themes/event/light/header.png",
      dark: "/images/themes/event/dark/header.png",
    },
  },
  halloween: {
    logo: {
      light: "/images/themes/halloween/light/logo.png",
      dark: "/images/themes/halloween/dark/logo.png",
    },
    header: {
      light: "/images/themes/halloween/light/header.png",
      dark: "/images/themes/halloween/dark/header.png",
    },
  },
};

function fallbackTheme(theme: SiteTheme): SiteTheme {
  return ASSETS[theme] ? theme : "default";
}

function fallbackScheme(scheme: ColorScheme): ColorScheme {
  return scheme === "dark" ? "dark" : "light";
}

export async function loadThemeAssetSrc(key: ThemeAssetKey, theme: SiteTheme, scheme: ColorScheme): Promise<string | null> {
  const t = fallbackTheme(theme);
  const s = fallbackScheme(scheme);

  const forTheme = ASSETS[t]?.[key];
  const src = forTheme?.[s] ?? forTheme?.light ?? ASSETS.default?.[key]?.[s] ?? ASSETS.default?.[key]?.light;
  return src ?? null;
}

