"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { locales } from "@/lib/i18n/config";
import { Button } from "@/components/ui";
import styles from "./lang-switcher.module.scss";
import type { LangSwitcherProps } from "./lang-switcher.types";

export function LangSwitcher({ lang, pathSuffix, dict }: LangSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const suffix = pathSuffix ?? "";
  const onSelectLanguage = (value: string) => {
    if (!locales.includes(value as (typeof locales)[number])) return;
    setOpen(false);
    if (value === lang) return;
    router.push(`/${value}${suffix}`);
  };

  return (
    <div className={styles.wrap}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        image
        className={styles.btn}
        aria-label={dict.layout.switchLanguage}
        title={dict.layout.switchLanguage}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>{lang === "vi" ? "VN" : "US"}</span>
      </Button>
      {open ? (
        <select
          className={styles.select}
          value={lang}
          onChange={(e) => onSelectLanguage(e.target.value)}
          onBlur={() => setOpen(false)}
          autoFocus
        >
          <option value="en">US</option>
          <option value="vi">VN</option>
        </select>
      ) : null}
    </div>
  );
}
