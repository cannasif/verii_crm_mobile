const PHONE_CANDIDATE_REGEX =
  /(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}(?:\b(?:ext|ext\.|dahili|int\.?|pbx)\s*[:.]?\s*\d{1,6}\b|\s*\/\s*\d{1,6}|\s*\(\d{1,6}\))?/gi;
const EMAIL_CANDIDATE_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const WEBSITE_CANDIDATE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]*\.(?:com(?:\.[a-z]{2})?|net|org|tr|edu(?:\.tr)?|gov(?:\.tr)?|io|biz|info|me|tv|es|ru|de|al|eu|fr|it|cn|co\.uk)(?:\/[^\s]*)?/gi;
const CONTACT_TOKEN_REGEX =
  /@|www\.|https?:\/\/|e-?mail|email|tel\.?|telefon|gsm|mobile|mob\.?|cell|office|fax|faks|linkedin|instagram|facebook|x\.com|twitter/i;
const ADDRESS_HINT_REGEX =
  /\b(mah(?:\.|alle(?:si)?)?|cad(?:\.|de(?:si)?)?|sok(?:\.|ak|ağı)?|sk\.?|bulvar[ıi]?|bulv\.?|blv\.?|blok|kat\b|daire|apt|plaza|han|merkez(?:i)?|san\.?\s*sit\.?|sit\.?|osb|bölge(?:si)?|organize|posta|pk|no|numara|calle|nave|parque|business\s*park|parku|zona|street|st\.?|road|rd\.?|avenida|av\.?|ulitsa|ul\.?|ulica|prospekt|pr-?t|pr\.?|dom|d\.?|stroenie|str\.?|ofis|office|офис|ул\.?|улица|проспект|д\.?|дом|стр\.?)\b/i;
const POSTAL_CODE_REGEX = /\b\d{4,6}\b/;
const PHONE_IN_TEXT_REGEX =
  /(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}/i;
const COUNTRY_ONLY_REGEX = /^\s*(?:türkiye|turkey|tr|spain|españa|espana|kosovo|kosov[eë]s|albania|russia|россия|china|çin|китай)\s*$/i;

const COMMON_PROVINCES = [
  "istanbul",
  "ankara",
  "izmir",
  "bursa",
  "adana",
  "antalya",
  "kocaeli",
  "konya",
  "mersin",
  "gaziantep",
  "diyarbakir",
  "trabzon",
  "samsun",
  "kayseri",
  "ankara",
  "trazo",
  "coruna",
  "prishtina",
  "drenas",
  "bushat",
  "moscow",
  "москва",
  "espana",
  "españa",
  "kosovo",
  "russia",
  "россия",
  "xian",
  "xi'an",
  "ya'an",
  "china",
  "çin",
];

export interface BusinessCardCandidateHints {
  phones: string[];
  emails: string[];
  websites: string[];
  addressLines: string[];
  scriptProfile: {
    dominantScript: "latin" | "cyrillic" | "mixed" | "unknown";
    suggestedLocale: "tr" | "ru" | "intl";
    confidence: number;
  };
  topCandidates: {
    names: string[];
    titles: string[];
    companies: string[];
  };
  layoutProfile: {
    orderedLines: string[];
    topZoneLines: string[];
    middleZoneLines: string[];
    bottomZoneLines: string[];
    preferredNameLines: string[];
    preferredTitleLines: string[];
    preferredCompanyLines: string[];
    contactClusterLines: string[];
  };
}

const COMPANY_HINT_REGEX =
  /\b(a\.?\s?ş|aş|ltd|şti|san|tic|holding|group|llc|gmbh|co\.?\s?ltd|ooo|ооо|zao|зао|oao|оао|solutions|security|locks|metal|makine|machine|bio|biotech|trade|lines|construction|profile|pvc)\b/i;
const TITLE_HINT_REGEX =
  /\b(manager|director|chief|architect|engineer|sales|marketing|export|purchasing|logistics|managerial|chairman|vice chairman|president|müdür|yönetici|uzmanı|sorumlu|manager|менеджер|директор|руководитель|председатель)\b/i;
const LETTER_LINE_REGEX = /\p{L}/u;
const PERSON_TOKEN_REGEX = /^[\p{L}'.-]{2,}$/u;

type IdentityBucket = "name" | "title" | "company";

type ScoredIdentityLine = {
  line: string;
  bucket: IdentityBucket;
  score: number;
};

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    if (!out.includes(cleaned)) out.push(cleaned);
  }
  return out;
}

