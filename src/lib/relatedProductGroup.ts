export interface RelatedProductGroupLine {
  id: string;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean | null;
}

export function getValidRelatedProductGroup<TLine extends RelatedProductGroupLine>(
  lines: TLine[],
  line?: TLine | null
): TLine[] {
  const relatedProductKey = line?.relatedProductKey?.trim();
  if (!relatedProductKey) return [];

  const sameGroupLines = lines.filter((item) => item.relatedProductKey?.trim() === relatedProductKey);
  const hasMainLine = sameGroupLines.some((item) => item.isMainRelatedProduct === true);
  const hasRelatedLine = sameGroupLines.some((item) => item.isMainRelatedProduct !== true);

  return sameGroupLines.length > 1 && hasMainLine && hasRelatedLine ? sameGroupLines : [];
}
