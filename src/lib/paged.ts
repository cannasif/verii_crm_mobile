export interface PagedFilter {
  column: string;
  operator: string;
  value: string;
}

export interface PagedQueryParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filterLogic?: "and" | "or";
  filters?: PagedFilter[];
  contextUserId?: number;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

type RawPagedPayload<T> = {
  items?: T[];
  Items?: T[];
  data?: T[];
  Data?: T[];
  totalCount?: number;
  TotalCount?: number;
  pageNumber?: number;
  PageNumber?: number;
  pageSize?: number;
  PageSize?: number;
  totalPages?: number;
  TotalPages?: number;
  hasPreviousPage?: boolean;
  HasPreviousPage?: boolean;
  hasNextPage?: boolean;
  HasNextPage?: boolean;
};

export function buildPagedQueryPayload(params: PagedQueryParams = {}): Required<Omit<PagedQueryParams, "contextUserId">> & {
  contextUserId?: number;
} {
  return {
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search?.trim() ?? "",
    sortBy: params.sortBy ?? "Id",
    sortDirection: params.sortDirection ?? "asc",
    filterLogic: params.filterLogic ?? "and",
    filters: params.filters ?? [],
    ...(params.contextUserId != null ? { contextUserId: params.contextUserId } : {}),
  };
}

export function normalizePagedResponse<T>(
  raw: RawPagedPayload<T> | T[] | null | undefined,
  fallback: Pick<PagedQueryParams, "pageNumber" | "pageSize"> = {}
): PagedResponse<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw,
      totalCount: raw.length,
      pageNumber: fallback.pageNumber ?? 1,
      pageSize: fallback.pageSize ?? raw.length,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }

  const items = raw?.items ?? raw?.Items ?? raw?.data ?? raw?.Data ?? [];
  const pageNumber = raw?.pageNumber ?? raw?.PageNumber ?? fallback.pageNumber ?? 1;
  const pageSize = raw?.pageSize ?? raw?.PageSize ?? fallback.pageSize ?? 20;
  const totalCount = raw?.totalCount ?? raw?.TotalCount ?? items.length;
  const totalPages =
    raw?.totalPages ?? raw?.TotalPages ?? (pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1);

  return {
    items: Array.isArray(items) ? items : [],
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
    hasPreviousPage: raw?.hasPreviousPage ?? raw?.HasPreviousPage ?? pageNumber > 1,
    hasNextPage: raw?.hasNextPage ?? raw?.HasNextPage ?? pageNumber < totalPages,
  };
}

export function extractPagedItems<T>(raw: RawPagedPayload<T> | T[] | null | undefined): T[] {
  return normalizePagedResponse(raw).items;
}
