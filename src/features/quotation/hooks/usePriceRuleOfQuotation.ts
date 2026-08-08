import { quotationQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { PricingRuleLineGetDto } from "../types/quotation-types";

interface UsePriceRuleOfQuotationParams {
  customerCode?: string;
  salesmenId?: number;
  quotationDate?: string;
}

export function usePriceRuleOfQuotation(params: UsePriceRuleOfQuotationParams) {
  const { customerCode, salesmenId, quotationDate } = params;

  return useQuery<PricingRuleLineGetDto[], Error>({
    queryKey: quotationQueryKeys.priceRule(params),
    queryFn: () =>
      quotationApi.getPriceRuleOfQuotation({
        customerCode: customerCode!,
        salesmenId: salesmenId!,
        quotationDate: quotationDate!,
      }),
    enabled: !!customerCode && !!salesmenId && !!quotationDate,
    staleTime: 60 * 1000,
  });
}
