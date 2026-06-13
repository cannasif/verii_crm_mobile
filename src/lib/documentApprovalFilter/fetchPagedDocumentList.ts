import type { PagedParams, PagedResponse } from "../../features/customer/types/common";
import { filterDocumentsByApprovalStatus } from "./filterDocumentsByApprovalStatus";

const BULK_FETCH_PAGE_SIZE = 250;

export interface FetchPagedDocumentListParams extends Omit<PagedParams, "pageNumber" | "pageSize"> {
  approvalStatusFilter?: string;
  pageNumber?: number;
  pageSize?: number;
}

export async function fetchPagedDocumentList<T extends { status?: unknown; Status?: unknown }>(
  params: FetchPagedDocumentListParams,
  fetchPage: (pageParams: PagedParams) => Promise<PagedResponse<T>>
): Promise<PagedResponse<T>> {
  const {
    approvalStatusFilter = "all",
    pageNumber = 1,
    pageSize = 20,
    ...listParams
  } = params;

  if (approvalStatusFilter === "all") {
    return fetchPage({
      ...listParams,
      pageNumber,
      pageSize,
    });
  }

  const firstPage = await fetchPage({
    ...listParams,
    pageNumber: 1,
    pageSize: BULK_FETCH_PAGE_SIZE,
  });

  let allRows = firstPage.items ?? [];
  const serverTotalPages = Math.max(firstPage.totalPages ?? 1, 1);

  for (let currentPage = 2; currentPage <= serverTotalPages; currentPage += 1) {
    const nextPage = await fetchPage({
      ...listParams,
      pageNumber: currentPage,
      pageSize: BULK_FETCH_PAGE_SIZE,
    });
    allRows = [...allRows, ...(nextPage.items ?? [])];
  }

  const filtered = filterDocumentsByApprovalStatus(allRows, approvalStatusFilter);
  const totalCount = filtered.length;
  const safeTotalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(pageNumber, 1), safeTotalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    totalCount,
    pageNumber: safePage,
    pageSize,
    totalPages: safeTotalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < safeTotalPages,
  };
}
