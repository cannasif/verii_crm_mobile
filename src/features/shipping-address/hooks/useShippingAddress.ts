import { useQuery } from "@tanstack/react-query";
import { shippingAddressApi } from "../api/shipping-address-api";
import type { ShippingAddressDto } from "../types/shipping-address";
import { shippingAddressQueryKeys } from "../utils/query-keys";

export function useShippingAddress(id: number | undefined) {
  return useQuery<ShippingAddressDto, Error>({
    queryKey: shippingAddressQueryKeys.detail(id),
    queryFn: () => shippingAddressApi.getById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
