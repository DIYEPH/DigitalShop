"use client";

import { useLanguage } from "@/lib/i18n/use-language";
import { DASHBOARD_NAV } from "./dashboard.constants";

export function useDashboard() {
  const { t } = useLanguage();
  const navItems = DASHBOARD_NAV.map((item) => ({
    href: item.href,
    label: t(item.labelKey),
  }));
  return { t, navItems };
}
