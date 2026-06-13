import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/auth";
import { resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
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
}: OrderReportTabProps): React.ReactElement {
  const { t } = useTranslation();
  const branch = useAuthStore((state) => state.branch);

  const buildV3riiInput = useCallback(
    async (draft: boolean) => {
      const resolvedCustomerName = await resolveOrderCustomerLabelForPdf({
        potentialCustomerId,
        potentialCustomerName: customerName,
        erpCustomerCode,
        selectedCustomerName: customerName,
        t,
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
      });
    },
    [
      branch,
      currency,
      currencyCode,
      customerName,
      erpCustomerCode,
      generalDiscountAmount,
      generalDiscountRate,
      lines,
      offerDate,
      offerNo,
      potentialCustomerId,
      t,
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
