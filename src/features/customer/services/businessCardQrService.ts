import type { BusinessCardOcrResult } from "../types/businessCard";

type BarcodeRecord = {
  rawValue?: string;
  displayValue?: string;
  value?: string;
  format?: number | string;
  contactInfo?: {
    title?: string;
    organization?: string;
    urls?: string[];
    emails?: Array<{ address?: string }>;
    phones?: Array<{ number?: string; type?: string }>;
    addresses?: Array<{
      addressLines?: string[];
      locality?: string;
      administrativeArea?: string;
      postalCode?: string;
      country?: string;
    }>;
  };
  url?: { title?: string; url?: string };
  email?: { address?: string; subject?: string; body?: string };
  phone?: { number?: string };
};

type BarcodeModule = {
  scan?: (imageUri: string) => Promise<BarcodeRecord[] | { barcodes?: BarcodeRecord[] }>;
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

type ParsedQrProperty = {
  key: string;
  params: string[];
  value: string;
};

type ParsedPhone = {
  number: string;
  types: string[];
};

type ParsedAddress = {
  full: string | undefined;
  street: string | undefined;
  locality: string | undefined;
  region: string | undefined;
  postalCode: string | undefined;
  country: string | undefined;
  notes: string[];
};

function appendNote(existing: string | undefined, value: string | undefined): string | undefined {
  const next = value?.trim();
  if (!next) return existing;
  if (!existing?.trim()) return next;
  return `${existing}\n${next}`;
}

function normalizeMultilineValue(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\\\/g, "\\").trim();
}

function unfoldVCardLines(text: string): string[] {
  const rawLines = text.replace(/\r/g, "").split("\n");
  const unfolded: string[] = [];
  for (const rawLine of rawLines) {
    if (!rawLine) continue;
    if ((rawLine.startsWith(" ") || rawLine.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += rawLine.trimStart();
      continue;
    }
    unfolded.push(rawLine.trim());
  }
  return unfolded.filter(Boolean);
}

function parseQrPropertyLine(line: string): ParsedQrProperty | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex <= 0) return null;
  const rawKey = line.slice(0, colonIndex).trim();
  const value = normalizeMultilineValue(line.slice(colonIndex + 1));
  const [baseKey, ...params] = rawKey.split(";");
  return {
    key: baseKey.toUpperCase(),
    params: params.map((param) => param.trim()).filter(Boolean),
    value,
  };
}

function parsePropertyParams(params: string[]): string[] {
  return params.flatMap((param) => {
    const eqIndex = param.indexOf("=");
    const rawValue = eqIndex >= 0 ? param.slice(eqIndex + 1) : param;
    return rawValue
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  });
}

function scorePhoneType(types: string[]): number {
  let score = 0;
  if (types.includes("CELL") || types.includes("MOBILE")) score += 100;
  if (types.includes("WORK")) score += 60;
  if (types.includes("VOICE")) score += 40;
  if (types.includes("HOME")) score += 10;
  if (types.includes("FAX")) score -= 100;
  return score;
}

function parseAdrValue(value: string): ParsedAddress {
  const [poBox, extended, street, locality, region, postalCode, country] = value
    .split(";")
    .map((part) => part.trim())
    .map((part) => normalizeMultilineValue(part));
  const notes = [poBox ? `PO Box: ${poBox}` : null, extended ? `Address Extra: ${extended}` : null].filter(Boolean) as string[];
  const full = [street, locality, region, postalCode, country].filter(Boolean).join(", ") || undefined;
  return {
    full,
    street: street || undefined,
    locality: locality || undefined,
    region: region || undefined,
    postalCode: postalCode || undefined,
    country: country || undefined,
    notes,
  };
}

function buildResultFromPhones(
  phones: ParsedPhone[],
  notes: string | undefined,
): Pick<BusinessCardOcrResult, "phone1" | "phone2" | "notes"> {
  const sorted = [...phones].sort((left, right) => scorePhoneType(right.types) - scorePhoneType(left.types));
  const nonFaxPhones = sorted.filter((phone) => !phone.types.includes("FAX"));
  const faxPhones = sorted.filter((phone) => phone.types.includes("FAX"));
  let nextNotes = notes;
  for (const faxPhone of faxPhones) {
    nextNotes = appendNote(nextNotes, `Fax: ${faxPhone.number}`);
  }
  return {
    phone1: nonFaxPhones[0]?.number,
    phone2: nonFaxPhones[1]?.number,
    notes: nextNotes,
  };
}

