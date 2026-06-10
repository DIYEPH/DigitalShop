"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api/client";

export type ColorScheme = "light" | "dark";
export type SiteTheme = "default" | "summer" | "autumn" | "christmas" | "lunar_new_year" | "event" | "halloween";

const STORAGE_KEY_SCHEME = "digitalshop.colorScheme";
const STORAGE_KEY_SITE_THEME = "digitalshop.siteTheme";

interface Ctx {
  scheme: ColorScheme;
  setScheme: (t: ColorScheme) => void;
  toggleScheme: () => void;
  siteTheme: SiteTheme;
  setSiteTheme: (t: SiteTheme) => void;
}
const ThemeContext = createContext<Ctx | null>(null);

function getInitialScheme(): ColorScheme {
  if (typeof document === "undefined") return "light";
  try {
    return (localStorage.getItem(STORAGE_KEY_SCHEME) as ColorScheme | null)
      ?? (document.documentElement.getAttribute("data-scheme") as ColorScheme | null)
      ?? "light";
  } catch {
    return (document.documentElement.getAttribute("data-scheme") as ColorScheme | null) ?? "light";
  }
}

function getInitialSiteTheme(): SiteTheme {
  if (typeof document === "undefined") return "default";
  try {
    return (localStorage.getItem(STORAGE_KEY_SITE_THEME) as SiteTheme | null)
      ?? (document.documentElement.getAttribute("data-theme") as SiteTheme | null)
      ?? "default";
  } catch {
    return (document.documentElement.getAttribute("data-theme") as SiteTheme | null) ?? "default";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>(getInitialScheme);
  const [siteTheme, setSiteThemeState] = useState<SiteTheme>(getInitialSiteTheme);

  const setScheme = useCallback((t: ColorScheme) => {
    setSchemeState(t);
    document.documentElement.setAttribute("data-scheme", t);
    try { localStorage.setItem(STORAGE_KEY_SCHEME, t); } catch {}
  }, []);

  const setSiteTheme = useCallback((t: SiteTheme) => {
    setSiteThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(STORAGE_KEY_SITE_THEME, t); } catch {}
  }, []);

  // Backend-driven theme (production-ready): backend can override season theme.
  useEffect(() => {
    apiFetch<{ theme: SiteTheme }>(`/api/theme`, { method: "GET", cache: "no-store" })
      .then((r) => {
        if (r.theme && r.theme !== siteTheme) setSiteTheme(r.theme);
      })
      .catch(() => {
        // ignore: fallback to localStorage/time-based init
      });
  }, [setSiteTheme, siteTheme]);

  return (
    <ThemeContext.Provider
      value={{
        scheme,
        setScheme,
        toggleScheme: () => setScheme(scheme === "dark" ? "light" : "dark"),
        siteTheme,
        setSiteTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider />");
  return ctx;
}

/** Inline script applied before hydration to avoid FOUC. */
export const themeInitScript = `
(function(){
  try{
    var scheme=localStorage.getItem('${STORAGE_KEY_SCHEME}');
    if(!scheme){scheme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
    document.documentElement.setAttribute('data-scheme',scheme);

    var theme=localStorage.getItem('${STORAGE_KEY_SITE_THEME}');
    if(!theme){
      var m=(new Date()).getMonth(); // 0..11
      theme='default';
      if(m===11) theme='christmas';
      // April (m=3) onwards is considered summer for this storefront
      if(m===3||m===4||m===5) theme='summer';
      if(m===8) theme='autumn';
      if(m===9) theme='halloween'; // October = Halloween
    }
    document.documentElement.setAttribute('data-theme',theme);
  }catch(e){}
})();
`;
