export type SellerShop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url: string | null;
  support_url: string | null;
  member_role: "OWNER" | "MANAGER" | "STAFF";
  created_at?: string;
  updated_at?: string;
};

const ACTIVE_SHOP_KEY = "digitalshop.admin.activeShopId.v1";

export function getActiveShopId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_SHOP_KEY);
  } catch {
    return null;
  }
}

export function setActiveShopId(shopId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_SHOP_KEY, shopId);
  } catch {}
}

export function clearActiveShopId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_SHOP_KEY);
  } catch {}
}
