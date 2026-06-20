import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_STORAGE_KEY } from "../constants/storage";

import tr from "./tr.json";
import en from "./en.json";
import de from "./de.json";
import ar from "./ar.json";

export const SUPPORTED_LANGUAGE_CODES = ["tr", "en", "de", "ar"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const SUPPORTED_LANGUAGES: Array<{
  id: AppLanguage;
  labelKey: string;
  fallbackLabel: string;
  flag: string;
  hint: string;
}> = [
  { id: "tr", labelKey: "language.turkish", fallbackLabel: "Türkçe", flag: "🇹🇷", hint: "Türkçe" },
  { id: "en", labelKey: "language.english", fallbackLabel: "English", flag: "🇬🇧", hint: "English" },
  { id: "de", labelKey: "language.german", fallbackLabel: "Deutsch", flag: "🇩🇪", hint: "Deutsch" },
  { id: "ar", labelKey: "language.arabic", fallbackLabel: "العربية", flag: "🇸🇦", hint: "العربية" },
];

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de },
  ar: { translation: ar },
};

function normalizeLanguage(lang?: string | null): AppLanguage {
  const normalized = (lang || "tr").split("-")[0].toLowerCase();
  return SUPPORTED_LANGUAGE_CODES.includes(normalized as AppLanguage)
    ? (normalized as AppLanguage)
    : "tr";
}

export function isRtlLanguage(lang?: string | null): boolean {
  return normalizeLanguage(lang || i18n.language) === "ar";
}

function applyLanguageDirection(lang: AppLanguage): void {
  const shouldUseRtl = isRtlLanguage(lang);
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== shouldUseRtl) {
    I18nManager.forceRTL(shouldUseRtl);
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: "tr",
  fallbackLng: "tr",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export async function initLanguage(): Promise<void> {
  const savedLanguage = normalizeLanguage(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY));
  applyLanguageDirection(savedLanguage);
  i18n.changeLanguage(savedLanguage);
}

export async function setLanguage(lang: AppLanguage): Promise<void> {
  const normalizedLanguage = normalizeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
  applyLanguageDirection(normalizedLanguage);
  i18n.changeLanguage(normalizedLanguage);
}

export function getCurrentLanguage(): string {
  return i18n.language;
}

export default i18n;
