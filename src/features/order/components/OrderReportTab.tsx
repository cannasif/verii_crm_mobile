import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/auth";
import { resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
import { buildSalesDocumentPreviewPdfExtras } from "../../../lib/salesDocumentPreviewPdf";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida";
import { resolveOrderCustomerLabelForPdf } from "../utils/resolveOrderCustomerLabelForPdf";
import { ReportTab } from "../../quotation/components/ReportTab";
import { DocumentRuleType } from "../../quotation/types";
import type { OrderLineFormState } from "../types";
import { buildOrderPreviewPdfInput } from "../utils/buildOrderPreviewPdfInput";
import { createV3riiOrderPreviewPdf } from "../utils/createV3riiOrderPreviewPdf";

export const V3RII_ORDER_BUILTIN_TEMPLATE_ID = "__builtin_v3rii_order_preview__";

interface OrderReportTabProps {
  orderId: number;
  offerNo?: string | null;
  customerName?: string | null;
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  currency?: string | null;
  currencyCode?: string | null;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
  lines: OrderLineFormState[];
  offerDate?: string | null;
  description?: string | null;
  koliBaskiDefinitionId?: number | null;
  koliBaskiDefinitionName?: string | null;
}

export function OrderReportTab({
  orderId,
  offerNo,
  customerName,
  potentialCustomerId,
  erpCustomerCode,
  currency,
  currencyCode,
  generalDiscountRate,
  generalDiscountAmount,
  lines,
  offerDate,
  description,
  koliBaskiDefinitionId,
  koliBaskiDefinitionName,
}: OrderReportTabProps): React.ReactElement {
  const { t } = useTranslation();
  const branch = useAuthStore((state) => state.branch);
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiMap } = useWindoDefinitionOptions();

  const buildV3riiInput = useCallback(
    async (draft: boolean) => {
      const resolvedCustomerName = await resolveOrderCustomerLabelForPdf({
        potentialCustomerId,
        potentialCustomerName: customerName,
        erpCustomerCode,
        selectedCustomerName: customerName,
        t,
      });

      const pdfExtras = buildSalesDocumentPreviewPdfExtras({
        t,
        koliBaskiDefinitionId,
        koliBaskiDefinitionName,
        koliBaskiMap,
        description,
        lineDetailMaps: { profilMap, demirMap, vidaMap, baskiMap },
      });

      return buildOrderPreviewPdfInput({
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
        t,
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
        id: V3RII_ORDER_BUILTIN_TEMPLATE_ID,
        title: t("order.pdfExportTemplate.builtInTemplateTitle"),
        isDefault: true,
        generate: async () => createV3riiOrderPreviewPdf(await buildV3riiInput(false)),
      },
    ],
    [buildV3riiInput, t]
  );

  return (
    <ReportTab
      entityId={orderId}
      ruleType={DocumentRuleType.Order}
      builtInTemplates={builtInTemplates}
    />
  );
}
