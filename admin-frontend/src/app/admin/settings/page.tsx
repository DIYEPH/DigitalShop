"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, Input } from "@/components/ui";
import { changePassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAdminToken } from "@/lib/auth/use-admin-token";

export default function AdminSettingsPage() {
  const token = useAdminToken();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      currentPassword.length >= 6 &&
      newPassword.length >= 6 &&
      confirmPassword.length >= 6 &&
      newPassword === confirmPassword,
    [currentPassword, newPassword, confirmPassword],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Phiên đăng nhập hết hạn.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới không khớp.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      setSuccess("Đã đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Không thể đổi mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Cài đặt
        </h1>
        <p className="text-sm text-muted-foreground">Tài khoản quản trị</p>
      </div>

      <Card title="Đổi mật khẩu" subtitle="Mật khẩu tối thiểu 6 ký tự">
        <form onSubmit={onSubmit} className="grid max-w-md gap-3">
          {error ? <Alert tone="error">{error}</Alert> : null}
          {success ? <Alert tone="success">{success}</Alert> : null}

          <label className="grid gap-1.5" htmlFor="current-password">
            <span className="text-sm font-medium">Mật khẩu hiện tại</span>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

          <label className="grid gap-1.5" htmlFor="new-password">
            <span className="text-sm font-medium">Mật khẩu mới</span>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <label className="grid gap-1.5" htmlFor="confirm-password">
            <span className="text-sm font-medium">Xác nhận mật khẩu mới</span>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            Lưu mật khẩu
          </Button>
        </form>
      </Card>
    </div>
  );
}
