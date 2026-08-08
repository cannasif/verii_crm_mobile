import {
  createV3riiSalesDocumentPreviewPdf,
  type SalesDocumentPreviewPdfInput,
} from "../../../lib/salesDocumentPreviewPdf";

export async function createV3riiOrderPreviewPdf(
  input: SalesDocumentPreviewPdfInput
): Promise<string> {
  return createV3riiSalesDocumentPreviewPdf(input);
}
