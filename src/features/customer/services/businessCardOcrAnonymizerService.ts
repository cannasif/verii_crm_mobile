import type { BusinessCardBenchmarkFixture } from "../benchmarks/businessCardBenchmarkFixtures";

type CreateAnonymizedFixtureInput = {
  id: string;
  locale: BusinessCardBenchmarkFixture["locale"];
  rawText: string;
  rawLines?: string[];
};

type BusinessCardOcrAnonymizationResult = {
  rawText: string;
  rawLines: string[];
  replacementMap: Record<string, string>;
};

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_REGEX = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?\b/gi;
const PHONE_REGEX = /(?:\+\d[\d\s()./-]{6,}\d|\b00\d[\d\s()./-]{6,}\d|\b0\d[\d\s()./-]{7,}\d)\b/g;
const POSTAL_CODE_REGEX = /\b\d{4,6}\b/g;

function normalizeLines(rawText: string, rawLines?: string[]): string[] {
  const source = rawLines?.length ? rawLines : rawText.split(/\r?\n/);
  return source.map((line) => line.trim()).filter(Boolean);
}

function anonymizeValue(
  input: string,
  regex: RegExp,
  label: string,
  replacementMap: Record<string, string>
): string {
  let counter = 0;
  return input.replace(regex, (value) => {
    const existing = replacementMap[value];
    if (existing) return existing;
    counter += 1;
    const token = `${label}_${counter}`;
    replacementMap[value] = token;
    return token;
  });
}

export function anonymizeBusinessCardOcr(input: CreateAnonymizedFixtureInput): BusinessCardOcrAnonymizationResult {
  const replacementMap: Record<string, string> = {};
  const lines = normalizeLines(input.rawText, input.rawLines);

  const anonymizedLines = lines.map((line) => {
    let next = line;
    next = anonymizeValue(next, EMAIL_REGEX, "EMAIL", replacementMap);
    next = anonymizeValue(next, URL_REGEX, "URL", replacementMap);
    next = anonymizeValue(next, PHONE_REGEX, "PHONE", replacementMap);
    next = anonymizeValue(next, POSTAL_CODE_REGEX, "POSTAL", replacementMap);
    return next;
  });

  return {
    rawText: anonymizedLines.join("\n"),
    rawLines: anonymizedLines,
    replacementMap,
  };
}

export function createAnonymizedBusinessCardFixture(
  input: CreateAnonymizedFixtureInput
): BusinessCardBenchmarkFixture {
  const anonymized = anonymizeBusinessCardOcr(input);

  return {
    id: input.id,
    locale: input.locale,
    rawText: anonymized.rawText,
    rawLines: anonymized.rawLines,
    expected: {
      company: null,
      name: null,
      title: null,
      phones: [],
      emails: [],
      website: null,
      address: null,
      addressParts: {
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
      },
      social: {
        linkedin: null,
        instagram: null,
        x: null,
        facebook: null,
      },
      notes: [],
      contactNameAndSurname: null,
    },
    criticalFields: [],
  };
}
