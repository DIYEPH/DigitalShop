"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Store } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-shell.constants";
import { useAdminShell } from "@/components/admin/use-admin-shell";
import { LANGUAGES } from "@/lib/i18n/constants";
import { useLanguage } from "@/lib/i18n/use-language";
import { cn } from "@/lib/cn";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const shell = useAdminShell(router);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  if (shell.authState === "guest") {
    return null;
  }

  const showNav = shell.authState === "authed";

  return (
    <div className="min-h-screen bg-brutal-muted">
      <header
        className="sticky top-0 z-100 isolate border-b-3 border-brutal"
        style={{ backgroundColor: "var(--brutal-bg)" }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
          <h1 className="min-w-0 shrink-0 text-lg font-black uppercase tracking-[0.08em] text-brutal-fg">
            {t("shell.title")}
          </h1>

          {showNav ? (
            <nav className="order-last flex w-full min-w-0 gap-2 overflow-x-auto pb-1 lg:order-0 lg:w-auto lg:flex-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-brutal border-3 border-brutal px-2.5 py-1.5 text-xs font-black uppercase transition-transform",
                      active
                        ? "bg-brutal-accent text-brutal-fg shadow-brutal-sm"
                        : "bg-brutal-bg text-brutal-fg hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div
              className="hidden h-7 w-48 animate-pulse rounded-brutal bg-brutal-muted md:block"
              aria-hidden
            />
          )}

          {showNav ? (
            <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
              {shell.shops.length > 0 ? (
                <Select
                  value={shell.activeShopId ?? undefined}
                  onValueChange={shell.handleSelectShop}
                >
                  <SelectTrigger
                    aria-label={t("shell.selectShop")}
                    className="h-10 w-36 min-w-0 px-3 py-1 text-sm sm:w-56"
                  >
                    <Store className="h-4 w-4 shrink-0" aria-hidden />
                    <SelectValue placeholder={t("shell.selectShop")} />
                  </SelectTrigger>
                  <SelectContent
                    sideOffset={8}
                    className="z-200"
                    style={{ backgroundColor: "var(--brutal-bg)" }}
                  >
                    {shell.shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as typeof language)}
              >
                <SelectTrigger aria-label="Language" className="h-9 w-20 px-3 py-1 text-sm">
                  <SelectValue placeholder="Lang" />
                </SelectTrigger>
                <SelectContent
                  align="end"
                  sideOffset={8}
                  className="z-200"
                  style={{
                    backgroundColor: "var(--brutal-bg)",
                    width: "var(--radix-select-trigger-width)",
                    minWidth: "var(--radix-select-trigger-width)",
                  }}
                >
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("common.logout")}
                onClick={shell.handleLogout}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{t("common.logout")}</span>
              </Button>
            </div>
          ) : (
            <div
              className="ml-auto h-7 w-16 animate-pulse rounded-brutal bg-brutal-muted"
              aria-hidden
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-3 py-4">
        {showNav && !shell.shopsLoaded ? (
          <p className="text-xs font-bold text-gray-600">{t("common.loading")}</p>
        ) : showNav && shell.shops.length === 0 && shell.profile?.can_create_shop ? (
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle className="text-base">{t("shell.createFirstShop")}</CardTitle>
              <CardDescription>{t("shell.createFirstShopHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={shell.handleCreateShop} className="grid gap-3">
                {shell.shopError ? <Alert variant="danger">{shell.shopError}</Alert> : null}
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase">{t("shell.shopName")}</span>
                  <Input
                    value={shell.shopName}
                    onChange={(event) => shell.setShopName(event.target.value)}
                    placeholder="My Digital Shop"
                    required
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase">{t("shell.shopSlug")}</span>
                  <Input
                    value={shell.shopSlug}
                    onChange={(event) => shell.setShopSlug(event.target.value)}
                    placeholder="my-digital-shop"
                    required
                  />
                </label>
                <Button type="submit" variant="primary" loading={shell.creatingShop}>
                  {t("shell.createShop")}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : showNav && shell.shops.length === 0 ? (
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle className="text-base">{t("shell.noShop")}</CardTitle>
              <CardDescription>{t("shell.noShopHint")}</CardDescription>
            </CardHeader>
          </Card>
        ) : showNav ? (
          children
        ) : (
          <p className="text-xs text-gray-600">{t("common.loading")}</p>
        )}
      </main>
    </div>
  );
}
