import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { shippingAddressApi } from "../api/shipping-address-api";
import type { PagedFilter, PagedResponse } from "../types/common";
import type { ShippingAddressDto } from "../types/shipping-address";
import { shippingAddressQueryKeys } from "../utils/query-keys";

const DEFAULT_PAGE_SIZE = 20;

interface UseShippingAddressesParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  customerId?: number;
}

export function useShippingAddresses(params: UseShippingAddressesParams = {}) {
  const {
    filters: externalFilters,
    search,
    searchFields,
    filterLogic = "and",
    sortBy = "address",
    sortDirection = "asc",
    pageSize = DEFAULT_PAGE_SIZE,
    customerId,
  } = params;

  const filters: PagedFilter[] = externalFilters ? [...externalFilters] : [];

  if (customerId) {
    filters.push({ column: "customerId", operator: "equals", value: String(customerId) });
  }

  return useInfiniteQuery<PagedResponse<ShippingAddressDto>, Error>({
    queryKey: shippingAddressQueryKeys.list({
      filters,
      search,
      searchFields,
      filterLogic,
      sortBy,
      sortDirection,
      pageSize,
    }),
    queryFn: ({ pageParam }) =>
      shippingAddressApi.getList({
        pageNumber: pageParam as number,
        pageSize,
        search,
        searchFields: search ? searchFields : undefined,
        sortBy,
        sortDirection,
        filters: filters.length > 0 ? filters : undefined,
        filterLogic,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined),
    staleTime: 30 * 1000,
  });
}

export function useCustomerShippingAddresses(customerId: number | undefined) {
  return useQuery<ShippingAddressDto[], Error>({
    queryKey: shippingAddressQueryKeys.byCustomer(customerId),
    queryFn: () => shippingAddressApi.getByCustomerId(customerId!),
    enabled: !!customerId,
    staleTime: 1 * 60 * 1000,
  });
}
