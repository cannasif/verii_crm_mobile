import type { OcrLineItem, OcrResultPayload } from "./ocrService";

export type BusinessCardOcrVariant = {
  key: "primary" | "leftMajor" | "bottomUp";
  payload: OcrResultPayload;
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean)));
}

function rebuildPayload(base: OcrResultPayload, lineItems: OcrLineItem[]): OcrResultPayload {
  const lines = uniqueStrings(lineItems.map((item) => item.text));
  return {
    rawText: lines.join("\n"),
    lines,
    lineItems,
    recognizedLanguages: base.recognizedLanguages,
  };
}

export function buildBusinessCardOcrVariants(base: OcrResultPayload): BusinessCardOcrVariant[] {
  const variants: BusinessCardOcrVariant[] = [{ key: "primary", payload: base }];
  if (!base.lineItems.length || !base.lineItems.some((item) => item.frame)) {
    return variants;
  }

  const withFrames = [...base.lineItems];

  const leftMajor = rebuildPayload(
    base,
    [...withFrames].sort((left, right) => {
      const leftDelta = (left.frame?.left ?? Number.MAX_SAFE_INTEGER) - (right.frame?.left ?? Number.MAX_SAFE_INTEGER);
      if (leftDelta !== 0) return leftDelta;
      const topDelta = (left.frame?.top ?? Number.MAX_SAFE_INTEGER) - (right.frame?.top ?? Number.MAX_SAFE_INTEGER);
      if (topDelta !== 0) return topDelta;
      return left.blockIndex - right.blockIndex || left.lineIndex - right.lineIndex;
    })
  );

  const bottomUp = rebuildPayload(
    base,
    [...withFrames].sort((left, right) => {
      const topDelta = (right.frame?.top ?? Number.MIN_SAFE_INTEGER) - (left.frame?.top ?? Number.MIN_SAFE_INTEGER);
      if (topDelta !== 0) return topDelta;
      const leftDelta = (left.frame?.left ?? Number.MAX_SAFE_INTEGER) - (right.frame?.left ?? Number.MAX_SAFE_INTEGER);
      if (leftDelta !== 0) return leftDelta;
      return left.blockIndex - right.blockIndex || left.lineIndex - right.lineIndex;
    })
  );

  if (leftMajor.rawText && leftMajor.rawText !== base.rawText) {
    variants.push({ key: "leftMajor", payload: leftMajor });
  }
  if (bottomUp.rawText && bottomUp.rawText !== base.rawText && bottomUp.rawText !== leftMajor.rawText) {
    variants.push({ key: "bottomUp", payload: bottomUp });
  }

  return variants;
}

