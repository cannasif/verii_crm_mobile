import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPagedDocumentList } from "../../../lib/documentApprovalFilter";
import { quotationApi } from "../api";
import type { PagedFilter, PagedResponse, QuotationGetDto } from "../types";

const DEFAULT_PAGE_SIZE = 20;
const STALE_TIME_MS = 2 * 60 * 1000;

interface UseQuotationListParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  approvalStatusFilter?: string;
}

export function useQuotationList(params: UseQuotationListParams = {}) {
  const {
    filters,
    search,
    searchFields,
    filterLogic,
    sortBy = "Id",
    sortDirection = "desc",
    pageSize = DEFAULT_PAGE_SIZE,
    approvalStatusFilter = "all",
  } = params;

  return useInfiniteQuery<PagedResponse<QuotationGetDto>, Error>({
    queryKey: [
      "quotation",
      "quotations",
      { filters, search, searchFields, filterLogic, sortBy, sortDirection, pageSize, approvalStatusFilter },
    ],
    queryFn: ({ pageParam }) =>
      fetchPagedDocumentList(
        {
          approvalStatusFilter,
          pageNumber: pageParam as number,
          pageSize,
          search,
          searchFields: search ? searchFields : undefined,
          sortBy,
          sortDirection,
          filters,
          filterLogic,
        },
        (pageParams) => quotationApi.getList(pageParams)
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined,
    staleTime: STALE_TIME_MS,
  });
}
