import { createV3riiSalesDocumentPreviewPdf } from "../../../lib/salesDocumentPreviewPdf";
import type { QuotationPreviewPdfInput } from "./quotationPreviewPdf.types";

export async function createV3riiQuotationPreviewPdf(
  input: QuotationPreviewPdfInput
): Promise<string> {
  return createV3riiSalesDocumentPreviewPdf(input);
}
