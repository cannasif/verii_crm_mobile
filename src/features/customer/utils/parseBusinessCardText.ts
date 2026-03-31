import type { BusinessCardOcrResult } from "../types/businessCard";
import {
  BUSINESS_CARD_ADDRESS_HINTS,
  BUSINESS_CARD_COMPANY_MARKERS,
  BUSINESS_CARD_INDUSTRY_KEYWORDS,
  BUSINESS_CARD_TITLE_KEYWORDS,
} from "../services/businessCardLexicon";

const EMAIL_REGEX =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g;
const PHONE_REGEX =
  /(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}(?:\s*\/\s*\d{1,6}|\s*\(\d{1,6}\))?/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;
const WEBSITE_REGEX = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9.]*\.(?:[a-z]{2,}|com\.[a-z]{2}|cn)(?:\/[^\s]*)?/gi;
const FREE_EMAIL_PROVIDERS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "yahoo.com",
  "yandex.ru",
  "mail.ru",
  "icloud.com",
  "proton.me",
  "protonmail.com",
];

const ADDRESS_HINT_FOLDS = BUSINESS_CARD_ADDRESS_HINTS.map(foldFast);
const TITLE_KEYWORD_FOLDS = BUSINESS_CARD_TITLE_KEYWORDS.map(foldFast);
const COMPANY_MARKER_FOLDS = BUSINESS_CARD_COMPANY_MARKERS.map(foldFast);
const INDUSTRY_KEYWORD_FOLDS = BUSINESS_CARD_INDUSTRY_KEYWORDS.map(foldFast);
const normalizedValueCache = new Map<string, string>();

function foldFast(value: string): string {
  return trimAndClean(value)
    .toLowerCase()
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[âàáãäå]/g, "a")
    .replace(/[êèéë]/g, "e")
    .replace(/[îìíï]/g, "i")
    .replace(/[ôòóõö]/g, "o")
    .replace(/[ûùúü]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[ё]/g, "е");
}

function trimAndClean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string): string {
  const cached = normalizedValueCache.get(value);
  if (cached) return cached;
  const normalized = foldFast(value);
  if (normalizedValueCache.size > 4096) {
    normalizedValueCache.clear();
  }
  normalizedValueCache.set(value, normalized);
  return normalized;
}

function truncate(value: string, max: number): string {
  const t = trimAndClean(value);
  return t.length > max ? t.slice(0, max) : t;
}

function isEmailLike(s: string): boolean {
  const t = trimAndClean(s);
  if (!t.includes("@")) return false;
  const idx = t.indexOf("@");
  if (idx === 0 || idx === t.length - 1) return false;
  const after = t.slice(idx + 1);
  return /\./.test(after) && /^[a-zA-Z0-9.-]+$/.test(after);
}

function isPhoneLike(s: string): boolean {
  const t = trimAndClean(s);
  if (t.startsWith("+")) {
    const digits = t.replace(/\D/g, "");
    return digits.length >= 10;
  }
  const digits = t.replace(/\D/g, "");
  return digits.length >= 10 && /^\d+$/.test(digits);
}

function extractEmails(text: string): string[] {
  const emails: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  const emailRegex = new RegExp(EMAIL_REGEX.source, "g");
  while ((match = emailRegex.exec(text)) !== null) {
    const e = match[0];
    if (e && !seen.has(e)) {
      seen.add(e);
      emails.push(e);
    }
  }
  const tokens = text.split(/\s+/);
  for (const token of tokens) {
    const t = token.replace(/[,;:]$/, "");
    if (isEmailLike(t) && !seen.has(t)) {
      seen.add(t);
      emails.push(t);
    }
  }
  return emails;
}

function extractPhones(text: string): string[] {
  const phones: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  const phoneRegex = new RegExp(PHONE_REGEX.source, "g");
  while ((match = phoneRegex.exec(text)) !== null) {
    const raw = trimAndClean(match[0]);
    const digits = raw.replace(/\D/g, "").replace(/^0/, "");
    const key = digits.slice(-10);
    if (digits.length >= 10 && !seen.has(key)) {
      seen.add(key);
      phones.push(raw);
    }
  }
  const tokens = text.split(/\s+/);
  for (const token of tokens) {
    const t = token.replace(/[,;:]$/, "");
    if (isPhoneLike(t)) {
      const normalized = trimAndClean(t);
      const key = normalized.replace(/\D/g, "");
      if (!seen.has(key)) {
        seen.add(key);
        phones.push(normalized);
      }
    }
  }
  return phones;
}

