"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/auth";
import { setAuthToken } from "@/lib/auth/token";
import { Button, FormField, Input } from "@/components/ui";
import { CloudflareTurnstile } from "@/components/domain/auth/cloudflare-turnstile";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import authStyles from "@/components/domain/auth/auth-pages.module.scss";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginForm({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "";
  const requiresTurnstile = turnstileSiteKey.length > 0;

  const handleTurnstileVerify = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && (!requiresTurnstile || Boolean(turnstileToken)),
    [email, password, requiresTurnstile, turnstileToken],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const e1 = email.trim();
    if (!isValidEmail(e1)) {
      setError(dict.auth.invalidEmail);
      return;
    }
    if (password.length < 8) {
      setError(dict.auth.passwordMin);
      return;
    }
    if (requiresTurnstile && !turnstileToken) {
      setError(dict.auth.turnstileRequired);
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(e1, password, { turnstileToken });
      setAuthToken(res.token);
      window.alert(lang === "vi" ? "Đăng nhập thành công." : "Login successful.");
      router.push(`/${lang}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : dict.auth.failed;
      setError(message);
      window.alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={cn("store-card", authStyles.form)}>
      <h1 className={authStyles.title}>{dict.auth.loginTitle}</h1>

      {error ? <p className={authStyles.errorBanner}>{error}</p> : null}

      <FormField label={dict.auth.email} htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </FormField>

      <FormField label={dict.auth.password} htmlFor="login-password">
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="••••••"
        />
      </FormField>

      <CloudflareTurnstile
        siteKey={turnstileSiteKey}
        onVerify={handleTurnstileVerify}
        label={dict.auth.turnstileLabel}
      />

      <Button type="submit" disabled={!canSubmit || submitting} variant="primary" size="lg" className={authStyles.submit}>
        {submitting ? dict.auth.loggingIn : dict.auth.login}
      </Button>

      <p className={authStyles.footer}>
        {dict.auth.noAccount}{" "}
        <Link href={`/${lang}/register`} className={authStyles.inlineLink}>
          {dict.auth.goRegister}
        </Link>
      </p>
    </form>
  );
}
