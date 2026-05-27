import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthToken } from "@/lib/auth/use-auth-token";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { loadThemeAssetSrc } from "@/lib/theme/theme-assets";
import type { Locale } from "@/lib/i18n/config";
import type { ActiveTab } from "../store-tabs/store-tabs.types";
import type { StoreHeaderProps } from "./store-header.types";

function getPathSuffix(pathname: string | null, lang: Locale): string {
  const path = pathname || `/${lang}`;
  const prefix = `/${lang}`;
  if (path === prefix) return "";
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : "";
}

function getActiveTab(pathSuffix: string): ActiveTab | undefined {
  if (!pathSuffix) return "home";
  if (
    pathSuffix.startsWith("/products")
    || pathSuffix.startsWith("/categories")
    || pathSuffix.startsWith("/product")
    || pathSuffix.startsWith("/category")
  ) return "store";
  if (pathSuffix.startsWith("/cart") || pathSuffix.startsWith("/checkout")) return "cart";
  if (pathSuffix.startsWith("/orders") || pathSuffix.startsWith("/payment")) return "orders";
  return undefined;
}

export function useStoreHeader(props: StoreHeaderProps) {
  const { lang } = props;
  const { token } = useAuthToken();
  const hasToken = Boolean(token);
  const { toggleScheme, scheme, siteTheme } = useTheme();
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const pathname = usePathname();
  const pathSuffix = getPathSuffix(pathname, lang);
  const activeTab = getActiveTab(pathSuffix);

  useEffect(() => {
    let cancelled = false;
    loadThemeAssetSrc("logo", siteTheme, scheme)
      .then((src) => {
        if (!cancelled) setLogoSrc(src);
      })
      .catch(() => {
        if (!cancelled) setLogoSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [scheme, siteTheme]);

  return {
    hasToken,
    toggleScheme,
    logoSrc,
    pathSuffix,
    activeTab,
  };
}

