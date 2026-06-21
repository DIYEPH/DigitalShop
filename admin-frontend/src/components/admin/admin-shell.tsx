"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  Settings,
  Package,
  ShoppingCart,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe, logout } from "@/lib/api/auth";
import {
  ADMIN_SESSION_EXPIRED_EVENT,
  clearAdminSession,
  readAdminSession,
} from "@/lib/auth/session";
import { getAuthToken } from "@/lib/auth/token";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/admin/categories", label: "Danh mục", icon: FolderTree },
  { href: "/admin/coupons", label: "Mã giảm giá", icon: Ticket },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
] as const;

type AuthState = "checking" | "authed" | "guest";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    const { ok, token } = readAdminSession();

    if (!ok || !token) {
      clearAdminSession();
      queueMicrotask(() => setAuthState("guest"));
      router.replace("/login");
      return;
    }

    queueMicrotask(() => setAuthState("authed"));

    let cancelled = false;
    getMe(token).catch(() => {
      if (!cancelled) {
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

  const handleLogout = async () => {
    const t = getAuthToken();
    if (t) {
      try {
        await logout(t);
      } catch {
        // vẫn xóa token local nếu API lỗi
      }
    }
    clearAdminSession();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  if (authState === "guest") {
    return null;
  }

  const showNav = authState === "authed";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-11 max-w-[1400px] items-center justify-between gap-3 px-3">
          <div className="flex items-center gap-3">
            <h1 className="shrink-0 text-sm font-semibold tracking-tight text-gradient-brand">
              Quản trị
            </h1>
            {showNav ? (
              <nav className="hidden items-center gap-0.5 md:flex">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-gradient-brand text-primary-foreground shadow-(--shadow-sm) hover:opacity-95"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="icon-sm" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : (
              <div
                className="hidden h-7 w-48 animate-pulse rounded-md bg-muted md:block"
                aria-hidden
              />
            )}
          </div>

          {showNav ? (
            <Button
              type="button"
              variant="ghost"
              uiSize="sm"
              aria-label="Đăng xuất"
              onClick={handleLogout}
            >
              <LogOut className="icon-sm" aria-hidden />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          ) : (
            <div
              className="h-7 w-16 animate-pulse rounded-md bg-muted"
              aria-hidden
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-3 py-3">
        {showNav ? (
          children
        ) : (
          <p className="text-xs text-muted-foreground">Đang xác thực…</p>
        )}
      </main>
    </div>
  );
}
