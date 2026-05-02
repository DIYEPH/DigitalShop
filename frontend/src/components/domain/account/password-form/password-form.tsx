"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, Input } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { changeMyPassword } from "@/lib/api/me";
import { getAuthToken } from "@/lib/auth/token";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { AccountFormCard } from "../account-form-card";
import alertStyles from "../account-alerts.module.scss";

export function PasswordForm({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError(dict.auth.passwordMin);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(dict.auth.passwordMismatch);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      router.replace(`/${lang}/login`);
      return;
    }

    setSaving(true);
    try {
      await changeMyPassword({
        token,
        lang,
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(dict.auth.passwordChanged);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : dict.auth.passwordChangeFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountFormCard
      title={dict.auth.passwordTitle}
      description={dict.auth.passwordDescription}
      onSubmit={onSubmit}
    >
      <FormField label={dict.auth.currentPassword} htmlFor="current-password">
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
        />
      </FormField>

      <FormField label={dict.auth.newPassword} htmlFor="new-password">
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label={dict.auth.confirmNewPassword} htmlFor="confirm-password">
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
        />
      </FormField>

      {message ? <div className={alertStyles.success}>{message}</div> : null}
      {error ? <div className={alertStyles.danger}>{error}</div> : null}

      <Button type="submit" disabled={saving} className="justify-center">
        {saving ? dict.auth.changingPassword : dict.auth.passwordTitle}
      </Button>
    </AccountFormCard>
  );
}
