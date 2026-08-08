import { useQuery } from "@tanstack/react-query";
import {
  customer360Api,
  CUSTOMER_360_ERP_MOVEMENTS_STALE_MS,
} from "../api/customer360-api";
import type { Customer360ErpMovementDto } from "../types/customer360-types";
import { customer360QueryKeys } from "../utils/query-keys";

export function useCustomer360ErpMovements(
  customerId: number | undefined
): ReturnType<typeof useQuery<Customer360ErpMovementDto[], Error>> {
  return useQuery<Customer360ErpMovementDto[], Error>({
    queryKey: customer360QueryKeys.erpMovements(customerId),
    queryFn: () => customer360Api.getErpMovements(customerId!),
    enabled: typeof customerId === "number" && customerId > 0,
    staleTime: CUSTOMER_360_ERP_MOVEMENTS_STALE_MS,
  });
}