function parseVCardText(text: string): BusinessCardOcrResult | null {
  const normalized = text.replace(/\r/g, "");
  if (!/BEGIN:VCARD/i.test(normalized)) {
    return null;
  }

  const properties = unfoldVCardLines(normalized)
    .map(parseQrPropertyLine)
    .filter((property): property is ParsedQrProperty => Boolean(property));
  const firstValue = (key: string) => properties.find((property) => property.key === key)?.value;
  const allValues = (key: string) => properties.filter((property) => property.key === key);

  const fullName = firstValue("FN") ?? undefined;
  const org = firstValue("ORG") ?? undefined;
  const title = firstValue("TITLE") ?? undefined;
  const role = firstValue("ROLE") ?? undefined;
  const email = firstValue("EMAIL") ?? undefined;
  const website = firstValue("URL") ?? undefined;
  const language = firstValue("LANG") ?? undefined;
  const note = firstValue("NOTE") ?? undefined;
  const impp = firstValue("IMPP") ?? undefined;
  const photo = firstValue("PHOTO") ?? undefined;
  const phoneEntries = allValues("TEL")
    .map((property) => {
      const types = parsePropertyParams(property.params);
      return property.value ? { number: property.value, types } : null;
    })
    .filter((entry): entry is ParsedPhone => Boolean(entry));
  const adr = allValues("ADR")[0]?.value ? parseAdrValue(allValues("ADR")[0].value) : null;

  let notes = note;
  notes = appendNote(notes, language ? `Language: ${language}` : undefined);
  notes = appendNote(notes, impp ? `IMPP: ${impp}` : undefined);
  notes = appendNote(notes, photo ? `PHOTO: ${photo}` : undefined);
  if (adr) {
    for (const adrNote of adr.notes) {
      notes = appendNote(notes, adrNote);
    }
  }
  const phoneResult = buildResultFromPhones(phoneEntries, notes);

  return {
    customerName: org,
    contactNameAndSurname: fullName,
    title: [title, role].filter(Boolean).join(" / ") || undefined,
    phone1: phoneResult.phone1,
    phone2: phoneResult.phone2,
    email,
    website,
    address: adr?.full,
    countryName: adr?.country,
    cityName: adr?.region,
    districtName: adr?.locality,
    notes: phoneResult.notes,
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
  const phones = (map.get("TEL") ?? []).map((number) => ({ number, types: ["CELL"] }));
  const email = map.get("EMAIL")?.[0];
  const website = map.get("URL")?.[0];
  const title = [map.get("TITLE")?.[0], map.get("ROLE")?.[0]].filter(Boolean).join(" / ") || undefined;
  const language = map.get("LANG")?.[0];
  const note = map.get("NOTE")?.[0];
  const impp = map.get("IMPP")?.[0];
  const photo = map.get("PHOTO")?.[0];
  let notes = note;
  notes = appendNote(notes, language ? `Language: ${language}` : undefined);
  notes = appendNote(notes, impp ? `IMPP: ${impp}` : undefined);
  notes = appendNote(notes, photo ? `PHOTO: ${photo}` : undefined);
  const phoneResult = buildResultFromPhones(phones, notes);

  return {
    customerName: org,
    contactNameAndSurname: formattedName,
    title,
    phone1: phoneResult.phone1,
    phone2: phoneResult.phone2,
    email,
    website,
    address,
    notes: phoneResult.notes,
  };
}

function parseStructuredBarcodeRecord(record: BarcodeRecord): BusinessCardOcrResult | null {
  const structured = record.contactInfo;
  if (structured) {
    const phones = (structured.phones ?? [])
      .map((phone) => (phone.number ? { number: phone.number, types: phone.type ? [phone.type.toUpperCase()] : [] } : null))
      .filter((phone): phone is ParsedPhone => Boolean(phone));
    let notes: string | undefined;
    const address = structured.addresses?.[0];
    const addressLine = address
      ? [...(address.addressLines ?? []), address.locality, address.administrativeArea, address.postalCode, address.country]
          .filter(Boolean)
          .join(", ")
      : undefined;
    const phoneResult = buildResultFromPhones(phones, notes);
    return {
      customerName: structured.organization,
      title: structured.title,
      phone1: phoneResult.phone1,
      phone2: phoneResult.phone2,
      email: structured.emails?.[0]?.address,
      website: structured.urls?.[0] ?? record.url?.url,
      address: addressLine || undefined,
      countryName: address?.country,
      cityName: address?.administrativeArea,
      districtName: address?.locality,
      notes: phoneResult.notes,
    };
  }

  if (record.url?.url) {
    return { website: record.url.url, notes: record.url.title ? `QR Title: ${record.url.title}` : undefined };
  }
  if (record.email?.address) {
    return {
      email: record.email.address,
      notes: [record.email.subject ? `Email Subject: ${record.email.subject}` : null, record.email.body ? `Email Body: ${record.email.body}` : null]
        .filter(Boolean)
        .join("\n") || undefined,
    };
  }
  if (record.phone?.number) {
    return { phone1: record.phone.number };
  }

  return null;
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

export async function detectQrFromImage(
  imageUri: string,
  options?: { timeoutMs?: number }
): Promise<{ rawValue: string | null; parsedCard: BusinessCardOcrResult | null }> {
  const barcodeModule = getBarcodeModule();
  if (!barcodeModule) {
    return { rawValue: null, parsedCard: null };
  }

  try {
    const runDetection = async () =>
      barcodeModule.scan
        ? await barcodeModule.scan(imageUri)
        : barcodeModule.detect
          ? await barcodeModule.detect(imageUri)
          : [];

    const timeoutMs = options?.timeoutMs ?? 0;
    const rawResult =
      timeoutMs > 0
        ? await Promise.race([
            runDetection(),
            new Promise<BarcodeRecord[]>((resolve) => setTimeout(() => resolve([]), timeoutMs)),
          ])
        : await runDetection();
    const barcodes = normalizeBarcodeResult(rawResult);
    const structuredCard = barcodes.map(parseStructuredBarcodeRecord).find(Boolean) ?? null;
    const qrValue = barcodes
      .map((item) => item.rawValue ?? item.displayValue ?? item.value ?? "")
      .find(Boolean) ?? null;

    return {
      rawValue: qrValue,
      parsedCard: structuredCard ?? (qrValue ? parseQrPayloadToBusinessCard(qrValue) : null),
    };
  } catch {
    return { rawValue: null, parsedCard: null };
  }
}

export function hasDetectedQr(result: { rawValue: string | null; parsedCard: BusinessCardOcrResult | null }): boolean {
  return Boolean(result.rawValue || result.parsedCard);
}
