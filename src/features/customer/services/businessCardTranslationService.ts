import { NativeModules, Platform } from "react-native";
import { detectBusinessCardLanguageProfile } from "./businessCardLanguageProfileService";
import type { BusinessCardOcrResult, BusinessCardResultLanguageProfile } from "../types/businessCard";

type TranslatableField = "title" | "address" | "notes" | "countryName" | "cityName" | "districtName";

type NativeTranslationModule = {
  translateTexts: (
    values: Partial<Record<TranslatableField, string>>,
    targetLanguage: string,
    sourceLanguageHint?: string
  ) => Promise<{
    sourceLanguage?: string;
    targetLanguage?: string;
    translated?: boolean;
    values?: Partial<Record<TranslatableField, string>>;
  }>;
};

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bexport manager\b/gi, "ihracat müdürü"],
  [/\bsales division manager\b/gi, "satış birimi müdürü"],
  [/\bsales manager\b/gi, "satış müdürü"],
  [/\bmarketing manager\b/gi, "pazarlama müdürü"],
  [/\bmanaging director\b/gi, "genel müdür"],
  [/\bgeneral manager\b/gi, "genel müdür"],
  [/\bkey account manager\b/gi, "kilit müşteri yöneticisi"],
  [/\bbusiness development\b/gi, "iş geliştirme"],
  [/\bcustomer service\b/gi, "müşteri hizmetleri"],
  [/\bbusiness park\b/gi, "iş parkı"],
  [/\bhead office\b/gi, "merkez ofis"],
  [/\bpostal code\b/gi, "posta kodu"],
  [/\bstreet\b/gi, "sokak"],
  [/\broad\b/gi, "yol"],
  [/\bavenue\b/gi, "cadde"],
  [/\bboulevard\b/gi, "bulvar"],
  [/\bsuite\b/gi, "suit"],
  [/\bfloor\b/gi, "kat"],
  [/\bbuilding\b/gi, "bina"],
  [/\boffice\b/gi, "ofis"],
  [/\bdepartment\b/gi, "departman"],
  [/\bmanager\b/gi, "müdür"],
  [/\bdirector\b/gi, "direktör"],
  [/\bengineer\b/gi, "mühendis"],
  [/\bspecialist\b/gi, "uzman"],
  [/\bassistant\b/gi, "asistan"],
  [/\bmarketing\b/gi, "pazarlama"],
  [/\bsales\b/gi, "satış"],
  [/\bprocurement\b/gi, "satın alma"],
  [/\blanguage:\s*/gi, "Dil: "],
  [/\bfax:\s*/gi, "Faks: "],
  [/\bgeschäftsführer\b/gi, "genel müdür"],
  [/\bvertriebsleiter\b/gi, "satış müdürü"],
  [/\bverkaufsleiter\b/gi, "satış müdürü"],
  [/\beinkaufsleiter\b/gi, "satın alma müdürü"],
  [/\bvertrieb\b/gi, "satış"],
  [/\bstraße\b/gi, "sokak"],
  [/\bstrasse\b/gi, "sokak"],
  [/\bhausnummer\b/gi, "no"],
  [/\betage\b/gi, "kat"],
  [/\bdirektor\b/gi, "direktör"],
  [/\bingenieur\b/gi, "mühendis"],
];

const COUNTRY_REPLACEMENTS: Record<string, string> = {
  turkey: "Türkiye",
  turkiye: "Türkiye",
  deutschland: "Almanya",
  germany: "Almanya",
  kosovo: "Kosova",
  kosova: "Kosova",
  albania: "Arnavutluk",
  shqiperi: "Arnavutluk",
  espana: "İspanya",
  spain: "İspanya",
  france: "Fransa",
  italia: "İtalya",
  italy: "İtalya",
  russia: "Rusya",
  "united kingdom": "Birleşik Krallık",
  england: "İngiltere",
  usa: "ABD",
  "united states": "ABD",
  "united states of america": "ABD",
};

function getNativeModule(): NativeTranslationModule | null {
  const nativeModule = NativeModules.BusinessCardTranslation as NativeTranslationModule | undefined;
  if (!nativeModule || typeof nativeModule.translateTexts !== "function") {
    return null;
  }
  return nativeModule;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
}

function preserveLeadingCase(source: string, translated: string): string {
  if (!source || !translated) return translated;
  const firstSource = source.trim().charAt(0);
  if (firstSource && firstSource === firstSource.toLocaleUpperCase("tr-TR")) {
    return translated.charAt(0).toLocaleUpperCase("tr-TR") + translated.slice(1);
  }
  return translated;
}

