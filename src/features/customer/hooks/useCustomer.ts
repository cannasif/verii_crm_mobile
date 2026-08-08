import { useQuery } from "@tanstack/react-query";
import { customerApi } from "../api/customer-api";
import type { CustomerDto } from "../types/customer";
import { customerQueryKeys } from "../utils/query-keys";

export function useCustomer(id: number | undefined) {
  return useQuery<CustomerDto, Error>({
    queryKey: customerQueryKeys.detail(id),
    queryFn: () => customerApi.getById(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}
