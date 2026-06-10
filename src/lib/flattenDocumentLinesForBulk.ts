export interface DocumentLineWithRelations {
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean | null;
  relatedLines?: DocumentLineWithRelations[] | null;
}

export function flattenDocumentLinesForBulk<T extends DocumentLineWithRelations>(
  lines: T[]
): T[] {
  const result: T[] = [];
  for (const line of lines) {
    if (line.relatedProductKey && line.isMainRelatedProduct !== true) {
      continue;
    }
    result.push(line);
    if (line.relatedLines?.length) {
      for (const relatedLine of line.relatedLines) {
        result.push(relatedLine as T);
      }
    }
  }
  return result;
}
