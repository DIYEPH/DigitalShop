"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { readAdminSession } from "@/lib/auth/session";
import { setAuthToken } from "@/lib/auth/token";
import { decodeJwt, isJwtExpired } from "@/lib/auth/jwt";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
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
      setError("Email không hợp lệ.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu ít nhất 6 ký tự.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(e1, password);
      const payload = decodeJwt(res.access_token);
      if (!payload || isJwtExpired(payload) || payload.role !== "ADMIN") {
        setError("Cần quyền ADMIN.");
        return;
      }
      setAuthToken(res.access_token);
      router.push("/admin");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "AUTH_002")
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        else setError(err.message);
      } else setError("Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-glow"
        aria-hidden
      />
      <form
        onSubmit={onSubmit}
        className="relative grid w-full max-w-md gap-4 rounded-xl border border-border bg-surface p-6 shadow-(--shadow-md)"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Đăng nhập quản trị
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            DigitalShop Admin
          </p>
        </div>

        {error ? (
          <p className="rounded-lg border border-danger/20 bg-danger/10 p-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        <label className="grid gap-1.5" htmlFor="login-email">
          <span className="text-sm font-medium text-foreground">Email</span>
          <Input
            id="login-email"
            uiSize="lg"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@shop.com"
          />
        </label>

        <label className="grid gap-1.5" htmlFor="login-password">
          <span className="text-sm font-medium text-foreground">Mật khẩu</span>
          <Input
            id="login-password"
            uiSize="lg"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </label>

        <Button
          type="submit"
          className="w-full"
          uiSize="md"
          loading={submitting}
          disabled={!canSubmit}
        >
          Đăng nhập
        </Button>

        <p className="text-xs text-muted-foreground">
          Chỉ tài khoản có vai trò{" "}
          <span className="font-semibold text-foreground">ADMIN</span> mới vào
          được bảng quản trị.
        </p>
      </form>
    </div>
  );
}
