export type BusinessCardLanguageProfile = {
  dominantScript: "latin" | "cyrillic" | "mixed" | "unknown";
  suggestedLocale: "tr" | "en" | "de" | "ru" | "intl";
  confidence: number;
};

const TURKISH_MARKERS = /[çğıöşüİı]/g;
const GERMAN_MARKERS = /[äöüß]/g;
const CYRILLIC_MARKERS = /\p{Script=Cyrillic}/gu;
const LATIN_MARKERS = /\p{Script=Latin}/gu;
const LETTER_MARKERS = /\p{L}/gu;

const TURKISH_KEYWORDS = [
  "mah",
  "mahalle",
  "cadde",
  "sokak",
  "a.ş",
  "şti",
  "müdür",
  "satış",
  "pazarlama",
  "genel müdür",
  "türkiye",
] as const;

const GERMAN_KEYWORDS = [
  "geschäftsführer",
  "vertrieb",
  "vertriebsleiter",
  "verkaufsleiter",
  "straße",
  "strasse",
  "gmbh",
  "hausnummer",
  "deutschland",
] as const;

const ENGLISH_KEYWORDS = [
  "manager",
  "director",
  "sales",
  "marketing",
  "street",
  "road",
  "avenue",
  "suite",
  "company",
  "inc",
  "llc",
  "limited",
] as const;

const RUSSIAN_KEYWORDS = [
  "ооо",
  "зао",
  "оао",
  "директор",
  "менеджер",
  "руководитель",
  "улица",
  "ул",
  "проспект",
  "дом",
  "россия",
] as const;

function countMatches(text: string, regex: RegExp): number {
  return Array.from(text.matchAll(regex)).length;
}

function countKeywords(text: string, keywords: readonly string[]): number {
  const normalized = text.toLocaleLowerCase("tr-TR");
  return keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0);
}

export function detectBusinessCardLanguageProfile(rawText: string): BusinessCardLanguageProfile {
  const letters = countMatches(rawText, LETTER_MARKERS);
  if (letters === 0) {
    return { dominantScript: "unknown", suggestedLocale: "intl", confidence: 0 };
  }

  const latin = countMatches(rawText, LATIN_MARKERS);
  const cyrillic = countMatches(rawText, CYRILLIC_MARKERS);
  const dominantScript =
    latin > 0 && cyrillic > 0 ? "mixed" : cyrillic > 0 ? "cyrillic" : latin > 0 ? "latin" : "unknown";
  const scriptConfidence = Number((Math.max(latin, cyrillic) / letters).toFixed(2));

  if (dominantScript === "cyrillic") {
    return { dominantScript, suggestedLocale: "ru", confidence: scriptConfidence };
  }

  const turkishScore = countMatches(rawText, TURKISH_MARKERS) + countKeywords(rawText, TURKISH_KEYWORDS) * 2;
  const germanScore = countMatches(rawText, GERMAN_MARKERS) + countKeywords(rawText, GERMAN_KEYWORDS) * 2;
  const russianScore = countKeywords(rawText, RUSSIAN_KEYWORDS) * 2 + countMatches(rawText, CYRILLIC_MARKERS);
  const englishScore = countKeywords(rawText, ENGLISH_KEYWORDS) * 2;

  const scored = [
    { locale: "tr" as const, score: turkishScore },
    { locale: "de" as const, score: germanScore },
    { locale: "ru" as const, score: russianScore },
    { locale: "en" as const, score: englishScore },
  ].sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best || best.score <= 0) {
    return { dominantScript, suggestedLocale: dominantScript === "mixed" ? "intl" : "en", confidence: scriptConfidence };
  }

  return {
    dominantScript,
    suggestedLocale: best.locale,
    confidence: Number(Math.max(scriptConfidence, Math.min(0.99, best.score / 6)).toFixed(2)),
  };
}

