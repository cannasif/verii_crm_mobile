import { useQuery } from "@tanstack/react-query";
import { customerApi } from "../api/customer-api";
import type { CustomerImageDto } from "../types/customer";
import { customerQueryKeys } from "../utils/query-keys";

export function useCustomerImages(customerId: number | undefined) {
  return useQuery<CustomerImageDto[], Error>({
    queryKey: customerQueryKeys.images(customerId),
    queryFn: () => customerApi.getCustomerImages(customerId!),
    enabled: !!customerId,
    staleTime: 30 * 1000,
  });
}
