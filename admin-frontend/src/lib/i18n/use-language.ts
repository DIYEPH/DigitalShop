"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  DICTIONARY,
  LANGUAGE_STORAGE_KEY,
} from "./constants";
import type { Language, TranslationKey } from "./types";

function readLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "vi" || stored === "en" ? stored : DEFAULT_LANGUAGE;
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    queueMicrotask(() => setLanguageState(readLanguage()));
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => DICTIONARY[language][key],
    [language],
  );

  return useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );
}
