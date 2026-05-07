import { useInfiniteQuery } from "@tanstack/react-query";
import { quotationApi } from "../api";
import type { PagedFilter, PagedResponse, QuotationGetDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;

interface UseQuotationListParams {
  filters?: PagedFilter[];
  search?: string;
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
}

export function useQuotationList(params: UseQuotationListParams = {}) {
  const {
    filters,
    search,
    filterLogic,
    sortBy = "Id",
    sortDirection = "desc",
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  return useInfiniteQuery<PagedResponse<QuotationGetDto>, Error>({
    queryKey: ["quotation", "quotations", { filters, search, filterLogic, sortBy, sortDirection, pageSize }],
    queryFn: ({ pageParam }) =>
      quotationApi.getList({
        pageNumber: pageParam as number,
        pageSize,
        search,
        sortBy,
        sortDirection,
        filters,
        filterLogic,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined),
    staleTime: 2 * 60 * 1000,
  });
}
