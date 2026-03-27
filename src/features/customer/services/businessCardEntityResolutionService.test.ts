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
assert.ok(filters.some((filter) => filter.column === "Name" && filter.value === "trade"), "company tokens should be added as filters");
assert.ok(filters.some((filter) => filter.column === "Website" && filter.value === "tradelines"), "website stem should be added as filter");

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
  {
    id: 3,
    name: "Trade Lines Dis Ticaret Ltd. Sti.",
    email: "sales@tradelines.com.tr",
    phone: "+90 216 499 99 59",
    website: "https://tradelines.com.tr",
  },
] as any);

assert.equal(matches[0]?.customer.id, 1, "best match should be the same customer");
assert.ok(matches[0]?.score >= 90, "strong duplicate should score high");
assert.equal(matches[1]?.customer.id, 3, "normalized company and domain similarity should rank related customer next");
assert.ok(matches[1]?.reasons.some((reason) => reason.includes("normalize") || reason.includes("token") || reason.includes("Website")), "secondary match should explain fuzzy similarity");

console.log("businessCardEntityResolutionService test passed");
