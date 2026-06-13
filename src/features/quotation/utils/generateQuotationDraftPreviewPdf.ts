import { resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
import type { Branch } from "../../auth/types/index";
import { quotationApi } from "../api/quotationApi";
import type { QuotationGetDto } from "../types";
import { buildQuotationPreviewPdfInput } from "./buildQuotationPreviewPdfInput";
import { createV3riiQuotationPreviewPdf } from "./createV3riiQuotationPreviewPdf";
import { mapDetailLinesToFormState } from "./quotationDetailMappers";
import { resolveQuotationCustomerLabelForPdf } from "./resolveQuotationCustomerLabelForPdf";

function resolveLocale(language: string): string {
  if (language.startsWith("tr")) return "tr-TR";
  if (language.startsWith("de")) return "de-DE";
  return "en-US";
}

export async function generateQuotationDraftPreviewPdf(
  quotation: QuotationGetDto,
  branch: Branch | null,
  language: string
): Promise<string> {
  const [header, lineDetails] = await Promise.all([
    quotationApi.getById(quotation.id),
    quotationApi.getLinesByQuotation(quotation.id),
  ]);

  const formLines = mapDetailLinesToFormState(lineDetails);
  if (formLines.length === 0) {
    throw new Error("QUOTATION_PDF_NO_LINES");
  }

  const customerName = await resolveQuotationCustomerLabelForPdf({
    potentialCustomerId: header.potentialCustomerId ?? quotation.potentialCustomerId,
    potentialCustomerName: header.potentialCustomerName ?? quotation.potentialCustomerName,
    erpCustomerCode: header.erpCustomerCode ?? quotation.erpCustomerCode,
    selectedCustomerName: quotation.potentialCustomerName,
  });

  const headerRecord = header as unknown as Record<string, unknown>;
  const generalDiscountRate =
    (headerRecord.generalDiscountRate as number | null | undefined) ?? null;
  const generalDiscountAmount =
    (headerRecord.generalDiscountAmount as number | null | undefined) ?? null;

  const input = buildQuotationPreviewPdfInput({
    offerDate: header.offerDate ?? quotation.offerDate,
    offerNo: header.offerNo ?? quotation.offerNo,
    customerName,
    branch,
    currency: header.currency ?? quotation.currency,
    currencyCode: resolveCurrencyIsoCode(
      header.currency ?? quotation.currencyCode ?? quotation.currency
    ),
    generalDiscountRate,
    generalDiscountAmount,
    draft: true,
    lines: formLines,
    locale: resolveLocale(language),
  });

  return createV3riiQuotationPreviewPdf(input);
}

export function buildQuotationPdfFileName(quotation: QuotationGetDto): string {
  const offerPart = (quotation.offerNo ?? `teklif-${quotation.id}`)
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 48);
  return `teklif-${offerPart}-${quotation.id}.pdf`;
}
