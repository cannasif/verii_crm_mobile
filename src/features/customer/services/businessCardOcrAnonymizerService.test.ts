import assert from "node:assert/strict";
import { anonymizeBusinessCardOcr } from "./businessCardOcrAnonymizerService";

const sample = anonymizeBusinessCardOcr({
  id: "anon-sample",
  locale: "tr",
  rawText: [
    "Volkan SAĞLIK",
    "Deputy General Manager",
    "+90 533 158 00 40",
    "v.saglik@windoform.com.tr",
    "www.windoform.com",
    "35870 Torbalı / İzmir",
  ].join("\n"),
});

assert.match(sample.rawText, /PHONE_1/, "phone should be anonymized");
assert.match(sample.rawText, /EMAIL_1/, "email should be anonymized");
assert.match(sample.rawText, /URL_1/, "url should be anonymized");
assert.match(sample.rawText, /POSTAL_1/, "postal code should be anonymized");
assert.equal(Object.keys(sample.replacementMap).length >= 4, true, "replacement map should contain anonymized values");

console.log("businessCardOcrAnonymizerService test passed");
