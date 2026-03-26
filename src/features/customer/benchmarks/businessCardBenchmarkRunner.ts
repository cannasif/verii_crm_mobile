import { buildBusinessCardCandidateHints } from "../services/businessCardHeuristics";
import {
  pickBestBusinessCardExtraction,
  toBusinessCardOcrResult,
  validateAndNormalizeBusinessCardExtraction,
} from "../schemas/businessCardSchema";
import { parseBusinessCardText } from "../utils/parseBusinessCardText";
import type { BusinessCardExtraction, BusinessCardOcrResult } from "../types/businessCard";
import { businessCardBenchmarkFixtures, type BusinessCardBenchmarkFixture } from "./businessCardBenchmarkFixtures";
import { businessCardRealOcrFixtures } from "./businessCardRealOcrFixtures";

function fallbackToStructuredInput(parsed: BusinessCardOcrResult) {
  return {
    contactNameAndSurname: parsed.contactNameAndSurname ?? null,
    name: parsed.contactNameAndSurname ?? parsed.customerName ?? null,
    title: parsed.title ?? null,
    company: parsed.customerName ?? null,
    phones: [parsed.phone1, parsed.phone2].filter(Boolean) as string[],
    emails: parsed.email ? [parsed.email] : [],
    website: parsed.website ?? null,
    address: parsed.address ?? null,
    addressParts: undefined,
    social: { linkedin: null, instagram: null, x: null, facebook: null },
    notes: parsed.notes ? [parsed.notes] : [],
  };
}

function getFieldValue(extraction: BusinessCardExtraction, field: BusinessCardBenchmarkFixture["criticalFields"][number]): string | null {
  switch (field) {
    case "phones[0]":
      return extraction.phones[0] ?? null;
    case "emails[0]":
      return extraction.emails[0] ?? null;
    default:
      return extraction[field] ?? null;
  }
}

function normalizeComparableWebsite(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/g, "").toLowerCase();
}

export type BusinessCardBenchmarkResult = {
  fixtureId: string;
  passed: boolean;
  fieldResults: Array<{ field: string; expected: string | null; actual: string | null; passed: boolean }>;
};

export function runBusinessCardBenchmark(): BusinessCardBenchmarkResult[] {
  return [...businessCardBenchmarkFixtures, ...businessCardRealOcrFixtures].map((fixture) => {
    const candidateHints = buildBusinessCardCandidateHints(fixture.rawText, fixture.rawLines);
    const regexFallback = validateAndNormalizeBusinessCardExtraction(
      fallbackToStructuredInput(parseBusinessCardText(fixture.rawText)),
      fixture.rawText,
      fixture.rawLines,
      candidateHints.addressLines,
      {
        preferredNameLines: candidateHints.layoutProfile.preferredNameLines,
        preferredTitleLines: candidateHints.layoutProfile.preferredTitleLines,
        preferredCompanyLines: candidateHints.layoutProfile.preferredCompanyLines,
      }
    );

    const expectedExtraction = validateAndNormalizeBusinessCardExtraction(
      {
        contactNameAndSurname: fixture.expected.contactNameAndSurname ?? null,
        name: fixture.expected.name ?? null,
        title: fixture.expected.title ?? null,
        company: fixture.expected.company ?? null,
        phones: fixture.expected.phones ?? [],
        emails: fixture.expected.emails ?? [],
        website: fixture.expected.website ?? null,
        address: fixture.expected.address ?? null,
        addressParts: fixture.expected.addressParts,
        social: fixture.expected.social ?? { linkedin: null, instagram: null, x: null, facebook: null },
        notes: fixture.expected.notes ?? [],
      },
      fixture.rawText,
      fixture.rawLines,
      candidateHints.addressLines,
      {
        preferredNameLines: candidateHints.layoutProfile.preferredNameLines,
        preferredTitleLines: candidateHints.layoutProfile.preferredTitleLines,
        preferredCompanyLines: candidateHints.layoutProfile.preferredCompanyLines,
      }
    );

    const actualExtraction = pickBestBusinessCardExtraction(regexFallback, regexFallback);
    const fieldResults = fixture.criticalFields.map((field) => {
      const expected = getFieldValue(expectedExtraction, field);
      const actual = getFieldValue(actualExtraction, field);
      const passed = field === "website"
        ? normalizeComparableWebsite(expected) === normalizeComparableWebsite(actual)
        : expected === actual;
      return {
        field,
        expected,
        actual,
        passed,
      };
    });

    return {
      fixtureId: fixture.id,
      passed: fieldResults.every((result) => result.passed),
      fieldResults,
    };
  });
}

export function summarizeBusinessCardBenchmark(results: BusinessCardBenchmarkResult[]): { passed: number; failed: number; total: number } {
  const passed = results.filter((result) => result.passed).length;
  return {
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}
