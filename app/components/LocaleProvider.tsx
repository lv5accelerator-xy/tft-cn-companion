"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AppLocale = "zh" | "en";

const LOCALE_KEY = "tft-cn-companion-locale-v1";

type LocalizedEntry = {
  nameZh?: string;
  nameEn?: string;
  descriptionZh?: string;
  descriptionEn?: string;
};

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
  tr: (zh: string, en: string) => string;
  nameOf: (entry: LocalizedEntry | null | undefined) => string;
  secondaryNameOf: (entry: LocalizedEntry | null | undefined) => string;
  descriptionOf: (entry: LocalizedEntry | null | undefined) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("zh");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_KEY);
      if (saved === "en" || saved === "zh") setLocaleState(saved);
    } catch {
      // Keep Chinese as the default when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // UI language can still switch for the current session.
    }
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale(locale === "zh" ? "en" : "zh"),
    tr: (zh, en) => locale === "zh" ? zh : en,
    nameOf: (entry) => {
      if (!entry) return "";
      return locale === "zh" ? (entry.nameZh || entry.nameEn || "") : (entry.nameEn || entry.nameZh || "");
    },
    secondaryNameOf: (entry) => {
      if (!entry) return "";
      return locale === "zh" ? (entry.nameEn || "") : (entry.nameZh || "");
    },
    descriptionOf: (entry) => {
      if (!entry) return "";
      return locale === "zh"
        ? (entry.descriptionZh || entry.descriptionEn || "")
        : (entry.descriptionEn || entry.descriptionZh || "");
    },
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
