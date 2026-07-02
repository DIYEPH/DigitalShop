import type { DashboardNavItem } from "./dashboard.types";

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: "/admin/products", labelKey: "nav.products" },
  { href: "/admin/orders", labelKey: "nav.orders" },
  { href: "/admin/coupons", labelKey: "nav.coupons" },
  { href: "/admin/settings", labelKey: "nav.settings" },
];
