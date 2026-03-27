import type { OcrLineItem, OcrResultPayload } from "./ocrService";

type PreprocessedOcrPayload = OcrResultPayload;

const CONTACT_SPLIT_REGEX =
  /\s+(?=(?:tel\.?|telefon|gsm|mobile|mob\.?|fax|faks|e-?mail|email|web|website|www\.|http|adres|address|merkez|şube|sube)\s*[:|])/i;
const NOISE_ONLY_REGEX = /^[^@\p{L}\d]+$/u;
const REPEATED_PUNCT_REGEX = /([|:;,.])\1{1,}/g;

function cleanText(value: string): string {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(REPEATED_PUNCT_REGEX, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFold(value: string): string {
  return cleanText(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9@.]+/g, "");
}

function looksLikeNoise(line: string): boolean {
  const cleaned = cleanText(line);
  if (!cleaned) return true;
  if (NOISE_ONLY_REGEX.test(cleaned)) return true;
  const letterCount = (cleaned.match(/\p{L}/gu) ?? []).length;
  const digitCount = (cleaned.match(/\d/g) ?? []).length;
  if (letterCount === 0 && digitCount < 4) return true;
  if (cleaned.length >= 8 && letterCount === 0 && digitCount === 0) return true;
  return false;
}

function splitCompoundLine(line: string): string[] {
  const normalized = cleanText(line)
    .replace(/\b(e[\s.-]?mail)\b/gi, "E-mail")
    .replace(/\b(www)\s+/gi, "www.")
    .replace(/\s*[|]\s*/g, " | ");

  const directParts = normalized
    .split(CONTACT_SPLIT_REGEX)
    .map((part) => cleanText(part))
    .filter(Boolean);

  if (directParts.length > 1) return directParts;

  const pipeParts = normalized
    .split(/\s+\|\s+/)
    .map((part) => cleanText(part))
    .filter(Boolean);

  return pipeParts.length > 1 ? pipeParts : [normalized];
}

function dedupeLines<T extends { text: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = normalizeFold(item.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function expandLineItems(lineItems: OcrLineItem[]): OcrLineItem[] {
  const expanded: OcrLineItem[] = [];
  lineItems.forEach((item) => {
    const parts = splitCompoundLine(item.text);
    parts.forEach((part, partIndex) => {
      if (looksLikeNoise(part)) return;
      expanded.push({
        ...item,
        text: part,
        lineIndex: item.lineIndex * 10 + partIndex,
      });
    });
  });
  return dedupeLines(expanded);
}

export function preprocessBusinessCardOcr(payload: OcrResultPayload): PreprocessedOcrPayload {
  const baseRawText = cleanText(payload.rawText).replace(/\s*\n\s*/g, "\n");
  const rawLines = payload.lines.length > 0 ? payload.lines : baseRawText.split(/\r?\n/);

  const cleanedLines = dedupeLines(
    rawLines
      .flatMap((line) => splitCompoundLine(line))
      .map((line) => ({ text: cleanText(line) }))
      .filter((item) => item.text.length > 0 && !looksLikeNoise(item.text))
  ).map((item) => item.text);

  const cleanedLineItems = payload.lineItems.length > 0
    ? expandLineItems(payload.lineItems)
    : cleanedLines.map((text, index) => ({
        blockIndex: 0,
        lineIndex: index,
        text,
        recognizedLanguages: payload.recognizedLanguages,
      }));

  const rawText = cleanedLineItems.map((item) => item.text).join("\n");
  return {
    rawText,
    lines: cleanedLines,
    lineItems: cleanedLineItems,
    recognizedLanguages: payload.recognizedLanguages,
  };
}

