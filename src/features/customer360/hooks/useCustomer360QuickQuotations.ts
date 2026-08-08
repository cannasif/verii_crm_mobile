import { useQuery } from "@tanstack/react-query";
import {
  customer360Api,
  CUSTOMER_360_QUICK_QUOTATIONS_STALE_MS,
} from "../api/customer360-api";
import type { Customer360QuickQuotationDto } from "../types/customer360-types";
import { customer360QueryKeys } from "../utils/query-keys";

export function useCustomer360QuickQuotations(
  customerId: number | undefined
): ReturnType<typeof useQuery<Customer360QuickQuotationDto[], Error>> {
  return useQuery<Customer360QuickQuotationDto[], Error>({
    queryKey: customer360QueryKeys.quickQuotations(customerId),
    queryFn: () => customer360Api.getQuickQuotations(customerId!),
    enabled: typeof customerId === "number" && customerId > 0,
    staleTime: CUSTOMER_360_QUICK_QUOTATIONS_STALE_MS,
  });
}
