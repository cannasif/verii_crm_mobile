import type { BusinessCardOcrResult } from "../types/businessCard";

type BarcodeRecord = {
  rawValue?: string;
  displayValue?: string;
  value?: string;
};

type BarcodeModule = {
  scan?: (imageUri: string, formats?: string[]) => Promise<BarcodeRecord[] | { barcodes?: BarcodeRecord[] }>;
  detect?: (imageUri: string) => Promise<BarcodeRecord[] | { barcodes?: BarcodeRecord[] }>;
};

function getBarcodeModule(): BarcodeModule | null {
  try {
    const loaded = require("@react-native-ml-kit/barcode-scanning") as { default?: BarcodeModule } & Partial<BarcodeModule>;
    if (typeof loaded.scan === "function" || typeof loaded.detect === "function") {
      return {
        scan: loaded.scan,
        detect: loaded.detect,
      };
    }
    if (loaded.default) {
      return loaded.default;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeBarcodeResult(result: BarcodeRecord[] | { barcodes?: BarcodeRecord[] } | null | undefined): BarcodeRecord[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  return result.barcodes ?? [];
}

function parseVCardText(text: string): BusinessCardOcrResult | null {
  const normalized = text.replace(/\r/g, "");
  if (!/BEGIN:VCARD/i.test(normalized)) {
    return null;
  }

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const field = (prefix: string) => lines.find((line) => line.toUpperCase().startsWith(prefix.toUpperCase() + ":"))?.split(":").slice(1).join(":").trim();
  const fieldStartsWith = (prefix: string) => lines.find((line) => line.toUpperCase().startsWith(prefix.toUpperCase()));

  const fullName = field("FN") ?? null;
  const org = field("ORG") ?? null;
  const title = field("TITLE") ?? null;
  const emailLine = fieldStartsWith("EMAIL");
  const telLines = lines.filter((line) => line.toUpperCase().startsWith("TEL"));
  const urlLine = fieldStartsWith("URL");
  const adrLine = fieldStartsWith("ADR");

  const email = emailLine?.split(":").slice(1).join(":").trim() ?? undefined;
  const phones = telLines.map((line) => line.split(":").slice(1).join(":").trim()).filter(Boolean);
  const website = urlLine?.split(":").slice(1).join(":").trim() ?? undefined;
  const address = adrLine
    ?.split(":")
    .slice(1)
    .join(":")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  return {
    customerName: org ?? undefined,
    contactNameAndSurname: fullName ?? undefined,
    title: title ?? undefined,
    phone1: phones[0] ?? undefined,
    phone2: phones[1] ?? undefined,
    email,
    website,
    address: address || undefined,
  };
}

function parseMecardText(text: string): BusinessCardOcrResult | null {
  if (!/^MECARD:/i.test(text)) {
    return null;
  }
  const payload = text.replace(/^MECARD:/i, "");
  const parts = payload.split(";").map((part) => part.trim()).filter(Boolean);
  const map = new Map<string, string[]>();
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).toUpperCase();
    const value = part.slice(idx + 1).trim();
    const current = map.get(key) ?? [];
    current.push(value);
    map.set(key, current);
  }

  const nameRaw = map.get("N")?.[0];
  const formattedName = nameRaw ? nameRaw.split(",").reverse().join(" ").trim() : undefined;
  const org = map.get("ORG")?.[0];
  const address = map.get("ADR")?.[0];
  const phones = map.get("TEL") ?? [];
  const email = map.get("EMAIL")?.[0];
  const website = map.get("URL")?.[0];
  const title = map.get("TITLE")?.[0];

  return {
    customerName: org,
    contactNameAndSurname: formattedName,
    title,
    phone1: phones[0],
    phone2: phones[1],
    email,
    website,
    address,
  };
}

export function parseQrPayloadToBusinessCard(rawValue: string): BusinessCardOcrResult | null {
  const trimmed = rawValue.trim();
  const structured = parseVCardText(trimmed) ?? parseMecardText(trimmed);
  if (structured) return structured;

  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
    return { website: trimmed };
  }

  if (/^mailto:/i.test(trimmed)) {
    return { email: trimmed.replace(/^mailto:/i, "").trim() || undefined };
  }

  if (/^tel:/i.test(trimmed)) {
    return { phone1: trimmed.replace(/^tel:/i, "").trim() || undefined };
  }

  return null;
}

export async function detectQrFromImage(imageUri: string): Promise<{ rawValue: string | null; parsedCard: BusinessCardOcrResult | null }> {
  const barcodeModule = getBarcodeModule();
  if (!barcodeModule) {
    return { rawValue: null, parsedCard: null };
  }

  try {
    const rawResult = barcodeModule.scan
      ? await barcodeModule.scan(imageUri, ["QR_CODE"])
      : barcodeModule.detect
        ? await barcodeModule.detect(imageUri)
        : [];
    const barcodes = normalizeBarcodeResult(rawResult);
    const qrValue = barcodes
      .map((item) => item.rawValue ?? item.displayValue ?? item.value ?? "")
      .find(Boolean) ?? null;

    return {
      rawValue: qrValue,
      parsedCard: qrValue ? parseQrPayloadToBusinessCard(qrValue) : null,
    };
  } catch {
    return { rawValue: null, parsedCard: null };
  }
}
