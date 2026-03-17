import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { contactApi } from "../api/contactApi";
import type { PagedFilter, PagedResponse, ContactDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;

interface UseContactsParams {
  filters?: PagedFilter[];
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  customerId?: number;
  filterLogic?: "and" | "or";
}

export function useContacts(params: UseContactsParams = {}) {
  const {
    filters: externalFilters,
    search,
    sortBy = "fullName",
    sortDirection = "asc",
    pageSize = DEFAULT_PAGE_SIZE,
    customerId,
    filterLogic = "and"
  } = params;

  const filters: PagedFilter[] = externalFilters ? [...externalFilters] : [];

  if (customerId) {
    filters.push({ column: "customerId", operator: "equals", value: String(customerId) });
  }

  return useInfiniteQuery<PagedResponse<ContactDto>, Error>({
    queryKey: ["contact", "list", { filters, search, sortBy, sortDirection, filterLogic }],
    queryFn: ({ pageParam }) => {
      const apiParams = {
        pageNumber: pageParam as number,
        pageSize,
        search,
        sortBy,
        sortDirection,
        filters: filters.length > 0 ? filters : undefined,
        filterLogic,
      };
      return contactApi.getList(apiParams);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined),
    staleTime: 30 * 1000,
  });
}

export function useCustomerContacts(customerId: number | undefined) {
  return useQuery<ContactDto[], Error>({
    queryKey: ["contact", "byCustomer", customerId],
    queryFn: () => contactApi.getByCustomerId(customerId!),
    enabled: !!customerId,
    staleTime: 30 * 1000,
  });
}
