"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { useRouter } from "next/navigation";
import { getMe, logout } from "@/lib/api/auth";
import { createShop, listShops } from "@/lib/api/shops";
import {
  ADMIN_SESSION_EXPIRED_EVENT,
  clearAdminSession,
  readAdminSession,
} from "@/lib/auth/session";
import { getAuthToken } from "@/lib/auth/token";
import {
  getActiveShopId,
  setActiveShopId,
  type SellerShop,
} from "@/lib/shop-context";

type AuthState = "checking" | "authed" | "guest";
type Profile = Awaited<ReturnType<typeof getMe>>;
type Router = ReturnType<typeof useRouter>;

export function useAdminShell(router: Router) {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shops, setShops] = useState<SellerShop[]>([]);
  const [shopsLoaded, setShopsLoaded] = useState(false);
  const [activeShopId, setActiveShopIdState] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopSlug, setShopSlug] = useState("");
  const [creatingShop, setCreatingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);

  useEffect(() => {
    const { ok, token } = readAdminSession();

    if (!ok || !token) {
      clearAdminSession();
      queueMicrotask(() => setAuthState("guest"));
      router.replace("/login");
      return;
    }

    queueMicrotask(() => setAuthState("authed"));
    setShopsLoaded(false);

    let cancelled = false;
    getMe(token)
      .then(async (me) => {
        if (cancelled) return;
        setProfile(me);
        const shopResult = await listShops(token);
        if (cancelled) return;
        const sellerShops = shopResult.shops;
        setShops(sellerShops);
        setShopsLoaded(true);
        const storedShopId = getActiveShopId();
        const selected = sellerShops.find((shop) => shop.id === storedShopId) ?? sellerShops[0];
        if (selected) {
          setActiveShopId(selected.id);
          setActiveShopIdState(selected.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShopsLoaded(true);
          clearAdminSession();
          setAuthState("guest");
          router.replace("/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const onExpired = () => {
      clearAdminSession();
      setAuthState("guest");
      router.replace("/login");
    };
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, onExpired);
    return () =>
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, onExpired);
  }, [router]);

  const selectShop = (shopId: string) => {
    setActiveShopId(shopId);
    setActiveShopIdState(shopId);
  };

  const handleSelectShop = (shopId: string) => {
    selectShop(shopId);
    router.refresh();
  };

  const handleLogout = async () => {
    const token = getAuthToken();
    if (token) {
      try {
        await logout(token);
      } catch {}
    }
    clearAdminSession();
    router.push("/login");
    router.refresh();
  };

  const handleCreateShop = async (event: FormEvent) => {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) return;
    setShopError(null);
    setCreatingShop(true);
    try {
      const shop = await createShop(token, {
        name: shopName.trim(),
        slug: shopSlug.trim().toLowerCase(),
      });
      setShops([shop]);
      setShopsLoaded(true);
      selectShop(shop.id);
      setProfile((current) =>
        current ? { ...current, can_create_shop: false, shops: [shop] } : current,
      );
      router.refresh();
    } catch (error) {
      setShopError(error instanceof Error ? error.message : "Create shop failed.");
    } finally {
      setCreatingShop(false);
    }
  };

  return {
    authState,
    profile,
    shops,
    shopsLoaded,
    activeShopId,
    shopName,
    setShopName,
    shopSlug,
    setShopSlug,
    creatingShop,
    shopError,
    handleSelectShop,
    handleLogout,
    handleCreateShop,
  };
}
