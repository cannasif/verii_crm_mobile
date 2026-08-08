import { customerApi } from "../../customer/api/customerApi";
import { QUOTATION_PREVIEW_PDF_LABELS_TR } from "./quotationPreviewPdf.types";

export interface ResolveQuotationCustomerLabelParams {
  potentialCustomerId?: number | null;
  potentialCustomerName?: string | null;
  erpCustomerCode?: string | null;
  selectedCustomerName?: string | null;
  fetchFromApi?: boolean;
}

export async function resolveQuotationCustomerLabelForPdf(
  params: ResolveQuotationCustomerLabelParams
): Promise<string> {
  const notSpecified = QUOTATION_PREVIEW_PDF_LABELS_TR.notSpecified;
  const selected = params.selectedCustomerName?.trim();
  if (selected) return selected;

  if (params.fetchFromApi !== false && params.potentialCustomerId != null && params.potentialCustomerId > 0) {
    try {
      const customer = await customerApi.getById(params.potentialCustomerId);
      const apiName = customer.name?.trim();
      if (apiName) return apiName;
    } catch {
      // fall through to other sources
    }
  }

  const apiName = params.potentialCustomerName?.trim();
  if (apiName) {
    const erpMatch = apiName.match(/^ERP:\s*[^-]+-\s*(.+)$/i);
    if (erpMatch?.[1]?.trim()) return erpMatch[1].trim();
    return apiName;
  }

  if (params.erpCustomerCode?.trim()) {
    return params.erpCustomerCode.trim();
  }

  return notSpecified;
}
