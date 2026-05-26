"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { clearAuthToken } from "@/lib/auth/token";
import { useAuthToken } from "@/lib/auth/use-auth-token";
import type { AuthButtonProps } from "./auth-button.types";

export function AuthButton({ lang, dict }: AuthButtonProps) {
  const router = useRouter();
  const { token, hydrated } = useAuthToken();

  if (!hydrated || !token) {
    return (
      <Button href={`/${lang}/login`} variant="ghost" size="sm">
        {!hydrated ? "..." : dict.auth.login}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        clearAuthToken();
        router.push(`/${lang}/login`);
        router.refresh();
      }}
    >
      {dict.layout.logout}
    </Button>
  );
}