function normalizeWebsite(value: string): string {
  return value
    .replace(/[),;]+$/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function lineHasLocationToken(line: string): boolean {
  const lower = line.toLocaleLowerCase("tr-TR");
  if (COMMON_PROVINCES.some((city) => lower.includes(city))) return true;
  if (/[a-zçğıöşü]{2,}\s*[/-]\s*[a-zçğıöşü]{2,}/i.test(line)) return true;
  return false;
}

function stripContactFragments(line: string): string {
  return line
    .replace(/\b(e-?mail|email|www|http|tel\.?|telefon|gsm|mobile|fax|faks)\b\s*[:.]?/gi, " | ")
    .replace(EMAIL_CANDIDATE_REGEX, " | ")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, " | ")
    .replace(PHONE_CANDIDATE_REGEX, " | ")
    .replace(/\s+/g, " ")
    .split("|")
    .map((part) => part.replace(/[-,:;|/]+$/g, "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] ?? "";
}

function extractSourceLines(rawText: string, lines?: string[]): string[] {
  if (lines && lines.length > 0) {
    return uniqueStrings(lines);
  }
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function extractOrderedLines(rawText: string, lines?: string[], lineItems?: OcrLineItem[]): string[] {
  if (lineItems && lineItems.length > 0) {
    return uniqueStrings(
      [...lineItems]
        .sort((left, right) => left.blockIndex - right.blockIndex || left.lineIndex - right.lineIndex)
        .map((item) => item.text)
    );
  }

  return extractSourceLines(rawText, lines);
}

function extractAddressLines(rawText: string, lines?: string[]): string[] {
  const sourceLines = extractSourceLines(rawText, lines);
  const addressLines: string[] = [];

  for (const line of sourceLines) {
    if (COUNTRY_ONLY_REGEX.test(line)) continue;

    const baseLine = CONTACT_TOKEN_REGEX.test(line) ? stripContactFragments(line) : line;
    if (!baseLine) continue;
    if (PHONE_IN_TEXT_REGEX.test(baseLine)) continue;

    const looksAddressLike =
      ADDRESS_HINT_REGEX.test(baseLine) || POSTAL_CODE_REGEX.test(baseLine) || lineHasLocationToken(baseLine);

    if (!looksAddressLike) continue;
    addressLines.push(baseLine);
  }

  return uniqueStrings(addressLines);
}

function detectScriptProfile(rawText: string): BusinessCardCandidateHints["scriptProfile"] {
  const letters = Array.from(rawText.matchAll(/\p{L}/gu)).length;
  if (letters === 0) {
    return { dominantScript: "unknown", suggestedLocale: "intl", confidence: 0 };
  }

  const cyrillic = Array.from(rawText.matchAll(/\p{Script=Cyrillic}/gu)).length;
  const latin = Array.from(rawText.matchAll(/\p{Script=Latin}/gu)).length;
  const dominantRatio = Math.max(cyrillic, latin) / letters;

  if (cyrillic > 0 && latin > 0) {
    return {
      dominantScript: dominantRatio < 0.85 ? "mixed" : cyrillic > latin ? "cyrillic" : "latin",
      suggestedLocale: cyrillic > latin ? "ru" : "tr",
      confidence: Number(dominantRatio.toFixed(2)),
    };
  }

  if (cyrillic > 0) {
    return { dominantScript: "cyrillic", suggestedLocale: "ru", confidence: Number((cyrillic / letters).toFixed(2)) };
  }

  return { dominantScript: "latin", suggestedLocale: "tr", confidence: Number((latin / letters).toFixed(2)) };
}

function isLikelyNameLine(line: string): boolean {
  if (CONTACT_TOKEN_REGEX.test(line) || TITLE_HINT_REGEX.test(line) || COMPANY_HINT_REGEX.test(line)) return false;
  const tokens = line.replace(/[^\p{L}\s'.-]/gu, " ").split(/\s+/).filter(Boolean);
  return tokens.length >= 2 && tokens.length <= 4 && tokens.every((token) => PERSON_TOKEN_REGEX.test(token));
}

function isLikelyCompanyZoneLine(line: string, index: number): boolean {
  if (CONTACT_TOKEN_REGEX.test(line) || TITLE_HINT_REGEX.test(line)) return false;
  if (COMPANY_HINT_REGEX.test(line)) return true;
  if (index <= 1 && /^[\p{Lu}\s.&'-]{2,}$/u.test(line.trim())) return true;
  return false;
}

function scoreIdentityLines(rawText: string, lines?: string[]): ScoredIdentityLine[] {
  const sourceLines = extractSourceLines(rawText, lines);
  const scored: ScoredIdentityLine[] = [];

  sourceLines.forEach((line, index) => {
    if (!LETTER_LINE_REGEX.test(line) || line.length > 120) return;

    let companyScore = 0;
    let titleScore = 0;
    let nameScore = 0;

    if (COMPANY_HINT_REGEX.test(line)) companyScore += 4;
    if (TITLE_HINT_REGEX.test(line)) titleScore += 4;
    if (isLikelyNameLine(line)) nameScore += 4;
    if (index <= 1 && COMPANY_HINT_REGEX.test(line)) companyScore += 2;
    if (index >= 1 && index <= 4 && isLikelyNameLine(line)) nameScore += 2;
    if (index >= 1 && index <= 5 && TITLE_HINT_REGEX.test(line)) titleScore += 1;
    if (/^[\p{Lu}\s.&'-]{2,}$/u.test(line) && !TITLE_HINT_REGEX.test(line)) companyScore += 1;
    if (/^[\p{Lu}\s'.-]{2,}$/u.test(line) && isLikelyNameLine(line)) nameScore += 1;

    const best = Math.max(companyScore, titleScore, nameScore);
    if (best < 3) return;

    const bucket: IdentityBucket =
      companyScore >= titleScore && companyScore >= nameScore
        ? "company"
        : titleScore >= nameScore
          ? "title"
          : "name";

    scored.push({ line, bucket, score: best });
  });

  return scored.sort((a, b) => b.score - a.score || a.line.length - b.line.length);
}

function buildTopIdentityCandidates(rawText: string, lines?: string[]): BusinessCardCandidateHints["topCandidates"] {
  const scored = scoreIdentityLines(rawText, lines);
  const takeBucket = (bucket: IdentityBucket): string[] =>
    scored
      .filter((item) => item.bucket === bucket)
      .map((item) => item.line)
      .filter((line, index, arr) => arr.indexOf(line) === index)
      .slice(0, 3);

  return {
    names: takeBucket("name"),
    titles: takeBucket("title"),
    companies: takeBucket("company"),
  };
}

function buildLayoutProfile(rawText: string, lines?: string[], lineItems?: OcrLineItem[]): BusinessCardCandidateHints["layoutProfile"] {
  const orderedLines = extractOrderedLines(rawText, lines, lineItems)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2 && line.length <= 140);

  if (orderedLines.length === 0) {
    return {
      orderedLines: [],
      topZoneLines: [],
      middleZoneLines: [],
      bottomZoneLines: [],
      preferredNameLines: [],
      preferredTitleLines: [],
      preferredCompanyLines: [],
      contactClusterLines: [],
    };
  }

  const topEnd = Math.max(1, Math.ceil(orderedLines.length / 3));
  const middleEnd = Math.max(topEnd + 1, Math.ceil((orderedLines.length * 2) / 3));

  const topZoneLines = orderedLines.slice(0, topEnd);
  const middleZoneLines = orderedLines.slice(topEnd, middleEnd);
  const bottomZoneLines = orderedLines.slice(middleEnd);

  const preferredCompanyLines = uniqueStrings(
    topZoneLines.filter((line, index) => isLikelyCompanyZoneLine(line, index)).slice(0, 3)
  );
  const preferredNameLines = uniqueStrings(
    [...topZoneLines.slice(-2), ...middleZoneLines].filter((line) => isLikelyNameLine(line)).slice(0, 3)
  );
  const preferredTitleLines = uniqueStrings(
    [...topZoneLines.slice(-2), ...middleZoneLines, ...bottomZoneLines.slice(0, 1)]
      .filter((line) => TITLE_HINT_REGEX.test(line))
      .slice(0, 3)
  );
  const contactClusterLines = uniqueStrings(
    bottomZoneLines.filter((line) => CONTACT_TOKEN_REGEX.test(line) || ADDRESS_HINT_REGEX.test(line) || POSTAL_CODE_REGEX.test(line))
  );

  return {
    orderedLines,
    topZoneLines,
    middleZoneLines,
    bottomZoneLines,
    preferredNameLines,
    preferredTitleLines,
    preferredCompanyLines,
    contactClusterLines,
  };
}

export function buildBusinessCardCandidateHints(rawText: string, lines?: string[], lineItems?: OcrLineItem[]): BusinessCardCandidateHints {
  const phones = uniqueStrings(rawText.match(PHONE_CANDIDATE_REGEX) ?? []);
  const emails = uniqueStrings((rawText.match(EMAIL_CANDIDATE_REGEX) ?? []).map((x) => x.replace(/[;,]+$/g, "")));
  const websites = uniqueStrings((rawText.match(WEBSITE_CANDIDATE_REGEX) ?? []).map((x) => normalizeWebsite(x)));
  const addressLines = extractAddressLines(rawText, lines);
  const scriptProfile = detectScriptProfile(rawText);
  const topCandidates = buildTopIdentityCandidates(rawText, lines);
  const layoutProfile = buildLayoutProfile(rawText, lines, lineItems);

  return { phones, emails, websites, addressLines, scriptProfile, topCandidates, layoutProfile };
}
import type { OcrLineItem } from "./ocrService";
