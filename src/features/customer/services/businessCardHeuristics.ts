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
}

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

export function buildBusinessCardCandidateHints(rawText: string, lines?: string[]): BusinessCardCandidateHints {
  const phones = uniqueStrings(rawText.match(PHONE_CANDIDATE_REGEX) ?? []);
  const emails = uniqueStrings((rawText.match(EMAIL_CANDIDATE_REGEX) ?? []).map((x) => x.replace(/[;,]+$/g, "")));
  const websites = uniqueStrings((rawText.match(WEBSITE_CANDIDATE_REGEX) ?? []).map((x) => normalizeWebsite(x)));
  const addressLines = extractAddressLines(rawText, lines);

  return { phones, emails, websites, addressLines };
}
