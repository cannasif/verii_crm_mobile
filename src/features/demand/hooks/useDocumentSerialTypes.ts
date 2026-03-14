import { useQuery } from "@tanstack/react-query";
import { demandApi } from "../api";
import { PricingRuleType } from "../types";
import type { DocumentSerialTypeDto } from "../types";

export function useAvailableDocumentSerialTypes(
  customerTypeId: number | undefined | null,
  salesRepId: number | undefined,
  ruleType: number = PricingRuleType.Demand
) {
  return useQuery<DocumentSerialTypeDto[], Error>({
    queryKey: ["documentSerialType", "available", customerTypeId, salesRepId, ruleType],
    queryFn: () =>
      demandApi.getDocumentSerialTypes({
        customerTypeId: customerTypeId ?? 0,
        salesRepId,
        ruleType,
      }),
    enabled: !!salesRepId && salesRepId > 0,
    staleTime: 30 * 1000,
  });
}
