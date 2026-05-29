"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { cn } from "@/lib/utils/cn";
import styles from "./theme-toggle.module.scss";
import type { ThemeToggleProps } from "./theme-toggle.types";
import { Button } from "@/components/ui";

export function ThemeToggle({ ariaLabel }: ThemeToggleProps) {
  const { scheme, toggleScheme } = useTheme();
  const isDark = scheme === "dark";
  return (
    <Button
      type="button"
      image
      className={cn(styles.btn, isDark && styles.active)}
      onClick={toggleScheme}
      aria-label={ariaLabel}
    >
      {isDark ? <Moon aria-hidden /> : <Sun aria-hidden />}
    </Button>
  );
}
