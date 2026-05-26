import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/auth/token";
import type { Locale } from "@/lib/i18n/config";
export function useAccountMenu(lang: Locale) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const close = () => setOpen(false);
  const toggle = () => setOpen((value) => !value);

  const logout = () => {
    clearAuthToken();
    close();
    router.push(`/${lang}/login`);
    router.refresh();
  };

  return {
    open,
    close,
    toggle,
    logout,
  };
}

