import assert from "node:assert/strict";
import { buildBusinessCardPotentialMatchFilters, scoreBusinessCardPotentialMatches } from "./businessCardEntityResolutionService";

const result = {
  customerName: "Trade Lines",
  email: "melisa@tradelines.com.tr",
  phone1: "+905385945993",
  website: "www.tradelines.com.tr",
};

const filters = buildBusinessCardPotentialMatchFilters(result);
assert.ok(filters.length >= 4, "filters should be created from OCR fields");

const matches = scoreBusinessCardPotentialMatches(result, [
  {
    id: 1,
    name: "Trade Lines",
    email: "melisa@tradelines.com.tr",
    phone: "+90 538 594 59 93",
    phone2: "+90 216 499 99 59",
    website: "www.tradelines.com.tr",
  },
  {
    id: 2,
    name: "Another Company",
    email: "info@another.com",
    phone: "+90 555 000 00 00",
    website: "www.another.com",
  },
] as any);

assert.equal(matches[0]?.customer.id, 1, "best match should be the same customer");
assert.ok(matches[0]?.score >= 90, "strong duplicate should score high");

console.log("businessCardEntityResolutionService test passed");
