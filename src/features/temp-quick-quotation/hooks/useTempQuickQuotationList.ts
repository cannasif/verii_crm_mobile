import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { tempQuickQuotationRepository } from "../repositories/tempQuotattion.repository";
import type { PagedFilter, PagedResponse } from "../../customer/types/common";
import type { TempQuotattionGetDto } from "../models/tempQuotattion.model";

export type TempQuickQuotationStatusFilter = "all" | "draft" | "approved";

export const TEMP_QUICK_QUOTATION_STATUS_FILTER_OPTIONS: TempQuickQuotationStatusFilter[] = [
  "all",
  "draft",
  "approved",
];

export function useTempQuickQuotationListFilters() {
  const [statusFilter, setStatusFilter] = useState<TempQuickQuotationStatusFilter>("all");

  const isStatusFiltered = statusFilter !== "all";

  const filters = useMemo((): PagedFilter[] | undefined => {
    if (statusFilter === "draft") {
      return [{ column: "IsApproved", operator: "eq", value: "false" }];
    }
    if (statusFilter === "approved") {
      return [{ column: "IsApproved", operator: "eq", value: "true" }];
    }
    return undefined;
  }, [statusFilter]);

  return {
    statusFilter,
    setStatusFilter,
    isStatusFiltered,
    filters,
  };
}

const DEFAULT_PAGE_SIZE = 20;
const STALE_TIME_MS = 2 * 60 * 1000;

interface UseTempQuickQuotationListParams {
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filters?: PagedFilter[];
  pageSize?: number;
}

export function useTempQuickQuotationList(params: UseTempQuickQuotationListParams = {}) {
  const {
    search,
    sortBy = "Id",
    sortDirection = "desc",
    filters,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  return useInfiniteQuery<PagedResponse<TempQuotattionGetDto>, Error>({
    queryKey: [
      "temp-quick-quotation",
      "list",
      { search, sortBy, sortDirection, filters, pageSize },
    ],
    queryFn: ({ pageParam }) =>
      tempQuickQuotationRepository.getList({
        pageNumber: pageParam as number,
        pageSize,
        search,
        sortBy,
        sortDirection,
        filters,
        filterLogic: "and",
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined,
    staleTime: STALE_TIME_MS,
  });
}
