import assert from "node:assert/strict";
import { canTranslateBusinessCardToTurkish, translateBusinessCardToTurkishFallback } from "./businessCardTranslationService";

const source = {
  customerName: "VBH Kosovo LLC",
  contactNameAndSurname: "Fisnik Berisha",
  title: "Manager",
  address: "Business Park Drenas 1305 Bushat / Kosovo",
  countryName: "Kosovo",
  notes: "Language: en, Fax: +383123456",
  languageProfile: {
    dominantScript: "latin" as const,
    suggestedLocale: "en" as const,
    confidence: 0.92,
    recognizedLanguages: ["en"],
  },
};

assert.equal(canTranslateBusinessCardToTurkish(source), true, "english OCR result should be translatable");

const translated = translateBusinessCardToTurkishFallback(source);
assert.equal(translated.title, "Müdür", "title should be translated");
assert.equal(translated.countryName, "Kosova", "country should be translated");
assert.equal(translated.address, "İş parkı Drenas 1305 Bushat / Kosovo", "address terms should be localized");
assert.equal(translated.notes, "Dil: en, Faks: +383123456", "notes labels should be localized");
assert.ok(translated.translationMeta?.translated, "translation meta should mark the result translated");
assert.ok(translated.translationMeta?.changedFields.includes("title"), "changed fields should include title");

const alreadyTurkish = translateBusinessCardToTurkishFallback({
  title: "Satış Müdürü",
  languageProfile: {
    dominantScript: "latin",
    suggestedLocale: "tr",
    confidence: 0.98,
    recognizedLanguages: ["tr"],
  },
});
assert.equal(alreadyTurkish.translationMeta?.translated, false, "turkish OCR result should not be retranslated");

console.log("businessCardTranslationService test passed");
