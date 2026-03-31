import { z } from "zod";
import type { AddressParts, BusinessCardExtraction, BusinessCardOcrResult, BusinessCardReviewFlag, BusinessCardReviewSummary } from "../types/businessCard";
import { detectBusinessCardLanguageProfile } from "../services/businessCardLanguageProfileService";
import {
  BUSINESS_CARD_ADDRESS_HINTS,
  BUSINESS_CARD_COMPANY_MARKERS,
  BUSINESS_CARD_CONTACT_TOKENS,
  BUSINESS_CARD_INDUSTRY_KEYWORDS,
  BUSINESS_CARD_TITLE_KEYWORDS,
  lineContainsLexiconToken,
} from "../services/businessCardLexicon";

const AddressPartsSchema = z.object({
  neighborhood: z.string().nullable(),
  street: z.string().nullable(),
  avenue: z.string().nullable(),
  boulevard: z.string().nullable(),
  sitePlaza: z.string().nullable(),
  block: z.string().nullable(),
  buildingNo: z.string().nullable(),
  floor: z.string().nullable(),
  apartment: z.string().nullable(),
  postalCode: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
});

export const BusinessCardExtractionSchema = z.object({
  contactNameAndSurname: z.string().nullable().optional(),
  name: z.string().nullable(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  phones: z.array(z.string()),
  emails: z.array(z.string()),
  website: z.string().nullable(),
  address: z.string().nullable(),
  addressParts: AddressPartsSchema.optional(),
  social: z.object({
    linkedin: z.string().nullable(),
    instagram: z.string().nullable(),
    x: z.string().nullable(),
    facebook: z.string().nullable(),
  }),
  notes: z.array(z.string()),
});

const EMPTY_ADDRESS_PARTS: AddressParts = {
  neighborhood: null,
  street: null,
  avenue: null,
  boulevard: null,
  sitePlaza: null,
  block: null,
  buildingNo: null,
  floor: null,
  apartment: null,
  postalCode: null,
  district: null,
  province: null,
  country: null,
};

const PHONE_E164_GENERIC_REGEX = /^\+\d{7,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNICODE_LETTER_REGEX = /\p{L}/u;
const UNICODE_LETTER_GLOBAL_REGEX = /\p{L}/gu;
const UNICODE_UPPERCASE_GLOBAL_REGEX = /\p{Lu}/gu;
const CYRILLIC_REGEX = /\p{Script=Cyrillic}/u;
const CONTACT_TOKEN_REGEX = new RegExp(
  `@|www\\.|https?:\\/\\/|${BUSINESS_CARD_CONTACT_TOKENS.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}`,
  "i"
);
const ADDRESS_HINT_REGEX =
  new RegExp(`\\b(${BUSINESS_CARD_ADDRESS_HINTS.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
const ADDRESS_NO_REGEX = /\b(?:no|numara)\s*[:.]?\s*\d{1,5}(?:\s*[-/]\s*\w{1,5})?|\bn\s*[:.]\s*\d{1,5}(?:\s*[-/]\s*\w{1,5})?/i;
const POSTAL_CODE_REGEX = /\b\d{4,6}\b/;
const ADDRESS_EXCLUDE_REGEX =
  /@|www\.|https?:\/\/|\.com|\.net|\.org|\.tr|\.es|\.ru|\.de|\.al|\.cn|e-?mail|email|tel\.?|telefon|gsm|mobile|mob\.?|cell|office|fax|faks|linkedin|instagram|facebook|x\.com|twitter|(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}/i;
const COUNTRY_SUFFIX_REGEX = /\s*[-/–,]\s*(?:türkiye|turkey|turkiye)\s*$/i;
const COUNTRY_LINE_REGEX = /^\s*(?:türkiye|turkey|turkiye|tr|españa|espana|spain|russia|россия|china|çin|китай|kosovo|kosov[eë]s)\s*$/i;
const WEBSITE_CANDIDATE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]*\.(?:com(?:\.[a-z]{2})?|net|org|tr|edu(?:\.tr)?|gov(?:\.tr)?|io|biz|info|me|tv|es|ru|de|al|eu|fr|it|cn|co\.uk)(?:\/[^\s]*)?/gi;
const WEBSITE_TLD_REGEX = /\.(?:com(?:\.[a-z]{2})?|net|org|tr|edu(?:\.tr)?|gov(?:\.tr)?|io|biz|info|me|tv|es|ru|de|al|eu|fr|it|cn|co\.uk)(?:\/|$)/i;
const WEBSITE_BLACKLIST_REGEX = /\b(A\.?\s?Ş|AŞ|LTD|ŞT[İI]|SAN|T[İI]C|DIŞ|AKS|ORTAKLIĞI|ООО|ЗАО|ОАО)\b/i;
const PHONE_CANDIDATE_REGEX =
  /(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}(?:\b(?:ext|ext\.|dahili|int\.?|pbx)\s*[:.]?\s*\d{1,6}\b|\s*\/\s*\d{1,6}|\s*\(\d{1,6}\))?/gi;
const PHONE_IN_TEXT_REGEX =
  /(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}(?:\b(?:ext|ext\.|dahili|int\.?|pbx)\s*[:.]?\s*\d{1,6}\b|\s*\/\s*\d{1,6}|\s*\(\d{1,6}\))?/i;
const LETTER_CHAR_REGEX = UNICODE_LETTER_REGEX;
const LETTER_GLOBAL_REGEX = UNICODE_LETTER_GLOBAL_REGEX;
const UPPER_LETTER_GLOBAL_REGEX = UNICODE_UPPERCASE_GLOBAL_REGEX;
const PERSON_TOKEN_REGEX = /^[\p{L}'.-]{2,}$/u;
const SLOGAN_NOISE_REGEX =
  /\b(everything simple|member of|official dealer|kap[ıi]\s+ve\s+pencere\s+aksesuarlar[ıi]|group member|made simple|komple lojistik|d[ıi]ş ticaret çözümleri|dis ticaret cozumleri|çözümleri|cozumleri|international road transport|since\s+\d{4})\b/i;
const SERVICE_CONNECTOR_TOKENS = new Set(["ve", "and", "-", "/", "eşikli", "eşiksiz"]);
const COMPANY_CONNECTOR_TOKENS = new Set(["ve", "and", "of", "und", "&"]);
const FREE_EMAIL_PROVIDER_SET = new Set([
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
]);

const SAFE_PROVINCES = new Set([
  "istanbul", "ankara", "izmir", "bursa", "kocaeli", "antalya", "konya",
  "gaziantep", "mersin", "adana", "kayseri", "tekirdağ", "sakarya",
  "muğla", "aydın", "manisa", "balıkesir", "eskişehir", "denizli",
  "samsun", "trabzon", "erzurum", "diyarbakır", "malatya", "van",
  "şanlıurfa", "hatay", "kahramanmaraş", "ordu", "düzce", "edirne",
  "çanakkale", "yalova", "bolu", "isparta", "aksaray", "sivas",
  "kırklareli", "osmaniye", "batman", "mardin", "bingöl", "elazığ",
  "afyonkarahisar", "kütahya", "zonguldak", "bartın", "karabük",
  "tokat", "amasya", "giresun", "rize", "artvin", "niğde", "nevşehir",
  "trazo", "coruna", "moscow", "prishtina", "drenas", "bushat",
  "kosovo", "spain", "espana", "españa", "russia", "россия", "москва",
  "china", "çin", "xian", "xi'an", "ya'an",
]);

const KNOWN_DISTRICTS = new Set([
  "esenyurt", "beşiktaş", "nilüfer", "dikilitaş", "bayrampaşa", "ataşehir",
  "kadıköy", "üsküdar", "beylikdüzü", "başakşehir", "bağcılar", "ümraniye",
  "maltepe", "pendik", "kartal", "çekmeköy", "sancaktepe", "sultanbeyli",
  "tuzla", "şile", "silivri", "bakırköy", "zeytinburnu", "güngören",
  "esenler", "gaziosmanpaşa", "sarıyer", "eyüpsultan", "fatih", "beyoğlu",
  "şişli", "kağıthane", "arnavutköy", "sultangazi", "çatalca",
  "büyükçekmece", "küçükçekmece", "avcılar", "beykoz", "kavacık",
  "gebze", "akçaburgaz", "caferağa", "moda", "rüzgarlıbahçe",
  "osmangazi", "yıldırım", "inegöl", "mudanya", "gemlik",
  "çankaya", "keçiören", "mamak", "etimesgut", "sincan", "yenimahalle",
  "bornova", "karşıyaka", "konak", "buca", "bayraklı", "çiğli",
  "seyhan", "çukurova", "yüreğir", "sarıçam",
  "şahinbey", "şehitkamil",
  "toroslar", "akdeniz", "yenişehir", "mezitli", "tarsus",
  "melikgazi", "kocasinan", "talas",
  "kepez", "muratpaşa", "konyaaltı", "alanya",
  "selçuklu", "meram", "karatay",
  "chayán", "chayan", "eyüp", "eyup",
]);

const rawTextLineCache = new Map<string, string[]>();
const languageProfileCache = new Map<string, ReturnType<typeof detectBusinessCardLanguageProfile>>();

function getCachedRawLines(rawText: string | undefined): string[] {
  if (!rawText) return [];
  const cached = rawTextLineCache.get(rawText);
  if (cached) return cached;
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (rawTextLineCache.size > 256) {
    rawTextLineCache.clear();
  }
  rawTextLineCache.set(rawText, lines);
  return lines;
}

function detectBusinessCardLanguageProfileCached(value: string): ReturnType<typeof detectBusinessCardLanguageProfile> {
  const cached = languageProfileCache.get(value);
  if (cached) return cached;
  const detected = detectBusinessCardLanguageProfile(value);
  if (languageProfileCache.size > 1024) {
    languageProfileCache.clear();
  }
  languageProfileCache.set(value, detected);
  return detected;
}

function normalizeNullable(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCompanySuffix(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/\bA\.?\s?S\.?\b/gi, "A.Ş.")
    .replace(/\bLTD\.?\s*STI\.?\b/gi, "Ltd. Şti.")
    .replace(/\bGMBH\b/gi, "GmbH")
    .replace(/\bL\.L\.C\.\.+\b/g, "L.L.C.")
    .replace(/\bLLC\b/g, "LLC")
    .replace(/\bL\.L\.C\b/g, "L.L.C.")
    .replace(/\bCO\.?\s*LTD\.?\b/gi, "Co. Ltd.")
    .replace(/\.{2,}/g, ".")
    .trim();
}

function foldLocaleToken(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/ё/g, "е");
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

function pushNote(notes: string[], note: string): void {
  const cleaned = note.replace(/\s+/g, " ").trim();
  if (!cleaned) return;
  if (!notes.includes(cleaned)) notes.push(cleaned);
}

function stripPhoneLabel(value: string): string {
  return value
    .replace(/\b(tel|telefon|gsm|mobile|cep|fax|faks|phone|direct)\b\s*:?/gi, " ")
    .replace(/^[TMDPF]\s*[|:I.]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripContactFragments(value: string): string {
  const cleaned = value
    .replace(/\b(e-?mail|email|www|http|tel\.?|telefon|gsm|mobile|mob\.?|cell|phone|office|direct|fax|faks)\b\s*[:.]?/gi, " | ")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, " | ")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, " | ")
    .replace(PHONE_CANDIDATE_REGEX, " | ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  const parts = cleaned
    .split("|")
    .map((part) => part.replace(/[-,:;|/]+$/g, "").trim())
    .filter(Boolean);
  if (parts.length === 0) return "";

  const strong = parts.filter((part) => isStrongAddressLine(part));
  if (strong.length > 0) {
    return strong.sort((a, b) => b.length - a.length)[0]!;
  }

  return parts[parts.length - 1]!;
}

function normalizePhone(raw: string): { phone: string | null; note?: string; priority?: number } {
  const source = raw.replace(/\s+/g, " ").trim();
  if (!source) return { phone: null };
  const isPreferredMobileLabel = /(gsm|mobile|mob\.?|cell|cep|моб\.?|мобильн)/i.test(source);

  const digitsOnly = source.replace(/[^\d]/g, "");
  if (/^444\d{4,5}$/.test(digitsOnly)) {
    return { phone: null, note: `Çağrı merkezi: ${source}` };
  }
  if (/^0?850\d{7}$/.test(digitsOnly)) {
    return { phone: null, note: `Özel hat: ${source}` };
  }

  const extByWord = source.match(/\b(?:dahili|ext\.?|iç\s*hat|int\.?|x)\s*[:.]?\s*(\d{1,6})\b/i)?.[1];
  const extBySlash = source.match(/\/\s*(\d{2,6})\b/)?.[1];
  const extByTailParen = source.match(/\((\d{2,6})\)\s*$/)?.[1];
  const extension = extByWord || extBySlash || extByTailParen;
  const isFax = /\bfax|faks\b/i.test(source);

  let baseSource = source;
  if (extension) {
    if (extByWord) {
      baseSource = source.replace(/\b(?:dahili|ext\.?|iç\s*hat|int\.?|x)\s*[:.]?\s*\d{1,6}\b/i, "").trim();
    } else if (extBySlash) {
      baseSource = source.replace(/\/\s*\d{2,6}\b/, "").trim();
    } else if (extByTailParen) {
      baseSource = source.replace(/\(\d{2,6}\)\s*$/, "").trim();
    }
  }

  const phoneLikeMatch = baseSource.match(
    /(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}/
  );
  const sourceForNormalization = phoneLikeMatch?.[0] ?? baseSource;

  let compact = stripPhoneLabel(sourceForNormalization).replace(/[^\d+]/g, "");
  if (!compact) {
    if (extension) {
      return { phone: null, note: isFax ? `Fax Dahili: ${extension}` : `Dahili: ${extension}` };
    }
    return { phone: null };
  }

  if (compact.startsWith("+")) {
    compact = `+${compact.slice(1).replace(/\+/g, "")}`;
  } else {
    compact = compact.replace(/\+/g, "");
  }

  if (compact.startsWith("00")) {
    compact = compact.slice(2);
  }

  let digits = compact.startsWith("+") ? compact.slice(1) : compact;
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `90${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `90${digits}`;
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  const normalized = `+${digits}`;
  if (!PHONE_E164_GENERIC_REGEX.test(normalized)) {
    if (extension) {
      return { phone: null, note: isFax ? `Fax Dahili: ${extension}` : `Dahili: ${extension}` };
    }
    return { phone: null, note: `Şüpheli telefon: ${source}` };
  }

  if (isFax) {
    const note = extension ? `Fax: ${normalized}, Dahili: ${extension}` : `Fax: ${normalized}`;
    return { phone: null, note };
  }

  const note = extension ? `Dahili: ${extension}` : undefined;
  const priority = isPreferredMobileLabel || /^\+905\d{9}$/.test(normalized) ? 0 : 1;
  return { phone: normalized, note, priority };
}

function normalizePhones(values: string[], notes: string[]): string[] {
  const normalized: Array<{ phone: string; priority: number }> = [];
  for (const value of values) {
    const result = normalizePhone(value);
    if (result.phone && !normalized.some((item) => item.phone === result.phone)) {
      normalized.push({ phone: result.phone, priority: result.priority ?? 1 });
    }
    if (result.note) {
      pushNote(notes, result.note);
    }
  }
  return normalized
    .sort((a, b) => a.priority - b.priority || a.phone.localeCompare(b.phone, "tr"))
    .map((item) => item.phone);
}

function digitsTail(value: string, size = 5): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-size);
}

function sortPhonesByRawContext(phones: string[], rawText?: string): string[] {
  if (!rawText || phones.length <= 1) return phones;

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const websiteSource = rawText.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, " ");
  const websiteCount = (websiteSource.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(?:\/[^\s]*)?/gi) ?? [])
    .map((value) => value.toLowerCase())
    .filter((value, index, all) => all.indexOf(value) === index).length;
  const hasMultipleBrandWebsites = websiteCount > 1;
  const hasCyrillicScript = /[\u0400-\u04FF]/.test(rawText);

  return [...phones].sort((left, right) => {
    const findPriority = (phone: string): number => {
      const tail = digitsTail(phone);
      const line = lines.find((candidate) => candidate.replace(/\D/g, "").includes(tail));
      const defaultPriority = /^\+905\d{9}$/.test(phone) ? 0 : 1;
      if (!line) return defaultPriority;
      if (/(gsm|mobil|mobile|mob\.?|cep)/i.test(line)) return 0;
      if (/(?:моб\.?|мобильн)/i.test(line)) return 0;
      if (/(?:office|direct|офис)/i.test(line)) return hasCyrillicScript || hasMultipleBrandWebsites ? 1 : 0;
      if (/(?:cell)/i.test(line)) return hasMultipleBrandWebsites ? 0 : 1;
      return defaultPriority;
    };

    const leftPriority = findPriority(left);
    const rightPriority = findPriority(right);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.localeCompare(right, "tr");
  });
}

