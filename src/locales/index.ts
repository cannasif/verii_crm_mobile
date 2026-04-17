import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_STORAGE_KEY } from "../constants/storage";

import tr from "./tr.json";
import en from "./en.json";
import de from "./de.json";

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de },
};

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
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (savedLanguage === "tr" || savedLanguage === "en" || savedLanguage === "de") {
    i18n.changeLanguage(savedLanguage);
  } else {
    i18n.changeLanguage("tr");
  }
}

export async function setLanguage(lang: "tr" | "en" | "de"): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export function getCurrentLanguage(): string {
  return i18n.language;
}

export default i18n;
