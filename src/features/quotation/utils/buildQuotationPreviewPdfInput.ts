import type { Branch } from "../../auth/types";
import { resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
import type {
  PreviewPdfFooterDetailBlock,
  PreviewPdfLineDetailLabels,
  PreviewPdfLineDetailMaps,
} from "../../../lib/salesDocumentPreviewPdf";
import type { QuotationLineFormState } from "../types";
import { flattenQuotationLinesForPdf } from "./flattenQuotationLinesForPdf";
import {
  QUOTATION_PREVIEW_PDF_LABELS_TR,
  type QuotationPreviewPdfInput,
} from "./quotationPreviewPdf.types";

export interface BuildQuotationPreviewPdfInputParams {
  offerDate?: string | null;
  offerNo?: string | null;
  customerName: string;
  branch?: Branch | null;
  currency?: string | null;
  currencyCode?: string | null;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
  draft?: boolean;
  lines: QuotationLineFormState[];
  locale?: string;
  footerDetails?: PreviewPdfFooterDetailBlock[];
  lineDetailLabels?: PreviewPdfLineDetailLabels;
  lineDetailMaps?: PreviewPdfLineDetailMaps;
}

export function buildQuotationPreviewPdfInput(
  params: BuildQuotationPreviewPdfInputParams
): QuotationPreviewPdfInput {
  const branchName = params.branch?.name?.trim() || QUOTATION_PREVIEW_PDF_LABELS_TR.notSpecified;
  const branchCode = params.branch?.code?.trim() || params.branch?.id?.trim() || null;
  const currencyCode =
    params.currencyCode?.trim() ||
    resolveCurrencyIsoCode(params.currency ?? "TRY");

  return {
    offerDate: params.offerDate ?? null,
    offerNo: params.offerNo ?? null,
    customerName: params.customerName?.trim() || QUOTATION_PREVIEW_PDF_LABELS_TR.notSpecified,
    branchName,
    branchCode,
    currencyCode,
    locale: params.locale ?? "tr-TR",
    generalDiscountRate: params.generalDiscountRate ?? null,
    generalDiscountAmount: params.generalDiscountAmount ?? null,
    draft: params.draft ?? false,
    lines: flattenQuotationLinesForPdf(params.lines),
    labels: QUOTATION_PREVIEW_PDF_LABELS_TR,
    footerDetails: params.footerDetails,
    lineDetailLabels: params.lineDetailLabels,
    lineDetailMaps: params.lineDetailMaps,
  };
}
