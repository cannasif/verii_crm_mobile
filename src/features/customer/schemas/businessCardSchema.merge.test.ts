import assert from "node:assert/strict";
import {
  mergeBusinessCardExtractions,
  pickBestBusinessCardExtraction,
} from "./businessCardSchema";
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

const sparseLlm: BusinessCardExtraction = {
  contactNameAndSurname: null,
  name: null,
  title: null,
  company: "Trade Lines",
  phones: [],
  emails: ["melisa@tradelines.com.tr"],
  website: null,
  address: null,
  addressParts: { ...emptyAddressParts },
  social: { ...emptySocial },
  notes: [],
};

const regexFallback: BusinessCardExtraction = {
  contactNameAndSurname: "Melisa Tataroğlu",
  name: "Melisa Tataroğlu",
  title: "Sales & Marketing",
  company: "Trade Lines",
  phones: ["+905385945993", "+902164999959"],
  emails: ["melisa@tradelines.com.tr"],
  website: "www.tradelines.com.tr",
  address: "Caferağa Mah. Moda Cad. No:30/4, 34710, Kadıköy/İstanbul",
  addressParts: {
    ...emptyAddressParts,
    neighborhood: "Caferağa Mah.",
    avenue: "Moda Cad.",
    buildingNo: "No:30/4",
    postalCode: "34710",
    district: "Kadıköy",
    province: "İstanbul",
    country: "Türkiye",
  },
  social: { ...emptySocial },
  notes: ["Dahili: 104"],
};

const merged = mergeBusinessCardExtractions(sparseLlm, regexFallback);
assert.equal(merged.company, "Trade Lines");
assert.equal(merged.name, "Melisa Tataroğlu");
assert.equal(merged.title, "Sales & Marketing");
assert.equal(merged.website, "www.tradelines.com.tr");
assert.equal(merged.phones[0], "+905385945993");
assert.equal(merged.addressParts.district, "Kadıköy");

const best = pickBestBusinessCardExtraction(sparseLlm, regexFallback);
assert.equal(best.name, "Melisa Tataroğlu");
assert.equal(best.company, "Trade Lines");
assert.equal(best.website, "www.tradelines.com.tr");
assert.equal(best.addressParts.province, "İstanbul");

console.log("businessCardSchema merge regression test passed");
