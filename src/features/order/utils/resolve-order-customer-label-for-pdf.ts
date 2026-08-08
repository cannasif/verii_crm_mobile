import { customerApi } from "../../customer/api/customerApi";
import { buildOrderPreviewPdfLabels } from "./buildOrderPreviewPdfLabels";
import type { TFunction } from "i18next";

export interface ResolveOrderCustomerLabelParams {
  potentialCustomerId?: number | null;
  potentialCustomerName?: string | null;
  erpCustomerCode?: string | null;
  selectedCustomerName?: string | null;
  fetchFromApi?: boolean;
  t: TFunction;
}

export async function resolveOrderCustomerLabelForPdf(
  params: ResolveOrderCustomerLabelParams
): Promise<string> {
  const notSpecified = buildOrderPreviewPdfLabels(params.t).notSpecified;
  const selected = params.selectedCustomerName?.trim();
  if (selected) return selected;

  if (params.fetchFromApi !== false && params.potentialCustomerId != null && params.potentialCustomerId > 0) {
    try {
      const customer = await customerApi.getById(params.potentialCustomerId);
      const apiName = customer.name?.trim();
      if (apiName) return apiName;
    } catch {
      // fall through
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
