import assert from "node:assert/strict";
import { preprocessBusinessCardOcr } from "./businessCardOcrPreprocessService";

const result = preprocessBusinessCardOcr({
  rawText: `BAYGÜN HIRDAVAT İNŞAAT A.Ş.
Şeref AYVA
seref@baygunhirdavat.com 0535 248 61 11
Merkez: Ostim OSB Mahallesi 1161/1 Cadde No: 26/A Yenimahalle / ANKARA Tel: 0312 346 41 41 Fax: 0312 346 41 46
|||||
www.baygunhirdavat.com`,
  lines: [
    "BAYGÜN HIRDAVAT İNŞAAT A.Ş.",
    "Şeref AYVA",
    "seref@baygunhirdavat.com 0535 248 61 11",
    "Merkez: Ostim OSB Mahallesi 1161/1 Cadde No: 26/A Yenimahalle / ANKARA Tel: 0312 346 41 41 Fax: 0312 346 41 46",
    "|||||",
    "www.baygunhirdavat.com",
  ],
  lineItems: [],
  recognizedLanguages: ["tr"],
});

assert.ok(result.lines.includes("BAYGÜN HIRDAVAT İNŞAAT A.Ş."));
assert.ok(result.lines.includes("Şeref AYVA"));
assert.ok(result.lines.includes("seref@baygunhirdavat.com 0535 248 61 11"));
assert.ok(result.lines.includes("Merkez: Ostim OSB Mahallesi 1161/1 Cadde No: 26/A Yenimahalle / ANKARA"));
assert.ok(result.lines.includes("Tel: 0312 346 41 41"));
assert.ok(result.lines.includes("Fax: 0312 346 41 46"));
assert.ok(!result.lines.includes("|||||"));
assert.equal(result.recognizedLanguages[0], "tr");
console.log("businessCardOcrPreprocessService test passed");

