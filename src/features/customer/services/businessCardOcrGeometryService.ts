import type { OcrLineItem } from "./ocrService";

function lineAngleDegrees(item: OcrLineItem): number | null {
  const points = item.cornerPoints;
  if (!points || points.length < 2) return null;
  const first = points[0];
  const second = points[1];
  if (!first || !second) return null;
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  if (dx === 0) return 90;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

export function estimateBusinessCardRotation(lineItems: OcrLineItem[]): number | null {
  const angles = lineItems
    .map((item) => lineAngleDegrees(item))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!angles.length) return null;
  return Number((angles.reduce((sum, value) => sum + value, 0) / angles.length).toFixed(2));
}

