import assert from "node:assert/strict";
import { buildBusinessCardImageQualityAssessment } from "./businessCardImageQualityRules";

const assessment = buildBusinessCardImageQualityAssessment({
  width: 600,
  height: 420,
  fileSizeBytes: 80 * 1024,
  usedScanner: false,
});

assert.equal(assessment.shouldWarn, true);
assert.ok(assessment.score < 72);
assert.ok(assessment.flags.some((flag) => flag.reasonKey === "customer.ocrImageQualityLowResolution"));
assert.ok(assessment.flags.some((flag) => flag.reasonKey === "customer.ocrImageQualityLowFileSize"));
assert.ok(assessment.flags.some((flag) => flag.reasonKey === "customer.ocrImageQualityNoScanner"));

console.log("businessCardImageQualityService test passed");
