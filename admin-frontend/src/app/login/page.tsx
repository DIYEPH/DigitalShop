"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { readAdminSession } from "@/lib/auth/session";
import { setAuthToken } from "@/lib/auth/token";
import { useLanguage } from "@/lib/i18n/use-language";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0,
    [email, password],
  );

  useEffect(() => {
    const { ok } = readAdminSession();
    if (ok) router.replace("/admin");
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const e1 = email.trim();
    if (!isValidEmail(e1)) {
      setError(t("errors.invalidEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("errors.passwordMin"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(e1, password);
      setAuthToken(res.access_token);
      router.push("/admin");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "AUTH_002")
          setError(t("errors.sessionExpired"));
        else setError(err.message);
      } else setError("Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-brutal-muted px-4">
      <form
        onSubmit={onSubmit}
        className="relative grid w-full max-w-md gap-4 rounded-brutal border-3 border-brutal bg-brutal-bg p-6 shadow-brutal"
      >
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-brutal-fg">
            {t("login.title")}
          </h1>
          <p className="mt-1 text-sm font-bold text-gray-600">
            {t("login.subtitle")}
          </p>
        </div>

        {error ? (
          <p className="rounded-brutal border-3 border-brutal bg-brutal-destructive p-2 text-sm font-black text-brutal-fg shadow-brutal-sm">
            {error}
          </p>
        ) : null}

        <label className="grid gap-1.5" htmlFor="login-email">
          <span className="text-sm font-medium text-brutal-fg">{t("login.email")}</span>
          <Input
            id="login-email"
            size="lg"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@shop.com"
          />
        </label>

        <label className="grid gap-1.5" htmlFor="login-password">
          <span className="text-sm font-medium text-brutal-fg">{t("login.password")}</span>
          <Input
            id="login-password"
            size="lg"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </label>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          size="default"
          loading={submitting}
          disabled={!canSubmit}
        >
          {t("login.submit")}
        </Button>

        <p className="text-xs font-bold text-gray-600">
          {t("login.requireSeller")}
        </p>
      </form>
    </div>
  );
}
