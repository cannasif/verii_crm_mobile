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
  { blockIndex: 0, lineIndex: 0, text: "WINAX", frame: { top: 10, left: 20, width: 120, height: 20 }, recognizedLanguages: ["tr"] },
  { blockIndex: 1, lineIndex: 0, text: "Tarik Hoskan", frame: { top: 55, left: 20, width: 140, height: 20 }, recognizedLanguages: ["tr"] },
  { blockIndex: 1, lineIndex: 1, text: "Export Area Manager", frame: { top: 82, left: 20, width: 180, height: 20 }, recognizedLanguages: ["en"] },
  { blockIndex: 2, lineIndex: 0, text: "Eren PVC Kapi ve Pencere Aks. San. Dis Tic. Ltd. Sti.", frame: { top: 118, left: 20, width: 280, height: 24 }, recognizedLanguages: ["tr"] },
  { blockIndex: 3, lineIndex: 0, text: "+90 530 955 04 31", frame: { top: 186, left: 20, width: 150, height: 18 }, recognizedLanguages: ["tr"] },
  { blockIndex: 3, lineIndex: 1, text: "web: www.winax.com", frame: { top: 210, left: 20, width: 170, height: 18 }, recognizedLanguages: ["en"] },
  { blockIndex: 4, lineIndex: 0, text: "Orhan Gazi Mah. Isiso San. Sit. 14. Yol Sok. U-1 Blok No:10-12 Esenyurt / Istanbul", frame: { top: 240, left: 20, width: 320, height: 30 }, recognizedLanguages: ["tr"] },
]);

assert.ok(candidateHints.layoutProfile.orderedLines.length >= 6, "layout profile should keep OCR order");
assert.equal(candidateHints.layoutProfile.orderedLines[0], "WINAX", "geometry ordering should keep top-most line first");
assert.ok(candidateHints.layoutProfile.preferredCompanyLines.includes("WINAX"), "top zone should prioritize company-like lines");
assert.ok(candidateHints.layoutProfile.preferredNameLines.includes("Tarik Hoskan"), "middle zone should prioritize person name lines");
assert.ok(candidateHints.layoutProfile.preferredTitleLines.includes("Export Area Manager"), "middle zone should prioritize title lines");
assert.ok(
  candidateHints.layoutProfile.contactClusterLines.some((line) => line.includes("www.winax.com")),
  "bottom zone should keep contact cluster lines"
);

console.log("businessCardHeuristics layout test passed");
