import { resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
import { buildSalesDocumentPreviewPdfExtras } from "../../../lib/salesDocumentPreviewPdf";
import { fetchWindoLineDetailMapsForPdf } from "../../windo-profil-demir-vida";
import type { Branch } from "../../auth/types/index";
import { quotationApi } from "../api/quotationApi";
import type { QuotationGetDto } from "../types";
import { buildQuotationPreviewPdfInput } from "./buildQuotationPreviewPdfInput";
import { createV3riiQuotationPreviewPdf } from "./createV3riiQuotationPreviewPdf";
import { mapDetailLinesToFormState } from "./quotationDetailMappers";
import { mapApiLinesToLocalizedFormState } from "../../stocks/utils";
import { resolveQuotationCustomerLabelForPdf } from "./resolveQuotationCustomerLabelForPdf";
import i18n from "../../../locales";

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

  const formLines = await mapApiLinesToLocalizedFormState(
    lineDetails,
    mapDetailLinesToFormState,
    language
  );
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

  const lineDetailMaps = await fetchWindoLineDetailMapsForPdf();
  const pdfExtras = buildSalesDocumentPreviewPdfExtras({
    t: i18n.t.bind(i18n),
    koliBaskiDefinitionId: header.koliBaskiDefinitionId ?? quotation.koliBaskiDefinitionId,
    koliBaskiDefinitionName: header.koliBaskiDefinitionName ?? quotation.koliBaskiDefinitionName,
    description: header.description ?? quotation.description,
    lineDetailMaps,
  });

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
    footerDetails: pdfExtras.footerDetails,
    lineDetailLabels: pdfExtras.lineDetailLabels,
    lineDetailMaps: pdfExtras.lineDetailMaps,
  });

  return createV3riiQuotationPreviewPdf(input);
}

export function buildQuotationPdfFileName(quotation: QuotationGetDto): string {
  const offerPart = (quotation.offerNo ?? `teklif-${quotation.id}`)
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 48);
  return `teklif-${offerPart}-${quotation.id}.pdf`;
}
