import assert from "node:assert/strict";
import { toBusinessCardOcrResult } from "./businessCardSchema";
import type { BusinessCardExtraction } from "../types/businessCard";

const emptySocial = {
  linkedin: null,
  instagram: null,
  x: null,
  facebook: null,
} as const;

const emptyAddressParts = {
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
} as const;

const strongExtraction: BusinessCardExtraction = {
  contactNameAndSurname: "Melisa Tataroğlu",
  name: "Melisa Tataroğlu",
  title: "Sales & Marketing",
  company: "Trade Lines",
  phones: ["+905385945993"],
  emails: ["melisa@tradelines.com.tr"],
  website: "www.tradelines.com.tr",
  address: "Caferağa Mah. Moda Cad. No:30/4, 34710, Kadıköy/İstanbul",
  addressParts: {
    ...emptyAddressParts,
    district: "Kadıköy",
    province: "İstanbul",
    country: "Türkiye",
  },
  social: { ...emptySocial },
  notes: [],
};

const sparseExtraction: BusinessCardExtraction = {
  contactNameAndSurname: null,
  name: null,
  title: null,
  company: null,
  phones: [],
  emails: [],
  website: null,
  address: null,
  addressParts: { ...emptyAddressParts },
  social: { ...emptySocial },
  notes: [],
};

const strongResult = toBusinessCardOcrResult(strongExtraction);
assert.ok((strongResult.review?.overallConfidence ?? 0) >= 75, "strong extraction should have higher confidence");
assert.equal(strongResult.review?.flags.some((flag) => flag.severity === "high"), false, "strong extraction should not contain high severity flags");

const sparseResult = toBusinessCardOcrResult(sparseExtraction);
assert.ok((sparseResult.review?.overallConfidence ?? 100) <= 30, "sparse extraction should have lower confidence");
assert.ok((sparseResult.review?.flags.length ?? 0) >= 3, "sparse extraction should produce review flags");

console.log("businessCardSchema review test passed");
