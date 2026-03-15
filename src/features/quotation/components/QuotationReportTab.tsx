import React from "react";
import { ReportTab } from "./ReportTab";
import type { QuotationLineFormState } from "../types";
import { DocumentRuleType } from "../types";
import { createBuiltInQuotationReportPdf } from "../utils/createBuiltInQuotationReportPdf";

interface QuotationReportTabProps {
  quotationId: number;
  offerNo?: string | null;
  customerName?: string | null;
  currency?: string | null;
  lines: QuotationLineFormState[];
  metaFields?: Array<{ label: string; value?: string | null }>;
}

export function QuotationReportTab({
  quotationId,
  offerNo,
  customerName,
  currency,
  lines,
  metaFields,
}: QuotationReportTabProps): React.ReactElement {
  return (
    <ReportTab
      entityId={quotationId}
      ruleType={DocumentRuleType.Quotation}
      builtInTemplates={[
        {
          id: "__builtin_windo_teklif_yap__",
          title: "Windo Teklif Yap",
          isDefault: true,
          generate: () =>
            createBuiltInQuotationReportPdf({
              offerNo,
              customerName,
              currencyCode: currency || "TRY",
              lines,
              metaFields,
            }),
        },
      ]}
    />
  );
}
