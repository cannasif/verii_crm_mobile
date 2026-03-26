import assert from "node:assert/strict";
import { buildBusinessCardCandidateHints } from "./businessCardHeuristics";

const rawText = [
  "WINAX",
  "Tarik Hoskan",
  "Export Area Manager",
  "Eren PVC Kapi ve Pencere Aks. San. Dis Tic. Ltd. Sti.",
  "+90 530 955 04 31",
  "web: www.winax.com",
  "Orhan Gazi Mah. Isiso San. Sit. 14. Yol Sok. U-1 Blok No:10-12 Esenyurt / Istanbul",
].join("\n");

const candidateHints = buildBusinessCardCandidateHints(rawText, undefined, [
  { blockIndex: 0, lineIndex: 0, text: "WINAX" },
  { blockIndex: 1, lineIndex: 0, text: "Tarik Hoskan" },
  { blockIndex: 1, lineIndex: 1, text: "Export Area Manager" },
  { blockIndex: 2, lineIndex: 0, text: "Eren PVC Kapi ve Pencere Aks. San. Dis Tic. Ltd. Sti." },
  { blockIndex: 3, lineIndex: 0, text: "+90 530 955 04 31" },
  { blockIndex: 3, lineIndex: 1, text: "web: www.winax.com" },
  { blockIndex: 4, lineIndex: 0, text: "Orhan Gazi Mah. Isiso San. Sit. 14. Yol Sok. U-1 Blok No:10-12 Esenyurt / Istanbul" },
]);

assert.ok(candidateHints.layoutProfile.orderedLines.length >= 6, "layout profile should keep OCR order");
assert.ok(candidateHints.layoutProfile.preferredCompanyLines.includes("WINAX"), "top zone should prioritize company-like lines");
assert.ok(candidateHints.layoutProfile.preferredNameLines.includes("Tarik Hoskan"), "middle zone should prioritize person name lines");
assert.ok(candidateHints.layoutProfile.preferredTitleLines.includes("Export Area Manager"), "middle zone should prioritize title lines");
assert.ok(
  candidateHints.layoutProfile.contactClusterLines.some((line) => line.includes("www.winax.com")),
  "bottom zone should keep contact cluster lines"
);

console.log("businessCardHeuristics layout test passed");
