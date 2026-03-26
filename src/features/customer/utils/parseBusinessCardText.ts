import type { BusinessCardOcrResult } from "../types/businessCard";

const EMAIL_REGEX =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g;
const PHONE_REGEX =
  /(?:\+|00)?\d{1,3}[\s().-]*(?:\d[\s().-]*){6,14}(?:\s*\/\s*\d{1,6}|\s*\(\d{1,6}\))?/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;
const WEBSITE_REGEX = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9.]*\.(?:[a-z]{2,}|com\.[a-z]{2}|cn)(?:\/[^\s]*)?/gi;

function trimAndClean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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
  let match: RegExpExecArray | null;
  const emailRegex = new RegExp(EMAIL_REGEX.source, "g");
  while ((match = emailRegex.exec(text)) !== null) {
    const e = match[0];
    if (e && !emails.includes(e)) emails.push(e);
  }
  const tokens = text.split(/\s+/);
  for (const token of tokens) {
    const t = token.replace(/[,;:]$/, "");
    if (isEmailLike(t) && !emails.includes(t)) emails.push(t);
  }
  return emails;
}

function extractPhones(text: string): string[] {
  const phones: string[] = [];
  let match: RegExpExecArray | null;
  const phoneRegex = new RegExp(PHONE_REGEX.source, "g");
  while ((match = phoneRegex.exec(text)) !== null) {
    const raw = trimAndClean(match[0]);
    const digits = raw.replace(/\D/g, "").replace(/^0/, "");
    if (digits.length >= 10 && !phones.some((x) => x.replace(/\D/g, "").endsWith(digits.slice(-10)))) {
      phones.push(raw);
    }
  }
  const tokens = text.split(/\s+/);
  for (const token of tokens) {
    const t = token.replace(/[,;:]$/, "");
    if (isPhoneLike(t)) {
      const normalized = trimAndClean(t);
      if (!phones.some((p) => p.replace(/\D/g, "") === normalized.replace(/\D/g, ""))) {
        phones.push(normalized);
      }
    }
  }
  return phones;
}

function extractWebsites(text: string): string[] {
  const websites: string[] = [];
  const textWithoutEmails = extractEmails(text).reduce(
    (current, email) => current.replace(new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), " "),
    text
  );
  let match: RegExpExecArray | null;
  const websiteRegex = new RegExp(WEBSITE_REGEX.source, "g");
  while ((match = websiteRegex.exec(textWithoutEmails)) !== null) {
    const w = trimAndClean(match[0]);
    if (w && !w.includes("@") && !websites.includes(w)) websites.push(w);
  }
  websites.sort((left, right) => {
    const leftPriority = /^(https?:\/\/|www\.)/i.test(left) ? 0 : 1;
    const rightPriority = /^(https?:\/\/|www\.)/i.test(right) ? 0 : 1;
    return leftPriority - rightPriority || left.localeCompare(right);
  });
  return websites;
}

export function parseBusinessCardText(rawText: string): BusinessCardOcrResult {
  if (!rawText || typeof rawText !== "string") return {};
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const emails = extractEmails(text);
  const phones = extractPhones(text);
  const websites = extractWebsites(text);

  let remaining = text;
  emails.forEach((e) => (remaining = remaining.replace(e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), " ")));
  phones.forEach((p) => (remaining = remaining.replace(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), " ")));
  websites.forEach((w) => (remaining = remaining.replace(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), " ")));
  remaining = remaining.replace(URL_REGEX, " ");
  const remainingLines = remaining
    .split("\n")
    .map((l) => trimAndClean(l))
    .filter((l) => l.length > 1 && l.length < 200);

  let customerName: string | undefined;
  const addressParts: string[] = [];
  for (const line of remainingLines) {
    if (line.length >= 2 && line.length <= 250 && !/^\d+[\s,.]*\d+/.test(line)) {
      if (!customerName) {
        customerName = truncate(line, 250);
      } else {
        addressParts.push(line);
      }
    } else if (line.length > 0) {
      addressParts.push(line);
    }
  }

  const address =
    addressParts.length > 0 ? truncate(addressParts.join("\n"), 500) : undefined;

  return {
    customerName: customerName || undefined,
    phone1: phones[0] ? truncate(phones[0], 100) : undefined,
    email: emails[0] ? truncate(emails[0], 100) : undefined,
    address: address || undefined,
    website: websites[0] ? truncate(websites[0], 100) : undefined,
  };
}