function normalizeEmails(values: string[], notes: string[]): string[] {
  const emails: string[] = [];
  for (const value of values) {
    const cleaned = value
      .replace(/\b(e-?mail|email|mail)\b\s*:?/gi, " ")
      .replace(/[;,]+$/g, "")
      .trim()
      .toLowerCase();
    if (!cleaned) continue;
    if (!EMAIL_REGEX.test(cleaned)) continue;
    if (!emails.includes(cleaned)) emails.push(cleaned);
    if (/\bkep\b/i.test(cleaned)) {
      pushNote(notes, `KEP olabilir: ${cleaned}`);
    }
  }
  return emails;
}

function extractPhoneCandidatesFromRawText(rawText: string): string[] {
  const candidates: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(PHONE_CANDIDATE_REGEX.source, "gi");
  while ((match = regex.exec(rawText)) !== null) {
    const value = match[0]?.replace(/\s+/g, " ").trim();
    if (value && !candidates.includes(value)) {
      candidates.push(value);
    }
  }
  return candidates;
}

function extractEmailCandidatesFromRawText(rawText: string): string[] {
  const matches = rawText.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) ?? [];
  return uniqueStrings(matches.map((x) => x.replace(/[;,]+$/g, "")));
}

function extractDomainFromWebsite(value: string): string {
  const withoutProtocol = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return withoutProtocol.split("/")[0]?.toLowerCase() ?? "";
}

function isValidWebsite(candidate: string): boolean {
  const lower = candidate.toLowerCase();
  if (!lower.includes(".")) return false;
  if (!WEBSITE_TLD_REGEX.test(lower)) return false;
  return true;
}

