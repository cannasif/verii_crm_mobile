import { orderQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { PricingRuleLineGetDto } from "../types/order-types";

interface UsePriceRuleOfOrderParams {
  customerCode?: string;
  salesmenId?: number;
  orderDate?: string;
}

export function usePriceRuleOfOrder(params: UsePriceRuleOfOrderParams) {
  const { customerCode, salesmenId, orderDate } = params;

  return useQuery<PricingRuleLineGetDto[], Error>({
    queryKey: orderQueryKeys.priceRule(params),
    queryFn: () =>
      orderApi.getPriceRuleOfOrder({
        customerCode: customerCode!,
        salesmenId: salesmenId!,
        orderDate: orderDate!,
      }),
    enabled: !!customerCode && !!salesmenId && !!orderDate,
    staleTime: 2 * 60 * 1000,
  });
}
