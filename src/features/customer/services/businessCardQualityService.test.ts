import assert from "node:assert/strict";
import { assessBusinessCardOcrQuality, mergeReviewWithQualityAssessment } from "./businessCardQualityService";

const strongQuality = assessBusinessCardOcrQuality(
  "Sandra Lorido\nExport Manager\nStrong Bull Maquinaria S.L.\n+34981699140\nsandra@strongbull.es\nwww.strongbull.es",
  [
    "Sandra Lorido",
    "Export Manager",
    "Strong Bull Maquinaria S.L.",
    "+34981699140",
    "sandra@strongbull.es",
    "www.strongbull.es",
  ],
  [
    { blockIndex: 0, lineIndex: 0, text: "Sandra Lorido" },
    { blockIndex: 0, lineIndex: 1, text: "Export Manager" },
    { blockIndex: 0, lineIndex: 2, text: "Strong Bull Maquinaria S.L." },
  ]
);
assert.equal(strongQuality.flags.length, 0, "strong OCR should not produce quality flags");

const weakQuality = assessBusinessCardOcrQuality("xx 12", ["xx 12"], [{ blockIndex: 0, lineIndex: 0, text: "xx 12" }]);
assert.ok(weakQuality.flags.length >= 2, "weak OCR should produce multiple quality flags");

const merged = mergeReviewWithQualityAssessment({ overallConfidence: 80, fieldConfidence: {}, flags: [] }, weakQuality);
assert.ok((merged?.overallConfidence ?? 100) < 80, "quality penalty should lower overall confidence");

console.log("businessCardQualityService test passed");
