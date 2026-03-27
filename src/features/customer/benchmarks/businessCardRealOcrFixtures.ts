import type { BusinessCardBenchmarkFixture } from "./businessCardBenchmarkFixtures";
import { createAnonymizedBusinessCardFixture } from "../services/businessCardOcrAnonymizerService";

// Real device OCR fixtures can be appended here without touching the synthetic regression set.
export const businessCardRealOcrFixtures: BusinessCardBenchmarkFixture[] = [
  createAnonymizedBusinessCardFixture({
    id: "real-ocr-template-tr",
    locale: "tr",
    rawText: [
      "PERSON NAME",
      "SATIŞ MÜDÜRÜ",
      "+90 5XX XXX XX XX",
      "person@example.com",
      "www.example.com",
      "Example Mah. Demo Cad. No: 10",
    ].join("\n"),
  }),
];
