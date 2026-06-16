import { groupPreviewPdfLineDetailRowGroups } from "./previewPdfLineDetails";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const groups = groupPreviewPdfLineDetailRowGroups([
  { label: "Profil", value: "Kısa" },
  { label: "Demir", value: "D1" },
  { label: "Vida", value: "V1" },
  { label: "Açıklama", value: "Bu çok daha uzun bir açıklama metnidir" },
  { label: "Baskı", value: "B1" },
]);

assert(groups.length === 3, "expected short buffer flush, one long group, and trailing short row");
assert(groups[0].length === 3, "first group should contain three short rows");
assert(groups[1].length === 1, "long row should be isolated");
assert(groups[2].length === 1, "trailing short row should flush separately");

console.log("previewPdfLineDetails.test.ts passed");
