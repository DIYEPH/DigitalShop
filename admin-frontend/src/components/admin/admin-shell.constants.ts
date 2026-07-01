import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Ticket,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/types";

export const ADMIN_NAV_ITEMS: Array<{
  href: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
}> = [
  { href: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/admin/products", labelKey: "nav.products", icon: Package },
  { href: "/admin/orders", labelKey: "nav.orders", icon: ShoppingCart },
  { href: "/admin/coupons", labelKey: "nav.coupons", icon: Ticket },
  { href: "/admin/settings", labelKey: "nav.settings", icon: Settings },
];