function translateFreeTextFallback(value: string): string {
  let next = value;
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return preserveLeadingCase(value, normalizeWhitespace(next));
}

function translateCountryFallback(value: string): string {
  const normalized = value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return COUNTRY_REPLACEMENTS[normalized] ?? normalizeWhitespace(translateFreeTextFallback(value));
}

function buildFallbackLanguageProfile(result: BusinessCardOcrResult): BusinessCardResultLanguageProfile {
  const sourceText = [
    result.title,
    result.address,
    result.countryName,
    result.cityName,
    result.districtName,
    result.notes,
  ]
    .filter(Boolean)
    .join("\n");

  const detected = detectBusinessCardLanguageProfile(sourceText);
  return {
    ...detected,
    recognizedLanguages: result.languageProfile?.recognizedLanguages ?? [],
  };
}

function normalizeLocale(locale: string | undefined): BusinessCardResultLanguageProfile["suggestedLocale"] {
  switch ((locale ?? "").toLowerCase()) {
    case "tr":
      return "tr";
    case "en":
      return "en";
    case "de":
      return "de";
    case "ru":
      return "ru";
    default:
      return "intl";
  }
}

function getTranslatableValues(result: BusinessCardOcrResult): Partial<Record<TranslatableField, string>> {
  return {
    title: result.title,
    address: result.address,
    notes: result.notes,
    countryName: result.countryName,
    cityName: result.cityName,
    districtName: result.districtName,
  };
}

function applyTranslatedValues(
  result: BusinessCardOcrResult,
  values: Partial<Record<TranslatableField, string>>,
  sourceLocale: BusinessCardResultLanguageProfile["suggestedLocale"],
  translated: boolean
): BusinessCardOcrResult {
  const changes = (Object.keys(values) as TranslatableField[]).filter((field) => {
    const nextValue = values[field];
    return Boolean(nextValue) && nextValue !== result[field];
  });

  return {
    ...result,
    ...values,
    languageProfile: result.languageProfile ?? buildFallbackLanguageProfile(result),
    translationMeta: {
      targetLocale: "tr",
      sourceLocale,
      changedFields: changes,
      translated: translated && changes.length > 0,
    },
  };
}

export function canTranslateBusinessCardToTurkish(result: BusinessCardOcrResult | null | undefined): boolean {
  if (!result) return false;
  const profile = result.languageProfile ?? buildFallbackLanguageProfile(result);
  if (profile.suggestedLocale === "tr") return false;
  return Boolean(result.title || result.address || result.countryName || result.cityName || result.districtName || result.notes);
}

export function translateBusinessCardToTurkishFallback(result: BusinessCardOcrResult): BusinessCardOcrResult {
  const profile = result.languageProfile ?? buildFallbackLanguageProfile(result);
  if (profile.suggestedLocale === "tr") {
    return applyTranslatedValues(result, {}, profile.suggestedLocale, false);
  }

  const translatedValues: Partial<Record<TranslatableField, string>> = {
    title: result.title ? translateFreeTextFallback(result.title) : undefined,
    address: result.address ? translateFreeTextFallback(result.address) : undefined,
    notes: result.notes ? translateFreeTextFallback(result.notes) : undefined,
    countryName: result.countryName ? translateCountryFallback(result.countryName) : undefined,
    cityName: result.cityName ? translateFreeTextFallback(result.cityName) : undefined,
    districtName: result.districtName ? translateFreeTextFallback(result.districtName) : undefined,
  };

  return applyTranslatedValues(result, translatedValues, profile.suggestedLocale, true);
}

export async function translateBusinessCardToTurkish(result: BusinessCardOcrResult): Promise<BusinessCardOcrResult> {
  const profile = result.languageProfile ?? buildFallbackLanguageProfile(result);
  if (profile.suggestedLocale === "tr") {
    return applyTranslatedValues(result, {}, profile.suggestedLocale, false);
  }

  const nativeModule = Platform.OS === "android" ? getNativeModule() : null;
  if (!nativeModule) {
    return translateBusinessCardToTurkishFallback(result);
  }

  try {
    const response = await nativeModule.translateTexts(
      getTranslatableValues(result),
      "tr",
      profile.suggestedLocale === "intl" ? undefined : profile.suggestedLocale
    );
    return applyTranslatedValues(
      result,
      response.values ?? {},
      normalizeLocale(response.sourceLanguage ?? profile.suggestedLocale),
      Boolean(response.translated)
    );
  } catch {
    return translateBusinessCardToTurkishFallback(result);
  }
}
