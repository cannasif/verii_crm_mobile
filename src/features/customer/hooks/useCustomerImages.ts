import { useQuery } from "@tanstack/react-query";
import { customerApi } from "../api/customerApi";
import type { CustomerImageDto } from "../types";

export function useCustomerImages(customerId: number | undefined) {
  return useQuery<CustomerImageDto[], Error>({
    queryKey: ["customer", "images", customerId],
    queryFn: () => customerApi.getCustomerImages(customerId!),
    enabled: !!customerId,
    staleTime: 30 * 1000,
  });
}
