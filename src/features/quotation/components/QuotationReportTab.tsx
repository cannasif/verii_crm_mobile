import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/auth";
import { resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
import { buildSalesDocumentPreviewPdfExtras } from "../../../lib/salesDocumentPreviewPdf";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida";
import { ReportTab } from "./ReportTab";
import type { QuotationLineFormState } from "../types";
import { DocumentRuleType } from "../types";
import { buildQuotationPreviewPdfInput } from "../utils/buildQuotationPreviewPdfInput";
import { createBuiltInQuotationReportPdf } from "../utils/createBuiltInQuotationReportPdf";
import { createV3riiQuotationPreviewPdf } from "../utils/createV3riiQuotationPreviewPdf";
import { resolveQuotationCustomerLabelForPdf } from "../utils/resolveQuotationCustomerLabelForPdf";

export const V3RII_BUILTIN_TEMPLATE_ID = "__builtin_v3rii_template__";

interface QuotationReportTabProps {
  quotationId: number;
  offerNo?: string | null;
  customerName?: string | null;
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  currency?: string | null;
  currencyCode?: string | null;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
  lines: QuotationLineFormState[];
  representativeName?: string | null;
  address?: string | null;
  shippingAddress?: string | null;
  offerDate?: string | null;
  deliveryDate?: string | null;
  validUntil?: string | null;
  paymentTypeName?: string | null;
  salesTypeName?: string | null;
  projectCode?: string | null;
  description?: string | null;
  notes?: string[];
  koliBaskiDefinitionId?: number | null;
  koliBaskiDefinitionName?: string | null;
  metaFields?: Array<{ label: string; value?: string | null }>;
}

export function QuotationReportTab({
  quotationId,
  offerNo,
  customerName,
  potentialCustomerId,
  erpCustomerCode,
  currency,
  currencyCode,
  generalDiscountRate,
  generalDiscountAmount,
  lines,
  representativeName,
  address,
  shippingAddress,
  offerDate,
  deliveryDate,
  validUntil,
  paymentTypeName,
  salesTypeName,
  projectCode,
  description,
  notes,
  koliBaskiDefinitionId,
  koliBaskiDefinitionName,
  metaFields,
}: QuotationReportTabProps): React.ReactElement {
  const { t } = useTranslation();
  const branch = useAuthStore((state) => state.branch);
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiMap } = useWindoDefinitionOptions();

  const buildV3riiInput = useCallback(
    async (draft: boolean) => {
      const resolvedCustomerName = await resolveQuotationCustomerLabelForPdf({
        potentialCustomerId,
        potentialCustomerName: customerName,
        erpCustomerCode,
        selectedCustomerName: customerName,
      });

      const pdfExtras = buildSalesDocumentPreviewPdfExtras({
        t,
        koliBaskiDefinitionId,
        koliBaskiDefinitionName,
        koliBaskiMap,
        description,
        structuredNotes: notes,
        lineDetailMaps: { profilMap, demirMap, vidaMap, baskiMap },
      });

      return buildQuotationPreviewPdfInput({
        offerDate,
        offerNo,
        customerName: resolvedCustomerName,
        branch,
        currency,
        currencyCode: currencyCode ?? resolveCurrencyIsoCode(currency),
        generalDiscountRate,
        generalDiscountAmount,
        draft,
        lines,
        footerDetails: pdfExtras.footerDetails,
        lineDetailLabels: pdfExtras.lineDetailLabels,
        lineDetailMaps: pdfExtras.lineDetailMaps,
      });
    },
    [
      baskiMap,
      branch,
      currency,
      currencyCode,
      customerName,
      demirMap,
      description,
      erpCustomerCode,
      generalDiscountAmount,
      generalDiscountRate,
      koliBaskiDefinitionId,
      koliBaskiDefinitionName,
      koliBaskiMap,
      lines,
      notes,
      offerDate,
      offerNo,
      potentialCustomerId,
      profilMap,
      t,
      vidaMap,
    ]
  );

  const builtInTemplates = useMemo(
    () => [
      {
        id: V3RII_BUILTIN_TEMPLATE_ID,
        title: "V3RII ŞABLON",
        isDefault: true,
        generate: async () => createV3riiQuotationPreviewPdf(await buildV3riiInput(false)),
      },
      {
        id: "__builtin_windo_teklif_yap__",
        title: "Windo Teklif Yap",
        generate: () =>
          createBuiltInQuotationReportPdf({
            offerNo,
            customerName,
            currencyCode: currencyCode ?? resolveCurrencyIsoCode(currency ?? "TRY"),
            lines,
            representativeName,
            address,
            shippingAddress,
            erpCustomerCode,
            offerDate,
            deliveryDate,
            validUntil,
            paymentTypeName,
            salesTypeName,
            projectCode,
            description,
            notes,
            metaFields,
          }),
      },
    ],
    [
      address,
      buildV3riiInput,
      currency,
      currencyCode,
      customerName,
      deliveryDate,
      description,
      erpCustomerCode,
      lines,
      metaFields,
      notes,
      offerDate,
      offerNo,
      paymentTypeName,
      projectCode,
      representativeName,
      salesTypeName,
      shippingAddress,
      validUntil,
    ]
  );

  return (
    <ReportTab
      entityId={quotationId}
      ruleType={DocumentRuleType.Quotation}
      builtInTemplates={builtInTemplates}
    />
  );
}