function scorePhoneCandidate(phone: string, text: string): number {
  const normalizedPhone = phone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const contextRegex = new RegExp(`([^\\n]{0,32}${normalizedPhone}[^\\n]{0,32})`, "i");
  const context = text.match(contextRegex)?.[1] ?? "";
  let score = 0;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 11) score += 1;
  if (/\b(?:gsm|mobil)\b/i.test(context)) score += 8;
  if (/\b(?:office|direct)\b/i.test(context)) score += 10;
  if (/\b(?:tel\.?|telefon)\b/i.test(context)) score += 4;
  if (/\b(?:cell)\b/i.test(context) && !/\b(?:gsm|mobil)\b/i.test(context)) score -= 3;
  if (/\b(?:fax|faks)\b/i.test(context)) score -= 8;
  if (/^\+90\s*5|^05/.test(phone.replace(/[()-]/g, "")) && /\b(?:gsm|mobil)\b/i.test(context)) score += 4;
  return score;
}

function rankPhones(phones: string[], text: string): string[] {
  return [...phones]
    .map((phone, index) => ({ phone, index, score: scorePhoneCandidate(phone, text) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.phone);
}

function extractWebsites(text: string, emails: string[] = extractEmails(text)): string[] {
  const websites: string[] = [];
  const seen = new Set<string>();
  const textWithoutEmails = emails.reduce(
    (current, email) => current.replace(new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), " "),
    text
  );
  let match: RegExpExecArray | null;
  const websiteRegex = new RegExp(WEBSITE_REGEX.source, "g");
  while ((match = websiteRegex.exec(textWithoutEmails)) !== null) {
    const w = trimAndClean(match[0]);
    const normalizedWebsite = w.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    const leadingLabel = normalizedWebsite.split(".")[0] ?? "";
    const looksLikeBareSuffix = /^(?:com|net|org|gov|edu|biz|info|co)$/i.test(leadingLabel);
    if (w && !w.includes("@") && !looksLikeBareSuffix && !seen.has(w)) {
      seen.add(w);
      websites.push(w);
    }
  }
  websites.sort((left, right) => {
    const leftPriority = /^(https?:\/\/|www\.)/i.test(left) ? 0 : 1;
    const rightPriority = /^(https?:\/\/|www\.)/i.test(right) ? 0 : 1;
    return leftPriority - rightPriority || left.localeCompare(right);
  });
  return websites;
}

function isAddressLike(line: string): boolean {
  const normalized = normalizeForMatch(line);
  if (!normalized) return false;
  return ADDRESS_HINT_FOLDS.some((hint) => normalized.includes(hint));
}

function isTitleLike(line: string): boolean {
  const normalized = normalizeForMatch(line);
  if (!normalized) return false;
  return (
    TITLE_KEYWORD_FOLDS.some((keyword) => normalized.includes(keyword)) ||
    /\bmanag(?:e|er)?\b/.test(normalized) ||
    /\b(?:director|specialist|executive|engineer|consultant|coordinator|owner|founder)\b/.test(normalized)
  );
}

function isCompanyLike(line: string): boolean {
  const normalized = normalizeForMatch(line);
  if (!normalized) return false;
  return (
    COMPANY_MARKER_FOLDS.some((marker) => normalized.includes(marker)) ||
    INDUSTRY_KEYWORD_FOLDS.some((keyword) => normalized.includes(keyword))
  );
}

function looksLikePersonName(line: string): boolean {
  const cleaned = trimAndClean(line);
  if (!cleaned || /@|\d/.test(cleaned)) return false;
  if (isAddressLike(cleaned) || isTitleLike(cleaned) || isCompanyLike(cleaned)) return false;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  return tokens.every((token) => /^[\p{L}.'-]+$/u.test(token));
}

function looksLikePersonNameNearTitle(line: string): boolean {
  const cleaned = trimAndClean(line);
  if (!cleaned || /@|\d/.test(cleaned)) return false;
  if (isAddressLike(cleaned) || isEmailLike(cleaned) || isPhoneLike(cleaned)) return false;
  if (/@|www\.|https?:\/\//i.test(cleaned)) return false;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) return false;
  return tokens.every((token) => /^[\p{L}.'-]+$/u.test(token));
}

function canBePersonFallbackNearTitle(line: string, customerName: string | undefined): boolean {
  const cleaned = trimAndClean(line);
  if (!cleaned || /@|\d/.test(cleaned)) return false;
  if (customerName && normalizeForMatch(cleaned) === normalizeForMatch(customerName)) return false;
  if (isAddressLike(cleaned) || isEmailLike(cleaned) || isPhoneLike(cleaned)) return false;
  if (/@|www\.|https?:\/\//i.test(cleaned)) return false;
  if (isCompanyLike(cleaned) && !looksLikePersonNameNearTitle(cleaned)) return false;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.length >= 2 && tokens.length <= 5;
}

function findPersonFallbackAroundTitle(lines: string[], title: string, customerName: string | undefined): string | undefined {
  const normalizedTitle = normalizeForMatch(sanitizeTitleLine(title));
  const titleIndex = lines.findIndex((line) => {
    const normalizedLine = normalizeForMatch(sanitizeTitleLine(line));
    return normalizedLine === normalizedTitle || normalizedLine.includes(normalizedTitle) || normalizedTitle.includes(normalizedLine);
  });
  if (titleIndex < 0) return undefined;

  const nearbyLines = lines
    .map((line, index) => ({ line, index, distance: Math.abs(index - titleIndex) }))
    .filter((item) => item.index !== titleIndex && item.distance > 0 && item.distance <= 2)
    .sort((left, right) => left.distance - right.distance || left.index - right.index)
    .map((item) => item.line);

  const strongMatch = nearbyLines.find((line) => canBePersonFallbackNearTitle(line, customerName));
  if (strongMatch) return truncate(strongMatch, 150);

  const nearbyPairs = lines
    .map((line, index) => ({ line, index }))
    .filter((item) => item.index !== titleIndex && Math.abs(item.index - titleIndex) <= 3)
    .sort((left, right) => left.index - right.index);

  for (let i = 0; i < nearbyPairs.length - 1; i += 1) {
    const current = nearbyPairs[i];
    const next = nearbyPairs[i + 1];
    if (!current || !next || next.index !== current.index + 1) continue;

    const merged = trimAndClean(`${current.line} ${next.line}`);
    if (!merged || (customerName && normalizeForMatch(merged) === normalizeForMatch(customerName))) continue;
    if (isAddressLike(merged) || isEmailLike(merged) || isPhoneLike(merged) || isTitleLike(merged)) continue;
    if (/@|www\.|https?:\/\//i.test(merged)) continue;
    if (isCompanyLike(merged) && !looksLikePersonNameNearTitle(merged)) continue;
    const mergedTokens = merged.split(/\s+/).filter(Boolean);
    if (
      looksLikePersonName(merged) ||
      looksLikePersonNameNearTitle(merged) ||
      isSimpleNameCandidate(merged, customerName, title) ||
      (mergedTokens.length === 2 && mergedTokens.every((token) => /^[\p{L}.'-]+$/u.test(token)))
    ) {
      return truncate(merged, 150);
    }
  }

  const softMatch = nearbyLines.find(
    (line) =>
      !isAddressLike(line) &&
      !isEmailLike(line) &&
      !isPhoneLike(line) &&
      !/@|www\.|https?:\/\//i.test(line) &&
      !isCompanyLike(line) &&
      looksLikePersonNameNearTitle(line)
  );
  return softMatch ? truncate(softMatch, 150) : undefined;
}

function findSplitNameAroundTitle(lines: string[], title: string, customerName: string | undefined): string | undefined {
  const normalizedTitle = normalizeForMatch(sanitizeTitleLine(title));
  const titleIndex = lines.findIndex((line) => {
    const normalizedLine = normalizeForMatch(sanitizeTitleLine(line));
    return normalizedLine === normalizedTitle || normalizedLine.includes(normalizedTitle) || normalizedTitle.includes(normalizedLine);
  });
  if (titleIndex < 0) return undefined;

  for (let start = Math.max(0, titleIndex - 3); start < titleIndex; start += 1) {
    const first = trimAndClean(lines[start] ?? "");
    const second = trimAndClean(lines[start + 1] ?? "");
    if (!first || !second) continue;
    if (start + 1 >= titleIndex) continue;
    if (customerName && (normalizeForMatch(first) === normalizeForMatch(customerName) || normalizeForMatch(second) === normalizeForMatch(customerName))) {
      continue;
    }
    if ([first, second].some((line) => isAddressLike(line) || isEmailLike(line) || isPhoneLike(line) || isCompanyLike(line) || isTitleLike(line))) {
      continue;
    }

    const merged = `${first} ${second}`.replace(/\s+/g, " ").trim();
    const mergedTokens = merged.split(/\s+/).filter(Boolean);
    if (mergedTokens.length !== 2) continue;
    if (!mergedTokens.every((token) => /^[\p{L}.'-]+$/u.test(token))) continue;
    return truncate(merged, 150);
  }

  return undefined;
}

function isSimpleNameCandidate(line: string, customerName: string | undefined, title: string | undefined): boolean {
  const cleaned = trimAndClean(line);
  if (!cleaned || /@|\d/.test(cleaned)) return false;
  if (customerName && normalizeForMatch(cleaned) === normalizeForMatch(customerName)) return false;
  if (title && normalizeForMatch(cleaned) === normalizeForMatch(title)) return false;
  if (isAddressLike(cleaned) || isEmailLike(cleaned) || isPhoneLike(cleaned) || isTitleLike(cleaned)) return false;
  if (/@|www\.|https?:\/\//i.test(cleaned)) return false;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  return tokens.every((token) => /^[\p{L}.'-]+$/u.test(token));
}

function stripTrailingContactFragments(line: string): string {
  return trimAndClean(
    line
      .replace(/\b(?:e-?mail|email|mail)\b\s*:?.*$/i, " ")
      .replace(/\b(?:web|website|www|http|https)\b\s*:?.*$/i, " ")
      .replace(/\b(?:phone|gsm|tel\.?|telefon|mobile|mob\.?|cell|office|direct|fax|faks)\b\s*:?.*$/i, " ")
      .replace(/[|•·]+$/g, " ")
  );
}

function sanitizeTitleLine(line: string): string {
  return trimAndClean(
    line
      .replace(/^[|•·\s-]+/, " ")
      .replace(/[|•·]+$/g, " ")
      .replace(/\b(?:phone|gsm|tel\.?|telefon|mobile|mob\.?|cell|office|direct|fax|faks|e-?mail|email|mail|web|website)\b\s*:?.*$/i, " ")
  );
}

function compactFold(value: string): string {
  return normalizeForMatch(value).replace(/[^a-z0-9]+/g, "");
}

function sanitizeAddressLine(line: string): string {
  const sanitized = stripTrailingContactFragments(
    line
      .replace(/\b(?:e-?mail|email|mail)\b\s*:?/gi, " ")
      .replace(/\b(?:web|website|www|http|https)\b\s*:?/gi, " ")
      .replace(/\b(?:phone|gsm|tel\.?|telefon|mobile|mob\.?|cell|office|direct|fax|faks)\b\s*:?/gi, " ")
  );
  return trimAndClean(sanitized.replace(/\s*[-|•·]+\s*$/g, " "));
}

function scoreAddressLine(line: string): number {
  const normalized = normalizeForMatch(line);
  let score = 0;
  if (isAddressLike(line)) score += 5;
  if (/\b\d{5}\b/.test(line)) score += 3;
  if (/\b(?:no|kat|blok|apt|d:|daire)\b/i.test(normalized)) score += 2;
  if (/[\\/,-]/.test(line)) score += 1;
  if (isTitleLike(line)) score -= 5;
  if (isEmailLike(line)) score -= 8;
  if (isPhoneLike(line)) score -= 8;
  if (/@|www\.|https?:\/\//i.test(line)) score -= 8;
  if (line.length < 8) score -= 2;
  return score;
}

function pickCustomerNameLine(lines: string[]): string | undefined {
  const companyCandidate = lines.find((line) => isCompanyLike(line) && !isAddressLike(line) && !isEmailLike(line) && !isPhoneLike(line));
  if (companyCandidate) {
    return truncate(companyCandidate, 250);
  }

  for (const line of lines) {
    if (!line) continue;
    if (isEmailLike(line) || isPhoneLike(line)) continue;
    if (/@|www\.|https?:\/\//i.test(line)) continue;
    if (isAddressLike(line)) continue;
    if (isTitleLike(line)) continue;
    if (looksLikePersonName(line)) continue;
    return truncate(line, 250);
  }
  return lines[0] ? truncate(lines[0], 250) : undefined;
}

function buildAddress(lines: string[]): string | undefined {
  const deduped = new Set<string>();
  const cleaned: string[] = [];
  for (const line of lines) {
    const sanitized = sanitizeAddressLine(line);
    if (!sanitized) continue;
    const folded = normalizeForMatch(sanitized);
    if (deduped.has(folded)) continue;
    deduped.add(folded);
    cleaned.push(sanitized);
  }
  if (cleaned.length === 0) return undefined;

  const scored = cleaned
    .map((line) => ({ line, score: scoreAddressLine(line) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const selected = (scored.length > 0 ? scored.map((item) => item.line) : cleaned).slice(0, 3);
  return selected.length > 0 ? truncate(selected.join("\n"), 500) : undefined;
}

function isWeakLocationSegment(segment: string): boolean {
  const cleaned = trimAndClean(segment);
  if (!cleaned) return true;
  if (/^\d+[a-z]?$/i.test(cleaned)) return true;
  if (/\b(?:build|building|bldg|стр|строение|д\.?|дом)\b/i.test(cleaned)) return true;
  return false;
}

function inferLocationFromAddress(address: string | undefined): Pick<BusinessCardOcrResult, "cityName" | "districtName" | "countryName"> {
  if (!address) return {};

  const flat = address.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const trDistrictMatch = flat.match(/\b\d{5}\s+([\p{L}.'-]+(?:\s+[\p{L}.'-]+)?)\s*\/\s*([\p{L}.'-]+(?:\s+[\p{L}.'-]+)?)\b/u);
  const russiaMatch = flat.match(/\b(?:russia|россия)\s*,\s*([\p{L}.'-]+(?:\s+[\p{L}.'-]+)?)\b/iu);
  const segments = flat
    .split(/[\/,|-]/)
    .map((segment) => trimAndClean(segment))
    .filter(Boolean);

  let countryName: string | undefined;
  let cityName: string | undefined;
  let districtName: string | undefined;

  const countryCandidate = segments.find((segment) => /^(?:turkiye|türkiye|turkey|deutschland|germany|kosovo|albania|russia|россия|china|çin)$/i.test(segment));
  if (countryCandidate) {
    countryName = countryCandidate;
  }

  if (russiaMatch?.[1] && !isWeakLocationSegment(russiaMatch[1])) {
    cityName = russiaMatch[1];
  }

  const upperSegment = [...segments].reverse().find((segment) => /^[A-ZÇĞİIÖŞÜ]{3,}(?:\s+[A-ZÇĞİIÖŞÜ]{2,})*$/u.test(segment));
  if (upperSegment) {
    cityName = upperSegment;
  }

  if (!cityName && segments.length >= 2) {
    const tailCandidate = segments[segments.length - 1];
    if (tailCandidate && !isWeakLocationSegment(tailCandidate)) {
      cityName = tailCandidate;
    }
  }

  if (trDistrictMatch) {
    districtName = trDistrictMatch[1];
    cityName = cityName || trDistrictMatch[2];
  } else if (segments.length >= 2) {
    const candidate = segments[segments.length - 2];
    if (candidate && candidate !== cityName && !/\d{5}/.test(candidate) && !isWeakLocationSegment(candidate)) {
      districtName = candidate;
    }
  }

  return {
    cityName: cityName || undefined,
    districtName: districtName || undefined,
    countryName: countryName || undefined,
  };
}

function toDomainStem(value: string): string | null {
  const normalized = value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
  const parts = normalized.split(".").filter(Boolean);
  if (parts.length === 0) return null;
  return parts[0] ?? null;
}

function toEmailDomain(value: string): string | null {
  const domain = value.split("@")[1]?.toLowerCase().trim();
  return domain || null;
}

function scoreCompanyLine(line: string, stems: string[]): number {
  const normalized = normalizeForMatch(line);
  const compact = compactFold(line);
  let score = 0;
  if (!line) return score;
  if (isCompanyLike(line)) score += 6;
  if (BUSINESS_CARD_COMPANY_MARKERS.some((marker) => normalized.includes(normalizeForMatch(marker)))) score += 8;
  if (BUSINESS_CARD_INDUSTRY_KEYWORDS.some((keyword) => normalized.includes(normalizeForMatch(keyword)))) score += 3;
  if (/^[A-ZÇĞİIÖŞÜ0-9&.\- ]{5,}$/u.test(line.trim())) score += 2;
  if (/\b(?:group|grup|holding)\b/i.test(line)) score += 1;
  if (isTitleLike(line)) score -= 7;
  if (looksLikePersonName(line)) score -= 8;
  if (isAddressLike(line)) score -= 8;
  if (isEmailLike(line) || isPhoneLike(line) || /@|www\.|https?:\/\//i.test(line)) score -= 10;
  if (line.length < 4) score -= 3;

  const matchedStem = stems.find((stem) => {
    const normalizedStem = compactFold(stem);
    return normalizedStem.length >= 4 && (compact.includes(normalizedStem) || normalizedStem.includes(compact));
  });
  if (matchedStem) score += 10;

  return score;
}

function shouldMergeCompanyPair(first: string, second: string): boolean {
  if (!first || !second) return false;
  if (isEmailLike(first) || isPhoneLike(first) || isAddressLike(first) || isTitleLike(first) || looksLikePersonName(first)) return false;
  if (isEmailLike(second) || isPhoneLike(second) || isAddressLike(second) || isTitleLike(second) || looksLikePersonName(second)) return false;
  if (first.length > 36 || second.length > 36) return false;

  const firstCompanyish = isCompanyLike(first) || /^[A-ZÇĞİIÖŞÜ0-9&.\- ]{4,}$/u.test(first.trim());
  const secondCompanyish = isCompanyLike(second) || /^[A-ZÇĞİIÖŞÜ0-9&.\- ]{4,}$/u.test(second.trim());
  return firstCompanyish && secondCompanyish;
}

function recoverCompanyFromSignals(lines: string[], emails: string[], websites: string[]): string | undefined {
  const stems = [...emails.map((email) => email.split("@")[1] ?? ""), ...websites]
    .map((value) => toDomainStem(value))
    .filter((value): value is string => Boolean(value));
  if (stems.length === 0) return undefined;

  const mergedPairLines = lines
    .slice(0, -1)
    .filter((line, index) => shouldMergeCompanyPair(line, lines[index + 1] ?? ""))
    .map((line, index) => `${line} ${lines[index + 1] ?? ""}`.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !isEmailLike(line) && !isPhoneLike(line) && !isAddressLike(line));

  const candidates = [...lines, ...mergedPairLines]
    .map((line) => ({ line, score: scoreCompanyLine(line, stems) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.line.length - left.line.length);

  return candidates[0] ? truncate(candidates[0].line, 250) : undefined;
}

function scoreTitleLine(line: string, customerName: string | undefined): number {
  const sanitized = sanitizeTitleLine(line);
  if (!sanitized) return -100;
  let score = 0;
  if (customerName && normalizeForMatch(sanitized) === normalizeForMatch(customerName)) score -= 10;
  if (isTitleLike(sanitized)) score += 8;
  if (BUSINESS_CARD_TITLE_KEYWORDS.some((keyword) => normalizeForMatch(sanitized).includes(normalizeForMatch(keyword)))) score += 6;
  if (isAddressLike(sanitized)) score -= 10;
  if (isCompanyLike(sanitized) && !isTitleLike(sanitized)) score -= 8;
  if (looksLikePersonName(sanitized)) score -= 4;
  if (isEmailLike(sanitized) || isPhoneLike(sanitized) || /@|www\.|https?:\/\//i.test(sanitized)) score -= 10;
  if (sanitized.split(/\s+/).length > 7) score -= 2;
  return score;
}

function pickTitleLine(lines: string[], customerName: string | undefined): string | undefined {
  const scored = lines
    .map((line, index) => ({ line: sanitizeTitleLine(line), score: scoreTitleLine(line, customerName), index }))
    .filter((item) => item.line && item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const best = scored[0];
  if (!best?.line) return undefined;

  const nextLine = lines[best.index + 1];
  const sanitizedNextLine = nextLine ? sanitizeTitleLine(nextLine) : "";
  if (
    sanitizedNextLine &&
    sanitizedNextLine !== best.line &&
    scoreTitleLine(sanitizedNextLine, customerName) > 3 &&
    !isAddressLike(sanitizedNextLine) &&
    !isEmailLike(sanitizedNextLine) &&
    !isPhoneLike(sanitizedNextLine)
  ) {
    return truncate(`${best.line} / ${sanitizedNextLine}`, 150);
  }

  return truncate(best.line, 150);
}

function pickPreferredWebsite(websites: string[], emails: string[]): string | undefined {
  if (websites.length === 0) return undefined;
  const emailDomains = emails
    .map((email) => email.split("@")[1]?.toLowerCase())
    .filter((value): value is string => Boolean(value));

  const scored = websites
    .map((website, index) => {
      const normalizedWebsite = website.toLowerCase();
      const domain = normalizedWebsite.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
      let score = 0;
      if (/^(https?:\/\/|www\.)/i.test(website)) score += 2;
      if (emailDomains.some((emailDomain) => domain.includes(emailDomain) || emailDomain.includes(domain))) score += 8;
      if (emailDomains.length > 0 && !emailDomains.some((emailDomain) => domain.includes(emailDomain) || emailDomain.includes(domain))) {
        score -= 4;
      }
      return { website, score, index };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const best = scored[0];
  const emailDomain = emailDomains[0];
  if (best && emailDomain) {
    const bestDomain = best.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
    const aligned = bestDomain.includes(emailDomain) || emailDomain.includes(bestDomain);
    const weakBestDomain =
      !bestDomain ||
      bestDomain.length < 8 ||
      /^(?:com|net|org|gov|edu|biz|info|co)\.[a-z]{2,}$/i.test(bestDomain);
    if (!aligned && weakBestDomain) {
      return `www.${emailDomain}`;
    }
  }

  return best?.website;
}

function deriveWebsiteFromEmails(emails: string[]): string | undefined {
  const candidate = emails
    .map((email) => toEmailDomain(email))
    .find((domain): domain is string => typeof domain === "string" && !FREE_EMAIL_PROVIDERS.includes(domain));
  return candidate ? `www.${candidate}` : undefined;
}

function scorePersonLine(
  line: string,
  customerName: string | undefined,
  title: string | undefined,
  index: number,
  titleIndex: number
): number {
  const cleaned = trimAndClean(line);
  if (!cleaned) return -100;
  if (/\b(?:yaratici|yaratıcı|otomasyon|automation|makine|machine|sanayi|industry)\b/i.test(cleaned)) return -100;
  let score = 0;
  if (customerName && normalizeForMatch(cleaned) === normalizeForMatch(customerName)) score -= 12;
  if (title && normalizeForMatch(cleaned) === normalizeForMatch(title)) score -= 12;
  if (looksLikePersonName(cleaned)) score += 10;
  else if (looksLikePersonNameNearTitle(cleaned)) score += 7;
  else if (canBePersonFallbackNearTitle(cleaned, customerName)) score += 4;
  if (isAddressLike(cleaned)) score -= 10;
  if (isEmailLike(cleaned) || isPhoneLike(cleaned) || /@|www\.|https?:\/\//i.test(cleaned)) score -= 10;
  if (isCompanyLike(cleaned) && !looksLikePersonNameNearTitle(cleaned)) score -= 6;
  if (titleIndex >= 0) {
    const distance = Math.abs(titleIndex - index);
    if (distance === 1) score += 8;
    else if (distance === 2) score += 4;
    else if (distance > 4) score -= 2;
  }
  return score;
}

function pickPersonNameLine(lines: string[], customerName: string | undefined, title: string | undefined): string | undefined {
  const titleIndex = title
    ? lines.findIndex((line) => {
        const normalizedLine = normalizeForMatch(sanitizeTitleLine(line));
        const normalizedTitle = normalizeForMatch(sanitizeTitleLine(title));
        return normalizedLine === normalizedTitle || normalizedLine.includes(normalizedTitle) || normalizedTitle.includes(normalizedLine);
      })
    : -1;

  const scored = lines
    .map((line, index) => ({
      line,
      score: scorePersonLine(line, customerName, title, index, titleIndex),
      index,
    }))
    .filter((item) => item.score > 0);

  if (titleIndex >= 0) {
    for (let index = Math.max(0, titleIndex - 3); index < titleIndex; index += 1) {
      const current = trimAndClean(lines[index] ?? "");
      const next = trimAndClean(lines[index + 1] ?? "");
      if (!current || !next) continue;
      if (index + 1 >= titleIndex) continue;
      const merged = trimAndClean(`${current} ${next}`);
      if (isAddressLike(merged) || isEmailLike(merged) || isPhoneLike(merged) || isTitleLike(merged) || isCompanyLike(merged)) continue;
      const mergedTokens = merged.split(/\s+/).filter(Boolean);
      if (mergedTokens.length !== 2) continue;
      if (!mergedTokens.every((token) => /^[\p{L}.'-]+$/u.test(token))) continue;
      scored.push({
        line: merged,
        score: 18 - Math.abs(titleIndex - index),
        index,
      });
    }
  }

  scored.sort((left, right) => right.score - left.score || left.index - right.index);

  return scored[0]?.line ? truncate(scored[0].line, 150) : undefined;
}

export function parseBusinessCardText(rawText: string): BusinessCardOcrResult {
  if (!rawText || typeof rawText !== "string") return {};
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = text
    .split("\n")
    .map((line) => trimAndClean(line))
    .filter((line) => line.length > 1 && line.length < 200);

  const emails = extractEmails(text);
  const phones = rankPhones(extractPhones(text), text);
  const websites = extractWebsites(text, emails);

  let remaining = text;
  emails.forEach((e) => (remaining = remaining.replace(e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), " ")));
  phones.forEach((p) => (remaining = remaining.replace(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), " ")));
  websites.forEach((w) => (remaining = remaining.replace(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), " ")));
  remaining = remaining.replace(URL_REGEX, " ");
  const remainingLines = remaining
    .split("\n")
    .map((l) => trimAndClean(l))
    .filter((l) => l.length > 1 && l.length < 200);

  let preferredWebsite = pickPreferredWebsite(websites, emails);
  if (!preferredWebsite) {
    preferredWebsite = deriveWebsiteFromEmails(emails);
  }

  const recoveredCompany = recoverCompanyFromSignals(
    remainingLines,
    emails,
    preferredWebsite ? [preferredWebsite, ...websites] : websites
  );
  const customerName = recoveredCompany ?? pickCustomerNameLine(remainingLines);
  let title = pickTitleLine(rawLines, customerName);
  let contactNameAndSurname = pickPersonNameLine(rawLines, customerName, title);
  if (contactNameAndSurname && isTitleLike(contactNameAndSurname)) {
    if (!title) {
      title = sanitizeTitleLine(contactNameAndSurname);
    }
    contactNameAndSurname = undefined;
  }
  if (
    contactNameAndSurname &&
    (!looksLikePersonName(contactNameAndSurname) ||
      isCompanyLike(contactNameAndSurname) ||
      isAddressLike(contactNameAndSurname))
  ) {
    contactNameAndSurname = undefined;
  }
  if (
    contactNameAndSurname &&
    customerName &&
    compactFold(contactNameAndSurname) === compactFold(customerName)
  ) {
    contactNameAndSurname = undefined;
  }
  if (
    contactNameAndSurname &&
    /\b(?:bölüm|bolum|bölümü|bolumu|department|representative|temsilcisi)\b/i.test(contactNameAndSurname) &&
    !looksLikePersonName(contactNameAndSurname)
  ) {
    if (!title) {
      title = sanitizeTitleLine(contactNameAndSurname);
    }
    contactNameAndSurname = undefined;
  }
  if (
    contactNameAndSurname &&
    (
      isCompanyLike(contactNameAndSurname) ||
      /\b(?:yaratici|yaratıcı|otomasyon|automation|makine|machine|sanayi|industry)\b/i.test(contactNameAndSurname)
    ) &&
    !looksLikePersonName(contactNameAndSurname)
  ) {
    contactNameAndSurname = undefined;
  }
  if (!contactNameAndSurname && title) {
    contactNameAndSurname = findSplitNameAroundTitle(rawLines, title, customerName);
  }
  if (!contactNameAndSurname && title) {
    contactNameAndSurname = findPersonFallbackAroundTitle(rawLines, title, customerName);
  }
  if (!contactNameAndSurname) {
    const genericPersonFallback = rawLines.find(
      (line) =>
        line !== customerName &&
        line !== title &&
        !isAddressLike(line) &&
        !isEmailLike(line) &&
        !isPhoneLike(line) &&
        (looksLikePersonName(line) || looksLikePersonNameNearTitle(line))
    );
    if (genericPersonFallback) {
      contactNameAndSurname = truncate(genericPersonFallback, 150);
    }
  }
  if (!contactNameAndSurname) {
    const simpleNameFallback = rawLines.find((line) => isSimpleNameCandidate(line, customerName, title));
    if (simpleNameFallback) {
      contactNameAndSurname = truncate(simpleNameFallback, 150);
    }
  }
  const addressParts = remainingLines.filter(
    (line) => line !== customerName && line !== title && line !== contactNameAndSurname
  );
  const address = buildAddress(addressParts);
  let website = preferredWebsite;
  const businessEmailDomain = emails
    .map((email) => toEmailDomain(email))
    .find((domain): domain is string => typeof domain === "string" && !FREE_EMAIL_PROVIDERS.includes(domain));
  if (businessEmailDomain) {
    const currentDomain = website?.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
    const aligned = currentDomain.includes(businessEmailDomain) || businessEmailDomain.includes(currentDomain);
    const weakDomain =
      !currentDomain ||
      currentDomain.length < 8 ||
      /^(?:com|net|org|gov|edu|biz|info|co)\.[a-z]{2,}$/i.test(currentDomain);
    if (!aligned && weakDomain) {
      website = `www.${businessEmailDomain}`;
    }
  }
  const location = inferLocationFromAddress(address);

  return {
    customerName: customerName || undefined,
    contactNameAndSurname: contactNameAndSurname || undefined,
    title: title || undefined,
    cityName: location.cityName,
    districtName: location.districtName,
    countryName: location.countryName,
    phone1: phones[0] ? truncate(phones[0], 100) : undefined,
    phone2: phones[1] ? truncate(phones[1], 100) : undefined,
    email: emails[0] ? truncate(emails[0], 100) : undefined,
    address: address || undefined,
    website: website ? truncate(website, 100) : undefined,
  };
}
