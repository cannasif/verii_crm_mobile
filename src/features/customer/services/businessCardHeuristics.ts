import type { OcrLineItem } from "./ocrService";
import { detectBusinessCardLanguageProfile } from "./businessCardLanguageProfileService";
import {
  BUSINESS_CARD_ADDRESS_HINTS,
  BUSINESS_CARD_COMPANY_MARKERS,
  BUSINESS_CARD_CONTACT_TOKENS,
  BUSINESS_CARD_INDUSTRY_KEYWORDS,
  BUSINESS_CARD_TITLE_KEYWORDS,
  lineContainsLexiconToken,
} from "./businessCardLexicon";

const PHONE_CANDIDATE_REGEX =
  /(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}(?:\b(?:ext|ext\.|dahili|int\.?|pbx)\s*[:.]?\s*\d{1,6}\b|\s*\/\s*\d{1,6}|\s*\(\d{1,6}\))?/gi;
const EMAIL_CANDIDATE_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const WEBSITE_CANDIDATE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]*\.(?:com(?:\.[a-z]{2})?|net|org|tr|edu(?:\.tr)?|gov(?:\.tr)?|io|biz|info|me|tv|es|ru|de|al|eu|fr|it|cn|co\.uk)(?:\/[^\s]*)?/gi;
const CONTACT_TOKEN_REGEX = new RegExp(
  `@|www\\.|https?:\\/\\/|${BUSINESS_CARD_CONTACT_TOKENS.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}`,
  "i"
);
const ADDRESS_HINT_REGEX =
  new RegExp(`\\b(${BUSINESS_CARD_ADDRESS_HINTS.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
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
    suggestedLocale: "tr" | "en" | "de" | "ru" | "intl";
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
        .sort((left, right) => {
          const topDelta = (left.frame?.top ?? Number.MAX_SAFE_INTEGER) - (right.frame?.top ?? Number.MAX_SAFE_INTEGER);
          if (topDelta !== 0) return topDelta;
          const leftDelta = (left.frame?.left ?? Number.MAX_SAFE_INTEGER) - (right.frame?.left ?? Number.MAX_SAFE_INTEGER);
          if (leftDelta !== 0) return leftDelta;
          return left.blockIndex - right.blockIndex || left.lineIndex - right.lineIndex;
        })
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
  return detectBusinessCardLanguageProfile(rawText);
}

function isLikelyNameLine(line: string): boolean {
  if (CONTACT_TOKEN_REGEX.test(line) || lineContainsLexiconToken(line, BUSINESS_CARD_TITLE_KEYWORDS) || looksLikeCompanyLine(line)) return false;
  const tokens = line.replace(/[^\p{L}\s'.-]/gu, " ").split(/\s+/).filter(Boolean);
  return tokens.length >= 2 && tokens.length <= 4 && tokens.every((token) => PERSON_TOKEN_REGEX.test(token));
}

function isLikelyCompanyZoneLine(line: string, index: number): boolean {
  if (CONTACT_TOKEN_REGEX.test(line) || lineContainsLexiconToken(line, BUSINESS_CARD_TITLE_KEYWORDS)) return false;
  if (looksLikeCompanyLine(line)) return true;
  if (index <= 1 && /^[\p{Lu}\s.&'-]{2,}$/u.test(line.trim())) return true;
  return false;
}

function looksLikeCompanyLine(line: string): boolean {
  return (
    lineContainsLexiconToken(line, BUSINESS_CARD_COMPANY_MARKERS) ||
    lineContainsLexiconToken(line, BUSINESS_CARD_INDUSTRY_KEYWORDS)
  );
}

function scoreIdentityLines(rawText: string, lines?: string[]): ScoredIdentityLine[] {
  const sourceLines = extractSourceLines(rawText, lines);
  const scored: ScoredIdentityLine[] = [];

  sourceLines.forEach((line, index) => {
    if (!LETTER_LINE_REGEX.test(line) || line.length > 120) return;

    let companyScore = 0;
    let titleScore = 0;
    let nameScore = 0;

    if (looksLikeCompanyLine(line)) companyScore += 4;
    if (lineContainsLexiconToken(line, BUSINESS_CARD_TITLE_KEYWORDS)) titleScore += 4;
    if (isLikelyNameLine(line)) nameScore += 4;
    if (index <= 1 && looksLikeCompanyLine(line)) companyScore += 2;
    if (index >= 1 && index <= 4 && isLikelyNameLine(line)) nameScore += 2;
    if (index >= 1 && index <= 5 && lineContainsLexiconToken(line, BUSINESS_CARD_TITLE_KEYWORDS)) titleScore += 1;
    if (/^[\p{Lu}\s.&'-]{2,}$/u.test(line) && !lineContainsLexiconToken(line, BUSINESS_CARD_TITLE_KEYWORDS)) companyScore += 1;
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

  const geometryLines = (lineItems ?? [])
    .filter((item) => item.frame && item.text && item.text.length >= 2 && item.text.length <= 140)
    .sort((left, right) => (left.frame!.top - right.frame!.top) || (left.frame!.left - right.frame!.left));

  let topZoneLines: string[];
  let middleZoneLines: string[];
  let bottomZoneLines: string[];

  if (geometryLines.length >= 3) {
    const minTop = Math.min(...geometryLines.map((item) => item.frame!.top));
    const maxBottom = Math.max(...geometryLines.map((item) => item.frame!.top + item.frame!.height));
    const totalHeight = Math.max(1, maxBottom - minTop);
    const topBoundary = minTop + totalHeight / 3;
    const middleBoundary = minTop + (totalHeight * 2) / 3;

    topZoneLines = uniqueStrings(
      geometryLines.filter((item) => item.frame!.top < topBoundary).map((item) => item.text)
    );
    middleZoneLines = uniqueStrings(
      geometryLines
        .filter((item) => item.frame!.top >= topBoundary && item.frame!.top < middleBoundary)
        .map((item) => item.text)
    );
    bottomZoneLines = uniqueStrings(
      geometryLines.filter((item) => item.frame!.top >= middleBoundary).map((item) => item.text)
    );
  } else {
    const topEnd = Math.max(1, Math.ceil(orderedLines.length / 3));
    const middleEnd = Math.max(topEnd + 1, Math.ceil((orderedLines.length * 2) / 3));
    topZoneLines = orderedLines.slice(0, topEnd);
    middleZoneLines = orderedLines.slice(topEnd, middleEnd);
    bottomZoneLines = orderedLines.slice(middleEnd);
  }

  const preferredCompanyLines = uniqueStrings(
    topZoneLines.filter((line, index) => isLikelyCompanyZoneLine(line, index)).slice(0, 3)
  );
  const preferredTitleLines = uniqueStrings(
    [...topZoneLines.slice(-2), ...middleZoneLines, ...bottomZoneLines.slice(0, 1)]
      .filter((line) => lineContainsLexiconToken(line, BUSINESS_CARD_TITLE_KEYWORDS))
      .slice(0, 3)
  );
  const titleAnchor = preferredTitleLines[0];
  const titleIndex = titleAnchor ? orderedLines.findIndex((line) => line === titleAnchor) : -1;
  const nearTitleNameLines =
    titleIndex >= 0
      ? uniqueStrings(
          orderedLines
            .slice(Math.max(0, titleIndex - 2), Math.min(orderedLines.length, titleIndex + 3))
            .filter((line) => line !== titleAnchor && isLikelyNameLine(line))
        )
      : [];
  const preferredNameLines = uniqueStrings(
    [...nearTitleNameLines, ...topZoneLines.slice(-2), ...middleZoneLines].filter((line) => isLikelyNameLine(line)).slice(0, 3)
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
