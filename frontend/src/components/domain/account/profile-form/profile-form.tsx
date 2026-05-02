"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, Input } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { getMyProfile } from "@/lib/api/me";
import { getAuthToken } from "@/lib/auth/token";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { AccountFormCard } from "../account-form-card";
import alertStyles from "../account-alerts.module.scss";

export function ProfileForm({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const router = useRouter();
  const profileLoadFailedMessage = dict.auth.profileLoadFailed;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    if (!token) {
      router.replace(`/${lang}/login`);
      return;
    }
    getMyProfile({ token, lang })
      .then((res) => {
        if (cancelled) return;
        setEmail(res.user.email);
        setRole(res.user.role);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : profileLoadFailedMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang, profileLoadFailedMessage, router]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <AccountFormCard
      title={dict.auth.profileTitle}
      description={dict.auth.profileDescription}
      onSubmit={onSubmit}
    >
      <FormField label={dict.auth.email} htmlFor="profile-email">
        <Input
          id="profile-email"
          type="email"
          value={email}
          disabled
          readOnly
          autoComplete="email"
        />
      </FormField>
      <FormField label={dict.auth.profileRole} htmlFor="profile-role">
        <Input id="profile-role" type="text" value={role} disabled readOnly />
      </FormField>

      {error ? <div className={alertStyles.danger}>{error}</div> : null}
    </AccountFormCard>
  );
}
