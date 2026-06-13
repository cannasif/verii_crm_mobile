import type { TFunction } from "i18next";
import type { Branch } from "../../auth/types";
import { resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
import type { SalesDocumentPreviewPdfInput } from "../../../lib/salesDocumentPreviewPdf";
import type { OrderLineFormState } from "../types";
import { buildOrderPreviewPdfLabels } from "./buildOrderPreviewPdfLabels";
import { flattenOrderLinesForPdf } from "./flattenOrderLinesForPdf";

export interface BuildOrderPreviewPdfInputParams {
  offerDate?: string | null;
  offerNo?: string | null;
  customerName: string;
  branch?: Branch | null;
  currency?: string | null;
  currencyCode?: string | null;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
  draft?: boolean;
  lines: OrderLineFormState[];
  locale?: string;
  t: TFunction;
}

export function buildOrderPreviewPdfInput(
  params: BuildOrderPreviewPdfInputParams
): SalesDocumentPreviewPdfInput {
  const labels = buildOrderPreviewPdfLabels(params.t);
  const branchName = params.branch?.name?.trim() || labels.notSpecified;
  const branchCode = params.branch?.code?.trim() || params.branch?.id?.trim() || null;
  const currencyCode =
    params.currencyCode?.trim() ||
    resolveCurrencyIsoCode(params.currency ?? "TRY");

  return {
    offerDate: params.offerDate ?? null,
    offerNo: params.offerNo ?? null,
    customerName: params.customerName?.trim() || labels.notSpecified,
    branchName,
    branchCode,
    currencyCode,
    locale: params.locale ?? "tr-TR",
    generalDiscountRate: params.generalDiscountRate ?? null,
    generalDiscountAmount: params.generalDiscountAmount ?? null,
    draft: params.draft ?? false,
    lines: flattenOrderLinesForPdf(params.lines),
    labels,
  };
}
