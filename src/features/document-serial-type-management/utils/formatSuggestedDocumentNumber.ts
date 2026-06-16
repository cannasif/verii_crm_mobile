import type { DocumentSerialTypeDto } from "../types";

export function formatSuggestedDocumentNumber(serialType: DocumentSerialTypeDto): string {
  const prefix = serialType.serialPrefix?.trim() ?? "";
  const current = serialType.serialCurrent ?? serialType.serialStart ?? 0;
  const increment = serialType.serialIncrement ?? 1;
  const counterPadLength = Math.max(1, serialType.serialLength ?? 1);
  const nextValue = current + increment;
  const year = new Date().getFullYear();
  const paddedCounter = String(nextValue).padStart(counterPadLength, "0");
  return `${prefix}${year}${paddedCounter}`;
}
