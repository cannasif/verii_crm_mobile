import type { QuotationLineFormState } from "../types";
import type { QuotationPreviewPdfLineInput } from "./quotationPreviewPdf.types";

function mapLine(line: QuotationLineFormState): QuotationPreviewPdfLineInput {
  return {
    productCode: line.productCode || null,
    productName: line.productName || "",
    unit: line.unit ?? null,
    quantity: line.quantity ?? 0,
    unitPrice: line.unitPrice ?? 0,
    discountRate1: line.discountRate1 ?? 0,
    discountRate2: line.discountRate2 ?? 0,
    discountRate3: line.discountRate3 ?? 0,
    discountAmount1: line.discountAmount1 ?? 0,
    discountAmount2: line.discountAmount2 ?? 0,
    discountAmount3: line.discountAmount3 ?? 0,
    vatRate: line.vatRate ?? 0,
    vatAmount: line.vatAmount ?? 0,
    lineTotal: line.lineTotal ?? 0,
    imagePath: line.imagePath ?? line.pendingImageUri ?? null,
  };
}

export function flattenQuotationLinesForPdf(
  lines: QuotationLineFormState[]
): QuotationPreviewPdfLineInput[] {
  const result: QuotationPreviewPdfLineInput[] = [];

  for (const line of lines) {
    result.push(mapLine(line));
    if (line.relatedLines?.length) {
      for (const related of line.relatedLines) {
        result.push(mapLine(related));
      }
    }
  }

  return result;
}