function normalizeWebsite(value: string | null, notes?: string[]): string | null {
  if (!value) return null;

  const original = value.replace(/\s+/g, " ").trim();
  let candidate = original
    .replace(/\b(web|website)\b\s*:?/gi, " ")
    .trim()
    .replace(/^[("']+/, "")
    .replace(/[)"',;:]+$/g, "");

  if (!candidate) return null;
  if (candidate.includes(" ")) {
    candidate = candidate.split(/\s+/)[0] ?? "";
  }

  if (!candidate) return null;
  if (candidate.includes("@")) return null;
  if (WEBSITE_BLACKLIST_REGEX.test(candidate.toUpperCase())) {
    if (notes) pushNote(notes, `Şirket satırı parçası olabilir: ${original}`);
    return null;
  }

  const lowered = candidate.toLowerCase();
  if (!isValidWebsite(lowered)) return null;
  return lowered;
}

function extractWebsiteCandidatesFromRawText(rawText: string): string[] {
  const textWithoutEmails = rawText.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, " ");
  const candidates: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(WEBSITE_CANDIDATE_REGEX.source, "gi");
  while ((match = regex.exec(textWithoutEmails)) !== null) {
    const normalized = normalizeWebsite(match[0]);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  }
  return candidates;
}

function pickWebsiteFromRawText(rawText: string | undefined, emails: string[], notes: string[]): string | null {
  if (!rawText) return null;
  if (!/(www|http|\.com|\.com\.tr|\.net|\.org|\.tr)/i.test(rawText)) {
    return null;
  }

  const candidates = extractWebsiteCandidatesFromRawText(rawText);
  if (candidates.length === 0) return null;

  const emailDomains = emails.map((x) => x.split("@")[1]?.toLowerCase()).filter(Boolean) as string[];
  if (emailDomains.length > 0) {
    const matched = candidates.find((candidate) => {
      const domain = extractDomainFromWebsite(candidate);
      return emailDomains.some((emailDomain) => domain.includes(emailDomain) || emailDomain.includes(domain));
    });
    if (matched) return matched;
  }

  if (candidates.length > 1) {
    for (const extra of candidates.slice(1)) {
      pushNote(notes, `Marka/ek website: ${extra}`);
    }
  }
  return candidates[0] ?? null;
}

function pickWebsiteAlignedWithEmail(currentWebsite: string | null, rawText: string | undefined, emails: string[], notes: string[]): string | null {
  const emailDomains = emails.map((x) => x.split("@")[1]?.toLowerCase()).filter(Boolean) as string[];
  if (emailDomains.length === 0) return currentWebsite;
  const primaryEmailDomain = emailDomains[0] ?? "";

  const currentDomain = extractDomainFromWebsite(currentWebsite ?? "");
  if (currentDomain && emailDomains.some((emailDomain) => currentDomain.includes(emailDomain) || emailDomain.includes(currentDomain))) {
    return currentWebsite;
  }

  const candidates = extractWebsiteCandidatesFromRawText(rawText ?? "");
  const matched = candidates.find((candidate) => {
    const domain = extractDomainFromWebsite(candidate);
    return emailDomains.some((emailDomain) => domain.includes(emailDomain) || emailDomain.includes(domain));
  });

  if (matched) {
    if (currentWebsite && matched !== currentWebsite) {
      pushNote(notes, `Marka/ek website: ${currentWebsite}`);
    }
    return matched;
  }

  const weakCurrentWebsite =
    !currentDomain ||
    currentDomain.length < 8 ||
    /^(?:com|net|org|gov|edu|biz|info|co)\.[a-z]{2,}$/i.test(currentDomain);

  if (primaryEmailDomain && weakCurrentWebsite && !FREE_EMAIL_PROVIDER_SET.has(primaryEmailDomain)) {
    if (currentWebsite && currentWebsite !== `www.${primaryEmailDomain}`) {
      pushNote(notes, `Marka/ek website: ${currentWebsite}`);
    }
    return `www.${primaryEmailDomain}`;
  }

  return currentWebsite;
}

function inferCompanyFromDomainLines(rawText: string | undefined, domains: string[]): string | null {
  if (!rawText || domains.length === 0) return null;
  const normalizedDomains = domains
    .map((domain) => domain.split(".")[0]?.replace(/[-_]/g, " ").trim().toLocaleLowerCase("tr-TR"))
    .filter(Boolean) as string[];
  const compactDomains = normalizedDomains
    .map((domain) => foldLocaleToken(domain).replace(/[^\p{L}\d]/gu, ""))
    .filter(Boolean);
  if (normalizedDomains.length === 0) return null;

  const lines = getCachedRawLines(rawText);
  const mergedPairLines = lines
    .slice(0, -1)
    .filter((line, index) => {
      const next = lines[index + 1] ?? "";
      if (!next) return false;
      if (line.length > 24 || next.length > 24) return false;
      if (CONTACT_TOKEN_REGEX.test(line) || CONTACT_TOKEN_REGEX.test(next)) return false;
      if (EMAIL_REGEX.test(line) || EMAIL_REGEX.test(next)) return false;
      if (isStrongAddressLine(line) || isStrongAddressLine(next)) return false;
      if (isLikelyPersonNameLine(line) || isLikelyPersonNameLine(next)) return false;
      if (isLikelyTitleLine(line) || isLikelyTitleLine(next)) return false;
      return true;
    })
    .map((line, index) => `${line} ${lines[index + 1] ?? ""}`.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const candidateLines = uniqueStrings([...lines, ...mergedPairLines]);

  const matched = candidateLines
    .filter((line) => {
      const normalizedLine = line.toLocaleLowerCase("tr-TR");
      const compactLine = foldLocaleToken(normalizedLine).replace(/[^\p{L}\d]/gu, "");
      const directDomainMatch =
        normalizedDomains.some((domain) => normalizedLine.includes(domain)) ||
        compactDomains.some((domain) => compactLine.includes(domain));
      return (
        directDomainMatch &&
        (looksLikeCompany(line) || hasCompanyMarker(line) || compactDomains.some((domain) => compactLine.includes(domain))) &&
        !CONTACT_TOKEN_REGEX.test(line) &&
        !EMAIL_REGEX.test(line) &&
        !WEBSITE_TLD_REGEX.test(line) &&
        !/\b(?:www\.|https?:\/\/)\b/i.test(line) &&
        !isPureServiceDescriptorLine(line) &&
        !looksLikeSloganOrDecorativeLine(line)
      );
    })
    .sort((left, right) => right.length - left.length)[0];

  return matched ? sanitizeCompany(matched) : null;
}

function inferExactBrandLineFromDomain(rawText: string | undefined, domainSource: string | null | undefined): string | null {
  if (!rawText || !domainSource) return null;
  const stem = domainSource.split(".")[0]?.replace(/[-_]/g, " ").trim();
  const stemFolded = foldLocaleToken(stem ?? "").replace(/[^\p{L}\d]/gu, "");
  if (!stemFolded) return null;

  const lines = getCachedRawLines(rawText);

  const exactLine = lines.find((line) => {
    const folded = foldLocaleToken(line).replace(/[^\p{L}\d]/gu, "");
    return folded === stemFolded && !CONTACT_TOKEN_REGEX.test(line) && !EMAIL_REGEX.test(line);
  });

  return exactLine ? sanitizeCompany(exactLine) : null;
}

function lineContainsStrongIdentityNoise(value: string): boolean {
  return (
    isLikelyPersonNameLine(value) ||
    isLikelyTitleLine(value) ||
    CONTACT_TOKEN_REGEX.test(value) ||
    EMAIL_REGEX.test(value) ||
    PHONE_IN_TEXT_REGEX.test(value)
  );
}

function tokenizeCompanyForComparison(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((token) => foldLocaleToken(token).replace(/[^\p{L}\d]/gu, ""))
    .filter(Boolean)
    .filter((token) => !COMPANY_CONNECTOR_TOKENS.has(token))
    .filter((token) => !["as", "as.", "aş", "ltd", "sti", "şti", "gmbh", "ag", "ug", "llc", "co"].includes(token));
}

function shouldPreferRicherCompanyCandidate(existing: string | null, candidate: string | null): boolean {
  if (!candidate) return false;
  if (!existing) return true;

  const existingFolded = foldLocaleToken(existing).replace(/[^\p{L}\d]/gu, "");
  const candidateFolded = foldLocaleToken(candidate).replace(/[^\p{L}\d]/gu, "");
  if (!existingFolded || !candidateFolded) return false;
  if (candidateFolded === existingFolded) return false;

  if (
    (candidateFolded.includes(existingFolded) || existingFolded.includes(candidateFolded)) &&
    candidate.length >= existing.length + 3
  ) {
    return true;
  }

  const existingTokens = tokenizeCompanyForComparison(existing);
  const candidateTokens = tokenizeCompanyForComparison(candidate);
  if (existingTokens.length === 0 || candidateTokens.length === 0) return false;

  const overlap = existingTokens.filter((token) => candidateTokens.includes(token)).length;
  return overlap >= Math.max(1, Math.ceil(existingTokens.length * 0.5)) && candidateTokens.length > existingTokens.length;
}

function splitMixedAddressLine(line: string): string[] {
  const hintRegex = new RegExp(ADDRESS_HINT_REGEX.source, "i");
  const match = hintRegex.exec(line);
  if (!match || match.index === undefined || match.index < 15) {
    return [line];
  }

  const beforeHint = line.slice(0, match.index).trimEnd();
  const labeledPrefixMatch = beforeHint.match(/^(?:fabrika|merkez|şube|sube|adres)\s*:\s*(.+)$/i);
  if (labeledPrefixMatch?.[1]) {
    const rebuilt = `${labeledPrefixMatch[1].trim()} ${line.slice(match.index).trim()}`.replace(/\s+/g, " ").trim();
    return rebuilt ? [rebuilt] : [line];
  }
  const lastSpaceIdx = beforeHint.lastIndexOf(" ");
  if (lastSpaceIdx < 5) return [line];

  const prefix = beforeHint.slice(0, lastSpaceIdx).trim();
  const addressPart = line.slice(lastSpaceIdx + 1).trim();

  if (!prefix || !addressPart) return [line];
  if (
    lineContainsStrongIdentityNoise(prefix) ||
    looksLikeSloganOrDecorativeLine(prefix) ||
    isPureServiceDescriptorLine(prefix) ||
    hasCompanyMarker(prefix)
  ) {
    return [addressPart];
  }
  return [prefix, addressPart];
}

function containsKnownLocation(line: string): boolean {
  const lower = line.toLocaleLowerCase("tr-TR");
  const words = lower.split(/[\s,/\-–.]+/).filter(Boolean);
  for (const word of words) {
    if (SAFE_PROVINCES.has(word)) return true;
    if (KNOWN_DISTRICTS.has(word)) return true;
  }
  return false;
}

function countKnownLocationTokens(line: string): number {
  const lower = line.toLocaleLowerCase("tr-TR");
  const words = lower.split(/[\s,/\-–.]+/).filter(Boolean);
  let count = 0;
  for (const word of words) {
    if (SAFE_PROVINCES.has(word) || KNOWN_DISTRICTS.has(word)) {
      count += 1;
    }
  }
  return count;
}

function isSuspiciousAddressLikeLine(line: string): boolean {
  const hasConcreteAddressSignal =
    ADDRESS_HINT_REGEX.test(line) ||
    ADDRESS_NO_REGEX.test(line) ||
    POSTAL_CODE_REGEX.test(line);

  if (looksLikeSloganOrDecorativeLine(line)) return true;
  if (isPureServiceDescriptorLine(line) && !hasConcreteAddressSignal) return true;
  if (!hasConcreteAddressSignal && countKnownLocationTokens(line) >= 3) return true;
  if (
    !hasConcreteAddressSignal &&
    lineContainsLexiconToken(line, BUSINESS_CARD_INDUSTRY_KEYWORDS) &&
    !containsKnownLocation(line)
  ) {
    return true;
  }
  return false;
}

function isStrongAddressLine(line: string): boolean {
  if (PHONE_IN_TEXT_REGEX.test(line)) return false;
  if (isSuspiciousAddressLikeLine(line)) return false;
  if (ADDRESS_HINT_REGEX.test(line)) return true;
  if (ADDRESS_NO_REGEX.test(line)) return true;
  if (POSTAL_CODE_REGEX.test(line) && /[\p{L}]{2,}/u.test(line)) return true;
  if (containsKnownLocation(line)) return true;
  return false;
}

function stripCountrySuffix(line: string): string {
  return line.replace(COUNTRY_SUFFIX_REGEX, "").trim();
}

function extractProvinceDistrict(text: string): { district: string | null; province: string | null } {
  const match = text.match(/([\p{L}]+)\s*[/\-–]\s*([\p{L}]+)/u);
  if (!match) return { district: null, province: null };

  const left = match[1]!.trim();
  const right = match[2]!.trim();

  if (SAFE_PROVINCES.has(right.toLocaleLowerCase("tr-TR"))) {
    return { district: left, province: right };
  }
  if (SAFE_PROVINCES.has(left.toLocaleLowerCase("tr-TR"))) {
    return { district: null, province: left };
  }
  return { district: null, province: null };
}

function normalizeAddressParts(raw: z.infer<typeof AddressPartsSchema> | undefined): AddressParts {
  if (!raw) return { ...EMPTY_ADDRESS_PARTS };

  return {
    neighborhood: normalizeNullable(raw.neighborhood),
    street: normalizeNullable(raw.street),
    avenue: normalizeNullable(raw.avenue),
    boulevard: normalizeNullable(raw.boulevard),
    sitePlaza: normalizeNullable(raw.sitePlaza),
    block: normalizeNullable(raw.block),
    buildingNo: normalizeNullable(raw.buildingNo),
    floor: normalizeNullable(raw.floor),
    apartment: normalizeNullable(raw.apartment),
    postalCode: validatePostalCode(normalizeNullable(raw.postalCode)),
    district: normalizeNullable(raw.district),
    province: validateProvince(normalizeNullable(raw.province)),
    country: normalizeNullable(raw.country),
  };
}

function validatePostalCode(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (/^\d{4,6}$/.test(digits)) return digits;
  return null;
}

function validateProvince(value: string | null): string | null {
  if (!value) return null;
  if (SAFE_PROVINCES.has(value.toLocaleLowerCase("tr-TR"))) return value;
  return value;
}

function assembleAddressFromParts(parts: AddressParts): string | null {
  const segments: string[] = [];

  if (parts.neighborhood) segments.push(parts.neighborhood);
  if (parts.avenue) segments.push(parts.avenue);
  if (parts.street) segments.push(parts.street);
  if (parts.boulevard) segments.push(parts.boulevard);
  if (parts.sitePlaza) segments.push(parts.sitePlaza);
  if (parts.block) segments.push(parts.block);
  if (parts.buildingNo) segments.push(parts.buildingNo);
  if (parts.floor) segments.push(parts.floor);
  if (parts.apartment) segments.push(parts.apartment);
  if (parts.postalCode) segments.push(parts.postalCode);

  if (parts.district && parts.province) {
    segments.push(`${parts.district}/${parts.province}`);
  } else if (parts.province) {
    segments.push(parts.province);
  } else if (parts.district) {
    segments.push(parts.district);
  }

  if (parts.country && !/^(türkiye|turkey|turkiye|tr)$/i.test(parts.country)) {
    segments.push(parts.country);
  }

  if (segments.length === 0) return null;

  return segments
    .join(", ")
    .replace(/\b(mahallesi|mahalle|mah\.?|mh\.?)\b/gi, "Mah.")
    .replace(/\b(caddesi|cadde|cad\.?)\b/gi, "Cad.")
    .replace(/\b(sokağı|sokak|sok\.?|sk\.?)\b/gi, "Sk.")
    .replace(/\s+/g, " ")
    .trim();
}

function enrichAddressPartsFromText(parts: AddressParts, addressText: string | null): AddressParts {
  if (!addressText) return parts;

  const enriched = { ...parts };

  if (!enriched.postalCode) {
    const postalMatch = addressText.match(/\b(\d{5})\b/);
    if (postalMatch) enriched.postalCode = postalMatch[1]!;
  }

  if (!enriched.province || !enriched.district) {
    const pd = extractProvinceDistrict(addressText);
    if (pd.province && !enriched.province) enriched.province = pd.province;
    if (pd.district && !enriched.district) enriched.district = pd.district;
  }

  return enriched;
}

function enrichAddressPartsByLocale(parts: AddressParts, addressText: string | null): AddressParts {
  if (!addressText) return parts;

  const enriched = { ...parts };
  const normalizedAddress = addressText.replace(/\s+/g, " ").trim();
  const locale = detectBusinessCardLanguageProfile(normalizedAddress).suggestedLocale;

  const assignIfMissing = (key: keyof AddressParts, value: string | null | undefined): void => {
    if (!value || enriched[key]) return;
    enriched[key] = value.trim();
  };

  if (locale === "tr") {
    assignIfMissing("neighborhood", normalizedAddress.match(/\b([\p{L}\s]+?)\s+Mah\.?/iu)?.[1]);
    assignIfMissing("avenue", normalizedAddress.match(/\b([\p{L}\s]+?)\s+Cad\.?/iu)?.[1]);
    assignIfMissing("street", normalizedAddress.match(/\b([\p{L}\s0-9-]+?)\s+(?:Sk\.?|Sok(?:ak)?\.?)/iu)?.[1]);
    assignIfMissing("boulevard", normalizedAddress.match(/\b([\p{L}\s]+?)\s+Bulv\.?/iu)?.[1]);
    assignIfMissing("sitePlaza", normalizedAddress.match(/\b((?:[\p{L}\d.\s-]+?)\s+(?:Site|Plaza|İş Merkezi|İş Mrk\.?|Business Park|OSB|Organize Sanayi Bölgesi|San\.?\s*Sit\.?))\b/iu)?.[1]);
    assignIfMissing("block", normalizedAddress.match(/\b(([A-Z0-9-]+)\s+Blok)\b/iu)?.[1]);
    assignIfMissing("buildingNo", normalizedAddress.match(/\bNo\s*[:.]?\s*([A-Z0-9/-]+)/iu)?.[1]);
    assignIfMissing("floor", normalizedAddress.match(/\bKat\s*[:.]?\s*([A-Z0-9-]+)/iu)?.[1]);
    assignIfMissing("apartment", normalizedAddress.match(/\b(?:Daire|D:)\s*[:.]?\s*([A-Z0-9-]+)/iu)?.[1]);
    assignIfMissing("apartment", normalizedAddress.match(/\bApt\.?\s*[:.]?\s*([A-Z0-9-]+)/iu)?.[1]);
    if (!enriched.sitePlaza) {
      const siteMatch = normalizedAddress.match(/\b((?:[\p{L}\d.\s-]+?)\s+(?:San\.?\s*Sit\.?|OSB|Organize Sanayi Bölgesi))\b/iu)?.[1];
      if (siteMatch) enriched.sitePlaza = siteMatch.trim();
    }
    if (!enriched.street) {
      const roadLike = normalizedAddress.match(/\b(\d+\.\s*Yol\s+Sk\.?)\b/iu)?.[1];
      if (roadLike) enriched.street = roadLike.trim();
    }
  } else {
    assignIfMissing("street", normalizedAddress.match(/\b([\p{L}\s0-9.'-]+?)\s+(?:Street|St\.?|Road|Rd\.?|Weg|Gasse|Straße|Strasse|Str\.?)\b/iu)?.[1]);
    assignIfMissing("buildingNo", normalizedAddress.match(/\b(?:No|Nr\.?)\s*[:.]?\s*([A-Z0-9/-]+)/iu)?.[1]);
    assignIfMissing("floor", normalizedAddress.match(/\b(?:Floor|Fl\.?)\s*[:.]?\s*([A-Z0-9-]+)/iu)?.[1]);
    assignIfMissing("apartment", normalizedAddress.match(/\b(?:Suite|Ste\.?|Unit)\s*[:.]?\s*([A-Z0-9-]+)/iu)?.[1]);
  }

  const commaSegments = normalizedAddress.split(",").map((segment) => segment.trim()).filter(Boolean);
  if (!enriched.country) {
    const countrySegment = commaSegments.find((segment) => /^(?:türkiye|turkey|turkiye|espana|españa|spain|germany|deutschland|russia|россия|kosovo|albania|china|çin)$/i.test(segment));
    if (countrySegment) enriched.country = countrySegment;
  }

  if (!enriched.province || !enriched.district) {
    const slashMatch = normalizedAddress.match(/([\p{L}\s]+)\s*[/\-–]\s*([\p{L}\s]+)$/u);
    if (slashMatch) {
      const left = slashMatch[1]?.trim() ?? null;
      const right = slashMatch[2]?.trim() ?? null;
      if (!enriched.district && left) enriched.district = left;
      if (!enriched.province && right) enriched.province = right;
    }
  }

  if (!enriched.district || !enriched.province) {
    const commaSegments = normalizedAddress
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const locationSegment = commaSegments.reverse().find((segment) => /[/\-–]/.test(segment));
    if (locationSegment) {
      const parsed = extractProvinceDistrict(locationSegment);
      if (!enriched.district && parsed.district) enriched.district = parsed.district;
      if (!enriched.province && parsed.province) enriched.province = parsed.province;
    }
  }

  return enriched;
}

export function sanitizeAddress(address: string | null): string | null {
  if (!address) return null;

  const rawLines = address
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const expandedLines: string[] = [];
  for (const line of rawLines) {
    if (line.length > 60 && isStrongAddressLine(line)) {
      expandedLines.push(...splitMixedAddressLine(line));
    } else {
      expandedLines.push(line);
    }
  }

  const kept: string[] = [];
  for (const line of expandedLines) {
    if (COUNTRY_LINE_REGEX.test(line)) continue;
    if (isStrongAddressLine(line) && ADDRESS_EXCLUDE_REGEX.test(line)) {
      const stripped = stripContactFragments(line);
      if (stripped && isStrongAddressLine(stripped)) {
        kept.push(stripCountrySuffix(stripped));
      }
      continue;
    }
    if (ADDRESS_EXCLUDE_REGEX.test(line)) {
      const stripped = stripContactFragments(line);
      if (stripped && isStrongAddressLine(stripped)) {
        kept.push(stripCountrySuffix(stripped));
      }
      continue;
    }
    kept.push(stripCountrySuffix(line));
  }
  if (kept.length === 0) return null;

  const filtered = kept.filter((line) => isStrongAddressLine(line));
  if (filtered.length === 0) return null;

  const merged = filtered.join(", ");
  const normalized = merged
    .replace(/\b(mahallesi|mahalle|mah\.?|mh\.?)\b/gi, "Mah.")
    .replace(/\b(caddesi|cadde|cad\.?)\b/gi, "Cad.")
    .replace(/\b(sokağı|sokak|sok\.?|sk\.?)\b/gi, "Sk.")
    .replace(/\b[\p{L}]+\s+Grup\b/gu, "")
    .replace(COUNTRY_SUFFIX_REGEX, "")
    .replace(/\b(?:phone|gsm|tel\.?|telefon|mobile|mob\.?|cell|office|direct|fax|faks)\s*:?\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;
  const safeSegments = uniqueStrings(
    normalized
      .split(",")
      .map((segment) =>
        segment
          .replace(/\b(?:phone|gsm|tel\.?|telefon|mobile|mob\.?|cell|office|direct|fax|faks)\s*:?\s*$/gi, "")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(Boolean)
      .filter((segment) => !COUNTRY_LINE_REGEX.test(segment))
      .filter((segment) => !ADDRESS_EXCLUDE_REGEX.test(segment))
      .filter((segment) => !PHONE_IN_TEXT_REGEX.test(segment))
  );
  if (safeSegments.length === 0) return null;
  if (!safeSegments.some((segment) => isStrongAddressLine(segment))) return null;
  return safeSegments.join(", ");
}

function normalizeTextLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function collectAddressSourceLines(
  rawText: string | undefined,
  rawLines: string[] | undefined,
  preferredAddressLines: string[] | undefined
): string[] {
  const lines: string[] = [];
  if (preferredAddressLines && preferredAddressLines.length > 0) {
    lines.push(...preferredAddressLines.map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean));
  }
  if (rawLines && rawLines.length > 0) {
    lines.push(...rawLines.map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean));
  } else if (rawText) {
    lines.push(...normalizeTextLines(rawText));
  }
  return uniqueStrings(lines);
}

function buildAddressFromRawText(
  rawText: string | undefined,
  notes: string[],
  rawLines?: string[],
  preferredAddressLines?: string[]
): string | null {
  const lines = collectAddressSourceLines(rawText, rawLines, preferredAddressLines);
  if (lines.length === 0) return null;

  const addressLines: string[] = [];
  for (const line of lines) {
    if (COUNTRY_LINE_REGEX.test(line)) continue;
    if (ADDRESS_EXCLUDE_REGEX.test(line)) {
      const stripped = stripContactFragments(line);
      if (stripped && isStrongAddressLine(stripped)) {
        addressLines.push(stripCountrySuffix(stripped));
      }
      continue;
    }
    if (isStrongAddressLine(line)) {
      addressLines.push(stripCountrySuffix(line));
    }
  }

  if (addressLines.length === 0) return null;
  return sanitizeAddress(addressLines.join("\n"));
}

export function sanitizePhones(phones: string[]): string[] {
  return normalizePhones(phones, []);
}

function hasCompanyMarker(value: string): boolean {
  return lineContainsLexiconToken(value, BUSINESS_CARD_COMPANY_MARKERS);
}

function looksLikeCompany(value: string): boolean {
  const lower = value.toLocaleLowerCase("tr-TR");
  if (/\bgrup\b/.test(lower)) return true;
  if (/\bprof[ıi]l\b/.test(lower)) return true;
  if (hasCompanyMarker(value)) return true;
  if (lineContainsLexiconToken(value, BUSINESS_CARD_INDUSTRY_KEYWORDS)) return true;
  return false;
}

function looksLikeSloganOrDecorativeLine(value: string): boolean {
  if (SLOGAN_NOISE_REGEX.test(value)) return true;
  const lower = value.toLocaleLowerCase("tr-TR");
  if (/\bmember of\b/.test(lower)) return true;
  if (/\bofficial dealer\b/.test(lower)) return true;
  if (/\beverything simple\b/.test(lower)) return true;
  if (/\bkap[ıi]\s+ve\s+pencere\s+aksesuarlar[ıi]\b/.test(lower)) return true;
  return false;
}

function isPureServiceDescriptorLine(value: string): boolean {
  const tokens = value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\s/-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0 || tokens.length > 4) return false;
  const meaningful = tokens.filter((token) => !SERVICE_CONNECTOR_TOKENS.has(token));
  if (meaningful.length === 0) return false;
  return meaningful.every((token) => lineContainsLexiconToken(token, BUSINESS_CARD_INDUSTRY_KEYWORDS));
}

function sanitizeName(value: string | null): string | null {
  if (!value) return null;
  if (looksLikeCompany(value)) return null;
  if (looksLikeSloganOrDecorativeLine(value)) return null;
  if (CONTACT_TOKEN_REGEX.test(value)) return null;
  if (ADDRESS_HINT_REGEX.test(value)) return null;
  if (ADDRESS_NO_REGEX.test(value)) return null;
  if (containsKnownLocation(value) && /\d/.test(value)) return null;
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  if (tokens.some((token) => lineContainsLexiconToken(token, BUSINESS_CARD_INDUSTRY_KEYWORDS))) return null;
  const hasExplicitTurkishSignal = /[çğıöşüÇĞİÖŞÜ]/u.test(value);
  const locale = hasExplicitTurkishSignal ? "tr" : detectBusinessCardLanguageProfileCached(value).suggestedLocale;
  const casingLocale = locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : locale === "ru" ? "ru-RU" : "en-US";
  return value
    .split(/\s+/)
    .map((token) => {
      if (/^[A-ZÇĞİIÖŞÜА-ЯЁ]+$/u.test(token) && token.length > 1) {
        return token.charAt(0) + token.slice(1).toLocaleLowerCase(casingLocale);
      }
      return token;
    })
    .join(" ");
}

function sanitizeTitle(value: string | null): string | null {
  if (!value) return null;
  if (looksLikeSloganOrDecorativeLine(value)) return null;
  if (
    hasCompanyMarker(value) &&
    !lineContainsLexiconToken(value, BUSINESS_CARD_TITLE_KEYWORDS)
  ) {
    return null;
  }
  if (CONTACT_TOKEN_REGEX.test(value)) return null;
  if (ADDRESS_HINT_REGEX.test(value)) return null;
  return value;
}

function sanitizeCompany(value: string | null): string | null {
  if (!value) return null;
  if (/@|www\.|https?:\/\//i.test(value)) return null;
  if (WEBSITE_TLD_REGEX.test(value) && !/\s/.test(value.trim())) return null;
  if (CONTACT_TOKEN_REGEX.test(value)) return null;
  if (PHONE_IN_TEXT_REGEX.test(value)) return null;
  if (looksLikeSloganOrDecorativeLine(value)) return null;
  if (isPureServiceDescriptorLine(value)) return null;
  if (value.replace(/[^\d]/g, "").length >= 5) return null;
  const normalized = normalizeCompanySuffix(value);
  if (!normalized) return normalized;
  const normalizedTokens = normalized.split(/\s+/).filter(Boolean);
  const hasRussianLegalEntityPrefix = /^(?:ООО|ЗАО|ОАО)\b/u.test(normalized);
  if (hasRussianLegalEntityPrefix && normalizedTokens.length > 1) {
    return normalized.replace(/\s+/g, " ").trim();
  }
  const trailingPersonMatch = normalized.match(
    /^(.*?(?:A\.?Ş\.?|LTD\.?\s*(?:ŞTİ\.?|ŞTI\.?)|LTD\.?|ŞTİ\.?|ŞTI\.?|GMBH|AG|UG|LLC|L\.L\.C\.|INC\.?|CO\.?\s*LTD\.?|ООО|ЗАО|ОАО))\s+(.+)$/iu
  );
  if (trailingPersonMatch?.[2] && !hasRussianLegalEntityPrefix) {
    const trailing = sanitizeName(trailingPersonMatch[2].trim());
    if (trailing) {
      return trailingPersonMatch[1].replace(/\s+/g, " ").trim();
    }
  }
  const legalEntityBoundary = normalized.match(
    /^(.*?(?:A\.?Ş\.?|LTD\.?\s*(?:ŞTİ\.?|ŞTI\.?)|LTD\.?|ŞTİ\.?|ŞTI\.?|GMBH|AG|UG|LLC|L\.L\.C\.|INC\.?|CO\.?\s*LTD\.?|ООО|ЗАО|ОАО))/iu
  );
  if (legalEntityBoundary && legalEntityBoundary[1] && !hasRussianLegalEntityPrefix && normalizedTokens.length <= 3) {
    return legalEntityBoundary[1].replace(/\s+/g, " ").trim();
  }
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 2 && /^[A-ZÇĞİIÖŞÜА-ЯЁ]{1,2}$/u.test(tokens[0] ?? "") && /^[A-ZÇĞİIÖŞÜА-ЯЁ]{3,}$/u.test(tokens[1] ?? "")) {
    return normalized;
  }
  if (tokens.length > 1 && uppercaseRatio(normalized) >= 0.9) {
    const locale = detectBusinessCardLanguageProfile(normalized).suggestedLocale;
    const casingLocale = locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : locale === "ru" ? "ru-RU" : "en-US";
    return tokens
      .map((token) => {
        if (/^[A-ZÇĞİIÖŞÜА-ЯЁ]{1,4}$/u.test(token) && !/[AEIİOÖUÜАЕЁИОУЫЭЮЯ]/u.test(token)) {
          return token;
        }
        return token.charAt(0) + token.slice(1).toLocaleLowerCase(casingLocale);
      })
      .join(" ");
  }
  return normalized
    .split(/\s+/)
    .map((token, index) => {
      if (index > 0 && COMPANY_CONNECTOR_TOKENS.has(token.toLocaleLowerCase("tr-TR"))) {
        return token.toLocaleLowerCase("tr-TR");
      }
      if (index === 0 && /^[A-ZÇĞİIÖŞÜА-ЯЁ]{2,4}$/u.test(token)) {
        return token;
      }
      if (/^[a-zçğıöşüа-яё]{2,}$/u.test(token)) {
        return token.charAt(0).toLocaleUpperCase("tr-TR") + token.slice(1);
      }
      return token;
    })
    .join(" ");
}

function beautifyCompanyWithRawContext(company: string | null, rawText?: string): string | null {
  if (!company || !rawText) return company;
  const locale = detectBusinessCardLanguageProfileCached(rawText).suggestedLocale;
  const casingLocale = locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : locale === "ru" ? "ru-RU" : "en-US";
  const rawTokens = rawText.match(/[\p{L}]+/gu) ?? [];
  const preferredByFold = new Map<string, string>();

  for (const rawToken of rawTokens) {
    const fold = foldLocaleToken(rawToken);
    const existing = preferredByFold.get(fold);
    const isBetterCandidate =
      !existing ||
      /[çğıöşüÇĞİIÖŞÜёЁ]/u.test(rawToken) ||
      (/^\p{Lu}/u.test(rawToken) && /^\p{Ll}/u.test(existing));
    if (isBetterCandidate) {
      preferredByFold.set(fold, rawToken);
    }
  }

  return company
    .split(/\s+/)
    .map((token) => {
      const cleanToken = token.replace(/[^\p{L}]/gu, "");
      if (!cleanToken || /[çğıöşüÇĞİIÖŞÜёЁ]/u.test(token)) return token;
      if (/^(?:GmbH|LLC|L\.L\.C\.|A\.Ş\.|Ltd\.|Şti\.|Co\.)$/i.test(token)) {
        return normalizeCompanySuffix(token) ?? token;
      }
      const preferred = preferredByFold.get(foldLocaleToken(cleanToken));
      if (!preferred || preferred === cleanToken) return token;
      const replacement =
        token === token.toLocaleUpperCase(casingLocale)
          ? preferred.toLocaleUpperCase(casingLocale)
          : preferred.charAt(0) + preferred.slice(1).toLocaleLowerCase(casingLocale);
      return token.replace(cleanToken, replacement);
    })
    .join(" ")
    .replace(/L\.L\.C\.\.+/g, "L.L.C.");
}

function normalizeCompanyConnectors(value: string | null): string | null {
  if (!value) return value;
  return value
    .split(/\s+/)
    .map((token, index) => {
      if (index > 0 && COMPANY_CONNECTOR_TOKENS.has(token.toLocaleLowerCase("tr-TR"))) {
        return token.toLocaleLowerCase("tr-TR");
      }
      return token;
    })
    .join(" ");
}

function isWeakCompanyCandidate(value: string | null): boolean {
  if (!value) return true;
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && value.length <= 4) return true;
  if (looksLikeSloganOrDecorativeLine(value)) return true;
  if (isPureServiceDescriptorLine(value)) return true;
  return false;
}

function isGenericIndustryOnlyCompany(value: string | null, brandStemFolded: string): boolean {
  if (!value) return false;
  if (hasCompanyMarker(value)) return false;
  const folded = foldLocaleToken(value).replace(/[^\p{L}\d]/gu, "");
  if (brandStemFolded && folded.includes(brandStemFolded)) return false;

  const tokens = value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\s/-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0 || tokens.length > 4) return false;

  const meaningful = tokens.filter((token) => !SERVICE_CONNECTOR_TOKENS.has(token));
  if (meaningful.length === 0) return false;

  const industryHits = meaningful.filter((token) => lineContainsLexiconToken(token, BUSINESS_CARD_INDUSTRY_KEYWORDS)).length;
  return industryHits === meaningful.length;
}

function rescuePersonNearTitleFromRawLines(
  rawLines: string[],
  title: string | null,
  customerName: string | null
): string | null {
  if (!title || rawLines.length === 0) return null;
  const normalizedTitle = foldLocaleToken(title).replace(/[^\p{L}\d]/gu, "");
  if (!normalizedTitle) return null;

  const titleIndex = rawLines.findIndex(
    (line) => {
      const normalizedLine = foldLocaleToken(sanitizeTitle(line) ?? line).replace(/[^\p{L}\d]/gu, "");
      return (
        normalizedLine === normalizedTitle ||
        normalizedLine.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedLine)
      );
    }
  );
  if (titleIndex < 0) return null;

  const nearby = rawLines
    .map((line, index) => ({ line, index, distance: Math.abs(index - titleIndex) }))
    .filter((item) => item.index !== titleIndex && item.distance > 0 && item.distance <= 2)
    .sort((left, right) => left.distance - right.distance || left.index - right.index)
    .map((item) => item.line);

  const strong = nearby.find((line) => {
    if (customerName && foldLocaleToken(line) === foldLocaleToken(customerName)) return false;
    if (isIdentityNoiseLine(line) || looksLikeCompany(line) || hasTitleKeyword(line)) return false;
    return isLikelyPersonNameLine(line);
  });
  if (strong) return sanitizeName(strong);

  const nearbyWithIndex = rawLines
    .map((line, index) => ({ line, index }))
    .filter((item) => item.index !== titleIndex && Math.abs(item.index - titleIndex) <= 3)
    .sort((left, right) => left.index - right.index);

  for (let i = 0; i < nearbyWithIndex.length - 1; i += 1) {
    const current = nearbyWithIndex[i];
    const next = nearbyWithIndex[i + 1];
    if (!current || !next || next.index !== current.index + 1) continue;

    const merged = `${current.line} ${next.line}`.replace(/\s+/g, " ").trim();
    if (!merged) continue;
    if (customerName && foldLocaleToken(merged) === foldLocaleToken(customerName)) continue;
    if (isIdentityNoiseLine(merged) || looksLikeCompany(merged) || hasTitleKeyword(merged)) continue;
    const mergedTokens = merged.split(/\s+/).filter(Boolean);
    const mergedName =
      sanitizeName(merged) ??
      (mergedTokens.length === 2 && mergedTokens.every((token) => /^[\p{L}.'-]+$/u.test(token)) ? merged : null);
    if (mergedName) {
      return mergedName;
    }
  }

  const fallback = nearby.find((line) => {
    if (customerName && foldLocaleToken(line) === foldLocaleToken(customerName)) return false;
    if (isIdentityNoiseLine(line) || looksLikeCompany(line) || hasTitleKeyword(line)) return false;
    const tokens = line.split(/\s+/).filter(Boolean);
    return tokens.length >= 2 && tokens.length <= 4 && tokens.every((token) => /^[\p{L}.'-]+$/u.test(token));
  });

  return fallback ? sanitizeName(fallback) : null;
}

function collectIdentitySourceLines(rawText?: string, rawLines?: string[]): string[] {
  const source = rawLines && rawLines.length > 0 ? rawLines : getCachedRawLines(rawText);
  return uniqueStrings(
    source
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length >= 2 && line.length <= 120)
      .filter((line) => LETTER_CHAR_REGEX.test(line))
  );
}

function uppercaseRatio(value: string): number {
  const letters = value.match(LETTER_GLOBAL_REGEX) ?? [];
  if (letters.length === 0) return 0;
  const upper = value.match(UPPER_LETTER_GLOBAL_REGEX) ?? [];
  return upper.length / letters.length;
}

function isIdentityNoiseLine(line: string): boolean {
  if (looksLikeSloganOrDecorativeLine(line)) return true;
  if (CONTACT_TOKEN_REGEX.test(line)) return true;
  if (EMAIL_REGEX.test(line)) return true;
  if (PHONE_IN_TEXT_REGEX.test(line)) return true;
  if (ADDRESS_HINT_REGEX.test(line)) return true;
  if (ADDRESS_NO_REGEX.test(line)) return true;
  if (POSTAL_CODE_REGEX.test(line)) return true;
  if (containsKnownLocation(line)) return true;
  if (/\d/.test(line)) return true;
  return false;
}

function hasTitleKeyword(line: string): boolean {
  return lineContainsLexiconToken(line, BUSINESS_CARD_TITLE_KEYWORDS);
}

function isLikelyTitleLine(line: string): boolean {
  if (line.length > 90) return false;
  if (!hasTitleKeyword(line)) return false;
  if (CONTACT_TOKEN_REGEX.test(line)) return false;
  if (EMAIL_REGEX.test(line)) return false;
  if (PHONE_IN_TEXT_REGEX.test(line)) return false;
  return true;
}

function isLikelyPersonNameLine(line: string): boolean {
  if (isIdentityNoiseLine(line)) return false;
  if (looksLikeSloganOrDecorativeLine(line)) return false;
  if (looksLikeCompany(line)) return false;
  if (isLikelyTitleLine(line)) return false;

  const clean = line.replace(/[^\p{L}\s'.-]/gu, " ");
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  if (!tokens.every((token) => PERSON_TOKEN_REGEX.test(token))) return false;
  const hasLower = /\p{Ll}/u.test(clean);
  const allUpperLike = uppercaseRatio(clean) >= 0.9 && tokens.length === 2;
  if (!hasLower && !allUpperLike) return false;

  const properTokenCount = tokens.filter((token) => {
    const first = token[0];
    if (!first) return false;
    return first === first.toUpperCase();
  }).length;

  return properTokenCount >= 2;
}

function isLikelyCompanyLine(line: string, index: number): boolean {
  if (isIdentityNoiseLine(line)) return false;
  if (isLikelyTitleLine(line)) return false;
  if (isLikelyPersonNameLine(line)) return false;
  if (looksLikeCompany(line)) return true;

  const tokens = line.split(/\s+/).filter(Boolean);
  const ratio = uppercaseRatio(line);

  if (index <= 1 && tokens.length === 1 && /^[\p{L}]{2,12}$/u.test(line.trim())) return true;
  if (ratio >= 0.72 && tokens.length <= 6) return true;
  if (index <= 2 && tokens.length <= 2 && /\p{Lu}/u.test(line)) return true;
  return false;
}

type ScoredIdentityCandidate = {
  line: string;
  score: number;
  index: number;
};

type BusinessCardNormalizationHints = {
  preferredNameLines?: string[];
  preferredTitleLines?: string[];
  preferredCompanyLines?: string[];
  recognizedLanguages?: string[];
};

type BusinessCardNormalizationOptions = {
  mode?: "full" | "light";
};

function scoreNameCandidate(line: string, index: number, hints?: BusinessCardNormalizationHints): number {
  if (!isLikelyPersonNameLine(line)) return -1;
  let score = 4;
  const locale = detectBusinessCardLanguageProfileCached(line).suggestedLocale;
  const recognizedLanguages = hints?.recognizedLanguages ?? [];
  if (index >= 1 && index <= 5) score += 2;
  if (uppercaseRatio(line) >= 0.85) score += 1;
  if (locale === "tr" || locale === "de" || locale === "en") score += 1;
  if (recognizedLanguages.some((language) => /^(tr|en|de)$/i.test(language))) score += 1;
  if (hints?.preferredNameLines?.includes(line)) score += 3;
  return score;
}

function scoreTitleCandidate(line: string, index: number, nameIndex: number, hints?: BusinessCardNormalizationHints): number {
  if (!isLikelyTitleLine(line)) return -1;
  let score = 4;
  const locale = detectBusinessCardLanguageProfileCached(line).suggestedLocale;
  const recognizedLanguages = hints?.recognizedLanguages ?? [];
  if (nameIndex >= 0 && Math.abs(index - nameIndex) <= 2) score += 2;
  if (index <= 6) score += 1;
  if (locale === "tr" || locale === "de" || locale === "en" || locale === "ru") score += 1;
  if (recognizedLanguages.some((language) => /^(tr|en|de|ru)$/i.test(language))) score += 1;
  if (hints?.preferredTitleLines?.includes(line)) score += 2;
  return score;
}

function scoreCompanyCandidate(line: string, index: number, nameIndex: number, hints?: BusinessCardNormalizationHints): number {
  if (!isLikelyCompanyLine(line, index)) return -1;
  let score = 4;
  const locale = detectBusinessCardLanguageProfileCached(line).suggestedLocale;
  const recognizedLanguages = hints?.recognizedLanguages ?? [];
  if (index <= 2) score += 2;
  if (nameIndex > 0 && index < nameIndex) score += 1;
  if (hasCompanyMarker(line)) score += 1;
  if (locale === "tr" || locale === "de" || locale === "en") score += 1;
  if (recognizedLanguages.some((language) => /^(tr|en|de)$/i.test(language))) score += 1;
  if (hints?.preferredCompanyLines?.includes(line)) score += 3;
  return score;
}

function pickBestCandidate(candidates: ScoredIdentityCandidate[]): string | null {
  if (candidates.length === 0) return null;
  return candidates
    .sort((a, b) => b.score - a.score || a.index - b.index || a.line.length - b.line.length)[0]?.line ?? null;
}

function pickBestSanitizedCandidate(
  candidates: ScoredIdentityCandidate[],
  sanitizer: (value: string | null) => string | null,
): string | null {
  const sorted = [...candidates].sort((a, b) => b.score - a.score || a.index - b.index || a.line.length - b.line.length);
  for (const candidate of sorted) {
    const sanitized = sanitizer(candidate.line);
    if (sanitized) return sanitized;
  }
  return null;
}

function mergeCompanyLines(lines: string[], startIndex: number): string {
  const base = lines[startIndex];
  if (!base) return "";

  const previous = lines[startIndex - 1];
  const next = lines[startIndex + 1];
  const segments = [base];

  if (
    previous &&
    startIndex <= 2 &&
    !isLikelyPersonNameLine(previous) &&
    !isLikelyTitleLine(previous) &&
    !isIdentityNoiseLine(previous) &&
    /^[\p{L}\s&.-]{2,24}$/u.test(previous) &&
    !hasCompanyMarker(previous)
  ) {
    segments.unshift(previous);
  }

  if (next && !isLikelyPersonNameLine(next) && !isLikelyTitleLine(next) && !isIdentityNoiseLine(next) && hasCompanyMarker(next)) {
    segments.push(next);
  }

  return segments.join(" ").replace(/\s+/g, " ").trim();
}

function inferIdentityFromRawText(
  rawText?: string,
  rawLines?: string[],
  hints?: BusinessCardNormalizationHints
): { inferredName: string | null; inferredTitle: string | null; inferredCompany: string | null } {
  const lines = collectIdentitySourceLines(rawText, rawLines);
  if (lines.length === 0) {
    return { inferredName: null, inferredTitle: null, inferredCompany: null };
  }

  let inferredName: string | null = null;
  let nameIndex = -1;
  const nameCandidates: ScoredIdentityCandidate[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const normalized = line.replace(/[^\p{L}\s'.-]/gu, " ").trim();
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const isAllUpperCandidate = uppercaseRatio(normalized) >= 0.9 && tokens.length === 2;
    const score = scoreNameCandidate(line, i, hints);
    if (score < 0) continue;
    if (isAllUpperCandidate) {
      const hasNearbyTitle = [i + 1, i + 2].some(
        (idx) => idx < lines.length && isLikelyTitleLine(lines[idx]!)
      );
      if (!hasNearbyTitle) continue;
    }
    nameCandidates.push({ line, score, index: i });
  }
  inferredName = pickBestSanitizedCandidate(nameCandidates, (value) => sanitizeName(normalizeNullable(value)));
  if (inferredName) {
    nameIndex = lines.findIndex((line) => line === inferredName);
  }

  let inferredTitle: string | null = null;
  const titleCandidates: ScoredIdentityCandidate[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const score = scoreTitleCandidate(line, i, nameIndex, hints);
    if (score < 0) continue;
    if (nameIndex >= 0 && Math.abs(i - nameIndex) > 3) continue;
    titleCandidates.push({ line, score, index: i });
  }
  inferredTitle = pickBestSanitizedCandidate(titleCandidates, (value) => sanitizeTitle(normalizeNullable(value)));
  if (!inferredName && inferredTitle) {
    const titleIndex = lines.findIndex((line) => line === inferredTitle);
    if (titleIndex > 0) {
      for (let i = Math.max(0, titleIndex - 2); i < titleIndex; i += 1) {
        const candidate = sanitizeName(lines[i] ?? null);
        if (candidate) {
          inferredName = candidate;
          nameIndex = i;
          break;
        }
      }
    }
  }

  let inferredCompany: string | null = null;
  const companyCandidates: ScoredIdentityCandidate[] = [];
  const companySearchLimit = Math.min(lines.length, Math.max(6, nameIndex > 0 ? nameIndex + 1 : 6));
  for (let i = 0; i < companySearchLimit; i += 1) {
    const line = lines[i]!;
    const score = scoreCompanyCandidate(line, i, nameIndex, hints);
    if (score < 0) continue;
    companyCandidates.push({ line: mergeCompanyLines(lines, i), score, index: i });
  }
  inferredCompany = pickBestSanitizedCandidate(companyCandidates, (value) => sanitizeCompany(normalizeNullable(value)));

  return {
    inferredName,
    inferredTitle,
    inferredCompany,
  };
}

function normalizeSocialHandle(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, "").trim();
  return cleaned.length ? cleaned : null;
}

function logBusinessCardNormalizationDebug(payload: {
  assembledAddress: string | null;
  sanitizedLlmAddress: string | null;
  fallbackAddress: string | null;
  finalAddress: string | null;
  preferredAddressLines?: string[];
  rawName: string | null;
  rawCompany: string | null;
  inferredIdentity: { inferredName: string | null; inferredTitle: string | null; inferredCompany: string | null };
  finalName: string | null;
  finalTitle: string | null;
  finalCompany: string | null;
  phones: string[];
  emails: string[];
  website: string | null;
  addressParts: AddressParts;
  notes: string[];
}): void {
  const isDev = typeof globalThis !== "undefined" && Boolean((globalThis as { __DEV__?: boolean }).__DEV__);
  if (!isDev) return;
  console.log("[BusinessCardNormalize] decision", payload);
}

export function repairJsonString(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const firstBrace = input.indexOf("{");
  const lastBrace = input.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  let candidate = input.slice(firstBrace, lastBrace + 1).trim();
  candidate = candidate.replace(/,\s*([}\]])/g, "$1");

  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    const withDoubleQuotes = candidate.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
    const safe = withDoubleQuotes.replace(/,\s*([}\]])/g, "$1");
    try {
      JSON.parse(safe);
      return safe;
    } catch {
      return null;
    }
  }
}

export function validateAndNormalizeBusinessCardExtraction(
  input: unknown,
  rawText?: string,
  rawLines?: string[],
  preferredAddressLines?: string[],
  normalizationHints?: BusinessCardNormalizationHints,
  normalizationOptions?: BusinessCardNormalizationOptions
): BusinessCardExtraction {
  const parsed = BusinessCardExtractionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("LLM extraction JSON schema validation failed.");
  }
  const mode = normalizationOptions?.mode ?? "full";
  const isLightMode = mode === "light";
  const cachedRawLines = getCachedRawLines(rawText);

  const notes = uniqueStrings(parsed.data.notes);
  let phones = normalizePhones(parsed.data.phones, notes);
  let emails = normalizeEmails(parsed.data.emails, notes);
  if (phones.length === 0 && rawText) {
    phones = normalizePhones(extractPhoneCandidatesFromRawText(rawText), notes);
  }
  if (emails.length === 0 && rawText) {
    emails = normalizeEmails(extractEmailCandidatesFromRawText(rawText), notes);
  }
  phones = sortPhonesByRawContext(phones, rawText);
  let website =
    normalizeWebsite(normalizeNullable(parsed.data.website), notes) ??
    pickWebsiteFromRawText(rawText, emails, notes);
  website = pickWebsiteAlignedWithEmail(website, rawText, emails, notes);

  let addressParts = normalizeAddressParts(parsed.data.addressParts);

  const assembledAddress = assembleAddressFromParts(addressParts);
  const sanitizedLlmAddress = sanitizeAddress(normalizeNullable(parsed.data.address));
  const fallbackAddress = isLightMode ? null : buildAddressFromRawText(rawText, notes, rawLines, preferredAddressLines);
  const address = assembledAddress ?? sanitizedLlmAddress ?? fallbackAddress;

  addressParts = enrichAddressPartsFromText(addressParts, address);
  if (!isLightMode) {
    addressParts = enrichAddressPartsByLocale(addressParts, address);
  }

  const rawName = normalizeNullable(parsed.data.name);
  const rawCompany = normalizeNullable(parsed.data.company);
  const inferredIdentity = isLightMode
    ? { inferredName: null, inferredTitle: null, inferredCompany: null }
    : inferIdentityFromRawText(rawText, rawLines, normalizationHints);

  let name = sanitizeName(rawName);
  let company = sanitizeCompany(rawCompany);
  let title = sanitizeTitle(normalizeNullable(parsed.data.title));

  if (!name && inferredIdentity.inferredName) {
    name = inferredIdentity.inferredName;
  }

  if (!title && inferredIdentity.inferredTitle) {
    title = inferredIdentity.inferredTitle;
  }

  if (!company && rawName && looksLikeCompany(rawName)) {
    company = sanitizeCompany(rawName);
  }

  if (!company && rawCompany && looksLikeCompany(rawCompany)) {
    company = sanitizeCompany(rawCompany);
  }

  if (!company && inferredIdentity.inferredCompany) {
    company = sanitizeCompany(inferredIdentity.inferredCompany);
  } else if (company && inferredIdentity.inferredCompany) {
    const existing = company.toLocaleLowerCase("tr-TR");
    const inferred = inferredIdentity.inferredCompany.toLocaleLowerCase("tr-TR");
    if ((inferred.includes(existing) || existing.includes(inferred)) && inferred.length > existing.length + 3) {
      company = sanitizeCompany(inferredIdentity.inferredCompany);
    } else if (hasTitleKeyword(company) && !hasTitleKeyword(inferredIdentity.inferredCompany)) {
      company = sanitizeCompany(inferredIdentity.inferredCompany);
    }
  }

  if (isWeakCompanyCandidate(company) && inferredIdentity.inferredCompany && inferredIdentity.inferredCompany.length > (company?.length ?? 0)) {
    company = sanitizeCompany(inferredIdentity.inferredCompany);
  }

  if (!company && emails.length > 0) {
    const domain = emails[0]?.split("@")[1]?.split(".")[0];
    if (domain && rawText) {
      const domainUpper = domain.toUpperCase();
      for (const line of cachedRawLines) {
        if (line.toUpperCase().includes(domainUpper) && !CONTACT_TOKEN_REGEX.test(line) && !/@/.test(line)) {
          company = line.replace(/\s+/g, " ").trim();
          break;
        }
      }
    }
  }

  if (!company && website && rawText) {
    const websiteStem = extractDomainFromWebsite(website).split(".")[0]?.replace(/[-_]/g, " ").trim();
    if (websiteStem) {
      const matchedLine = cachedRawLines.find((line) => {
        const normalizedLine = line.toLocaleLowerCase("tr-TR");
        return normalizedLine.includes(websiteStem.toLocaleLowerCase("tr-TR")) && !CONTACT_TOKEN_REGEX.test(line);
      });
      if (matchedLine) {
        company = sanitizeCompany(matchedLine);
      }
    }
  }

  let domainDrivenCompany: string | null = null;
  let exactBrandCompany: string | null = null;
  if (!isLightMode) {
    domainDrivenCompany = inferCompanyFromDomainLines(rawText, [
      extractDomainFromWebsite(website ?? ""),
      ...(emails[0] ? [emails[0].split("@")[1] ?? ""] : []),
    ]);
    exactBrandCompany =
      inferExactBrandLineFromDomain(rawText, extractDomainFromWebsite(website ?? "")) ??
      inferExactBrandLineFromDomain(rawText, emails[0]?.split("@")[1] ?? "");
    if (/^(?:ООО|ЗАО|ОАО)$/u.test(company ?? "") && rawText) {
      const russianLegalLine = cachedRawLines.find((line) => /^(?:ООО|ЗАО|ОАО)\s+\p{L}+/u.test(line));
      if (russianLegalLine) {
        company = sanitizeCompany(russianLegalLine);
      }
    }
    if (shouldPreferRicherCompanyCandidate(company, domainDrivenCompany)) {
      company = sanitizeCompany(domainDrivenCompany);
    } else if (company && domainDrivenCompany) {
      const currentFolded = foldLocaleToken(company).replace(/[^\p{L}\d]/gu, "");
      const domainFolded = foldLocaleToken(domainDrivenCompany).replace(/[^\p{L}\d]/gu, "");
      const websiteStem = extractDomainFromWebsite(website ?? "").split(".")[0] ?? "";
      const stemFolded = foldLocaleToken(websiteStem).replace(/[^\p{L}\d]/gu, "");
      if (
        stemFolded &&
        !currentFolded.includes(stemFolded) &&
        domainFolded.includes(stemFolded) &&
        (isWeakCompanyCandidate(company) || !hasCompanyMarker(company) || /\b(?:group|grup)\b/i.test(company))
      ) {
        company = sanitizeCompany(domainDrivenCompany);
      }
    }
    if (exactBrandCompany && (isWeakCompanyCandidate(company) || /\b(?:group|grup)\b/i.test(company ?? ""))) {
      company = sanitizeCompany(exactBrandCompany);
    }
    if (exactBrandCompany && company) {
      const currentFolded = foldLocaleToken(company).replace(/[^\p{L}\d]/gu, "");
      const exactFolded = foldLocaleToken(exactBrandCompany).replace(/[^\p{L}\d]/gu, "");
      if (
        exactFolded &&
        currentFolded !== exactFolded &&
        (/\b(?:group|grup)\b/i.test(company) || isWeakCompanyCandidate(company) || !currentFolded.includes(exactFolded))
      ) {
        company = sanitizeCompany(exactBrandCompany);
      }
    }
  }

  if (
    !isLightMode &&
    company &&
    rawText &&
    (
      company.length <= 4 ||
      (
        company === company.toUpperCase() &&
        company.split(/\s+/).length <= 3 &&
        !/^(?:ООО|ЗАО|ОАО)\b/u.test(company) &&
        !exactBrandCompany
      )
    )
  ) {
    const websiteStem = extractDomainFromWebsite(website ?? "").split(".")[0]?.replace(/[-_]/g, " ").trim();
    const enrichedCompanyCandidates = [...cachedRawLines]
      .filter((line) => {
      const normalizedLine = line.toLocaleLowerCase("tr-TR");
      const matchesWebsiteStem = websiteStem
        ? normalizedLine.includes(websiteStem.toLocaleLowerCase("tr-TR"))
        : false;
      return (matchesWebsiteStem || looksLikeCompany(line)) && line.length > company!.length + 3 && !CONTACT_TOKEN_REGEX.test(line);
      })
      .sort((left, right) => right.length - left.length);
    const enrichedCompany = enrichedCompanyCandidates
      .map((line) => sanitizeCompany(line))
      .find((line): line is string => Boolean(line));
    if (enrichedCompany) {
      company = enrichedCompany;
    } else if (inferredIdentity.inferredCompany && inferredIdentity.inferredCompany.length > company.length) {
      company = sanitizeCompany(inferredIdentity.inferredCompany);
    } else {
      const domainDriven = inferCompanyFromDomainLines(rawText, [
        extractDomainFromWebsite(website ?? ""),
        ...(emails[0] ? [emails[0].split("@")[1] ?? ""] : []),
      ]);
      if (domainDriven) {
        company = domainDriven;
      }
    }
  }

  if (/^(?:ООО|ЗАО|ОАО)$/u.test(company ?? "") && rawText) {
    const russianLegalLine = cachedRawLines.find((line) => /^(?:ООО|ЗАО|ОАО)\s+\p{L}+/u.test(line));
    if (russianLegalLine) {
      company = russianLegalLine.replace(/\s+/g, " ").trim();
    }
  }

  const brandStemSource = extractDomainFromWebsite(website ?? "") || (emails[0]?.split("@")[1] ?? "");
  const brandStem = brandStemSource.split(".")[0]?.trim() ?? "";
  const brandStemFolded = foldLocaleToken(brandStem).replace(/[^\p{L}\d]/gu, "");
  if (brandStemFolded) {
    const cheapBrandLine = cachedRawLines.find((line) => {
      if (CONTACT_TOKEN_REGEX.test(line) || ADDRESS_HINT_REGEX.test(line) || hasTitleKeyword(line)) return false;
      const folded = foldLocaleToken(line).replace(/[^\p{L}\d]/gu, "");
      if (!folded || line.length > 32) return false;
      return folded.includes(brandStemFolded) || brandStemFolded.includes(folded);
    });

    if (cheapBrandLine) {
      const sanitizedBrandLine = sanitizeCompany(cheapBrandLine);
      const companyFolded = foldLocaleToken(company ?? "").replace(/[^\p{L}\d]/gu, "");
      const brandLineFolded = foldLocaleToken(sanitizedBrandLine ?? "").replace(/[^\p{L}\d]/gu, "");

      if (!company || isWeakCompanyCandidate(company) || isGenericIndustryOnlyCompany(company, brandStemFolded)) {
        company = sanitizedBrandLine;
      } else if (
        sanitizedBrandLine &&
        brandLineFolded &&
        companyFolded &&
        !companyFolded.includes(brandLineFolded) &&
        (
          hasCompanyMarker(company) ||
          isGenericIndustryOnlyCompany(company, brandStemFolded) ||
          (!companyFolded.includes(brandStemFolded) && !looksLikeSloganOrDecorativeLine(sanitizedBrandLine))
        )
      ) {
        company = sanitizeCompany(`${sanitizedBrandLine} ${company}`);
      }
    }
  }

  company = normalizeCompanyConnectors(
    normalizeCompanySuffix(isLightMode ? company : beautifyCompanyWithRawContext(company, rawText))
  );

  if (name && hasTitleKeyword(name)) {
    if (!title) {
      title = sanitizeTitle(name);
    }
    name = null;
  }

  if (!name && title) {
    const rescuedName = rescuePersonNearTitleFromRawLines(cachedRawLines, title, company);
    if (rescuedName) {
      name = rescuedName;
    }
  }

  if (name && looksLikeCompany(name) && (!company || isWeakCompanyCandidate(company))) {
    company = normalizeCompanyConnectors(normalizeCompanySuffix(sanitizeCompany(name)));
    name = null;
  }

  if ((!website || /^(?:com|net|org|gov|edu|biz|info|co)\.[a-z]{2,}$/i.test(website)) && emails.length > 0) {
    const emailDomain = emails[0]?.split("@")[1]?.trim().toLowerCase();
    if (emailDomain && !FREE_EMAIL_PROVIDER_SET.has(emailDomain)) {
      website = `www.${emailDomain}`;
    }
  }

  const contactNameAndSurname = name;

  logBusinessCardNormalizationDebug({
    assembledAddress,
    sanitizedLlmAddress,
    fallbackAddress,
    finalAddress: address,
    preferredAddressLines,
    rawName,
    rawCompany,
    inferredIdentity,
    finalName: name,
    finalTitle: title,
    finalCompany: company,
    phones,
    emails,
    website,
    addressParts,
    notes,
  });

  return {
    contactNameAndSurname,
    name,
    title,
    company,
    phones,
    emails,
    website,
    address,
    addressParts,
    social: {
      linkedin: normalizeSocialHandle(normalizeNullable(parsed.data.social.linkedin)),
      instagram: normalizeSocialHandle(normalizeNullable(parsed.data.social.instagram)),
      x: normalizeSocialHandle(normalizeNullable(parsed.data.social.x)),
      facebook: normalizeSocialHandle(normalizeNullable(parsed.data.social.facebook)),
    },
    notes: uniqueStrings(notes),
  };
}

function pickPreferredAddress(primary: string | null, secondary: string | null): string | null {
  if (primary && secondary) {
    const primaryLen = primary.replace(/\s+/g, " ").trim().length;
    const secondaryLen = secondary.replace(/\s+/g, " ").trim().length;
    return secondaryLen > primaryLen + 8 ? secondary : primary;
  }
  return primary ?? secondary;
}

function pickPreferredScalar(primary: string | null, secondary: string | null): string | null {
  return primary ?? secondary;
}

function mergeAddressParts(primary: AddressParts, secondary: AddressParts): AddressParts {
  return {
    neighborhood: primary.neighborhood ?? secondary.neighborhood,
    street: primary.street ?? secondary.street,
    avenue: primary.avenue ?? secondary.avenue,
    boulevard: primary.boulevard ?? secondary.boulevard,
    sitePlaza: primary.sitePlaza ?? secondary.sitePlaza,
    block: primary.block ?? secondary.block,
    buildingNo: primary.buildingNo ?? secondary.buildingNo,
    floor: primary.floor ?? secondary.floor,
    apartment: primary.apartment ?? secondary.apartment,
    postalCode: primary.postalCode ?? secondary.postalCode,
    district: primary.district ?? secondary.district,
    province: primary.province ?? secondary.province,
    country: primary.country ?? secondary.country,
  };
}

function scoreExtractionCompleteness(extraction: BusinessCardExtraction): number {
  let score = 0;
  if (extraction.name) score += 3;
  if (extraction.company) score += 4;
  if (extraction.title) score += 2;
  if (extraction.website) score += 1;
  if (extraction.address) score += 2;
  score += Math.min(extraction.phones.length, 2) * 2;
  score += Math.min(extraction.emails.length, 2) * 2;
  if (extraction.addressParts.district) score += 1;
  if (extraction.addressParts.province) score += 1;
  return score;
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractEmailDomain(value: string | null | undefined): string | null {
  if (!value || !value.includes("@")) return null;
  return value.split("@")[1]?.toLocaleLowerCase("tr-TR") ?? null;
}

function hasSuspiciousEmailPattern(value: string): boolean {
  return /\.\.|__|--|@@|\s/.test(value);
}

function hasSuspiciousWebsitePattern(value: string): boolean {
  return /\s|@|\.\.|,,|;;/.test(value);
}

function buildBusinessCardReviewSummary(extraction: BusinessCardExtraction): BusinessCardReviewSummary {
  const flags: BusinessCardReviewFlag[] = [];
  const fieldConfidence: BusinessCardReviewSummary["fieldConfidence"] = {};

  const setField = (
    field: keyof BusinessCardReviewSummary["fieldConfidence"],
    confidence: number,
    reason?: string,
    severity: BusinessCardReviewFlag["severity"] = "medium"
  ): void => {
    fieldConfidence[field] = clampConfidence(confidence);
    if (reason) {
      flags.push({ field, reason, severity });
    }
  };

  if (extraction.company) {
    let confidence = 86;
    if (hasCompanyMarker(extraction.company)) confidence += 8;
    else if (lineContainsLexiconToken(extraction.company, BUSINESS_CARD_INDUSTRY_KEYWORDS)) confidence += 5;
    if (extraction.company.length < 4) confidence -= 25;
    if (ADDRESS_HINT_REGEX.test(extraction.company) || CONTACT_TOKEN_REGEX.test(extraction.company)) confidence -= 30;
    setField(
      "customerName",
      confidence,
      confidence < 70
        ? ADDRESS_HINT_REGEX.test(extraction.company) || CONTACT_TOKEN_REGEX.test(extraction.company)
          ? "Firma adı adres veya iletişim satırıyla karışmış olabilir."
          : "Firma adı kısa veya belirsiz görünüyor."
        : undefined,
      confidence < 55 ? "high" : "medium"
    );
  } else {
    setField("customerName", 15, "Firma adı bulunamadı.", "high");
  }

  if (extraction.contactNameAndSurname) {
    const tokenCount = extraction.contactNameAndSurname.split(/\s+/).filter(Boolean).length;
    let confidence = tokenCount >= 2 ? 84 : 48;
    if (looksLikeCompany(extraction.contactNameAndSurname)) confidence -= 35;
    setField(
      "contactNameAndSurname",
      confidence,
      confidence < 70 ? "Kişi adı firma satırı ile karışmış olabilir." : undefined,
      confidence < 50 ? "high" : "medium"
    );
  } else {
    setField("contactNameAndSurname", 20, "Kişi adı bulunamadı.", "high");
  }

  if (extraction.title) {
    let confidence = hasTitleKeyword(extraction.title) ? 84 : 56;
    if (hasCompanyMarker(extraction.title) || ADDRESS_HINT_REGEX.test(extraction.title)) confidence -= 24;
    setField(
      "title",
      confidence,
      confidence < 70
        ? hasCompanyMarker(extraction.title) || ADDRESS_HINT_REGEX.test(extraction.title)
          ? "Ünvan satırı firma veya adres bilgisiyle karışmış olabilir."
          : "Ünvan satırı net görünmüyor olabilir."
        : undefined,
      "medium"
    );
  } else {
    setField("title", 30, "Ünvan bulunamadı.", "low");
  }

  const phoneValues = [extraction.phones[0], extraction.phones[1]] as const;
  (["phone1", "phone2"] as const).forEach((field, index) => {
    const phone = phoneValues[index];
    if (!phone) {
      setField(field, index === 0 ? 25 : 0, index === 0 ? "Telefon bulunamadı." : undefined, index === 0 ? "medium" : "low");
      return;
    }
    const confidence = PHONE_E164_GENERIC_REGEX.test(phone) ? 92 : 52;
    setField(
      field,
      confidence,
      confidence < 70 ? "Telefon formatı şüpheli görünüyor." : undefined,
      confidence < 55 ? "high" : "medium"
    );
  });

  if (extraction.emails[0]) {
    let confidence = EMAIL_REGEX.test(extraction.emails[0]) ? 94 : 45;
    if (hasSuspiciousEmailPattern(extraction.emails[0])) confidence -= 24;
    setField(
      "email",
      confidence,
      confidence < 70
        ? hasSuspiciousEmailPattern(extraction.emails[0])
          ? "E-posta adresinde OCR kaynaklı karakter hatası olabilir."
          : "E-posta adresi doğrulanamadı."
        : undefined,
      confidence < 55 ? "high" : "medium"
    );
  } else {
    setField("email", 25, "E-posta bulunamadı.", "low");
  }

  if (extraction.website) {
    let confidence = isValidWebsite(extraction.website) ? 88 : 48;
    if (hasSuspiciousWebsitePattern(extraction.website)) confidence -= 20;
    const emailDomain = extractEmailDomain(extraction.emails[0]);
    const websiteDomain = extractDomainFromWebsite(extraction.website);
    const domainMismatch =
      Boolean(emailDomain) &&
      Boolean(websiteDomain) &&
      !websiteDomain.includes(emailDomain!) &&
      !emailDomain!.includes(websiteDomain);
    if (domainMismatch) confidence -= 12;
    setField(
      "website",
      confidence,
      confidence < 70
        ? domainMismatch
          ? "Web sitesi alanı e-posta domainiyle uyuşmuyor, kontrol etmek iyi olabilir."
          : hasSuspiciousWebsitePattern(extraction.website)
            ? "Web sitesi alanında OCR kaynaklı karakter hatası olabilir."
            : "Web sitesi alanı şirket satırı ile karışmış olabilir."
        : undefined,
      confidence < 55 ? "high" : "medium"
    );
  } else {
    setField("website", 25, "Web sitesi bulunamadı.", "low");
  }

  if (extraction.address) {
    const strongSegments = extraction.address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((segment) => isStrongAddressLine(segment)).length;
    let confidence = strongSegments >= 2 ? 84 : strongSegments === 1 ? 64 : 40;
    if (/@|www\.|https?:\/\/|\b(?:tel|telefon|gsm|mobile|fax|faks|email|e-mail)\b/i.test(extraction.address)) confidence -= 28;
    setField(
      "address",
      confidence,
      confidence < 70 ? "Adres satırı iletişim bilgileriyle karışmış olabilir." : undefined,
      confidence < 55 ? "high" : "medium"
    );
  } else {
    setField("address", 20, "Adres bulunamadı.", "medium");
  }

  const confidenceValues = Object.values(fieldConfidence);
  const overallConfidence = confidenceValues.length > 0
    ? clampConfidence(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
    : 0;

  return {
    overallConfidence,
    fieldConfidence,
    flags,
  };
}

export function mergeBusinessCardExtractions(
  primary: BusinessCardExtraction,
  secondary: BusinessCardExtraction
): BusinessCardExtraction {
  const mergedPhones = uniqueStrings([...primary.phones, ...secondary.phones]);
  const mergedEmails = uniqueStrings([...primary.emails, ...secondary.emails]);
  const mergedNotes = uniqueStrings([...primary.notes, ...secondary.notes]);
  const mergedAddressParts = mergeAddressParts(primary.addressParts, secondary.addressParts);

  const merged: BusinessCardExtraction = {
    contactNameAndSurname: pickPreferredScalar(primary.contactNameAndSurname, secondary.contactNameAndSurname),
    name: pickPreferredScalar(primary.name, secondary.name),
    title: pickPreferredScalar(primary.title, secondary.title),
    company: pickPreferredScalar(primary.company, secondary.company),
    phones: mergedPhones,
    emails: mergedEmails,
    website: pickPreferredScalar(primary.website, secondary.website),
    address: pickPreferredAddress(primary.address, secondary.address),
    addressParts: mergedAddressParts,
    social: {
      linkedin: pickPreferredScalar(primary.social.linkedin, secondary.social.linkedin),
      instagram: pickPreferredScalar(primary.social.instagram, secondary.social.instagram),
      x: pickPreferredScalar(primary.social.x, secondary.social.x),
      facebook: pickPreferredScalar(primary.social.facebook, secondary.social.facebook),
    },
    notes: mergedNotes,
  };

  if (!merged.contactNameAndSurname && merged.name) {
    merged.contactNameAndSurname = merged.name;
  }

  return merged;
}

export function pickBestBusinessCardExtraction(
  primary: BusinessCardExtraction,
  secondary: BusinessCardExtraction
): BusinessCardExtraction {
  const primaryScore = scoreExtractionCompleteness(primary);
  const secondaryScore = scoreExtractionCompleteness(secondary);

  if (primaryScore >= secondaryScore) {
    return mergeBusinessCardExtractions(primary, secondary);
  }

  return mergeBusinessCardExtractions(secondary, primary);
}

export function toBusinessCardOcrResult(extraction: BusinessCardExtraction): BusinessCardOcrResult {
  const noteParts: string[] = [];
  if (extraction.company && extraction.name) {
    noteParts.push(`İlgili: ${extraction.name}`);
  }
  if (extraction.title) {
    noteParts.push(`Ünvan: ${extraction.title}`);
  }
  for (const note of extraction.notes) {
    noteParts.push(note);
  }

  const review = buildBusinessCardReviewSummary(extraction);

  return {
    customerName: extraction.company ?? extraction.name ?? undefined,
    contactNameAndSurname: extraction.contactNameAndSurname ?? undefined,
    title: extraction.title ?? undefined,
    countryName: extraction.addressParts.country ?? undefined,
    cityName: extraction.addressParts.province ?? undefined,
    districtName: extraction.addressParts.district ?? undefined,
    phone1: extraction.phones[0],
    phone2: extraction.phones[1],
    email: extraction.emails[0],
    address: extraction.address ?? undefined,
    website: extraction.website ?? undefined,
    notes: noteParts.length > 0 ? noteParts.join(", ") : undefined,
    review,
  };
}
