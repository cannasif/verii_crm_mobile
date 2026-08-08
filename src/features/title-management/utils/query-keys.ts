import type { PagedFilter } from "../types/title-types";

interface TitleListQueryParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
}

export const titleQueryKeys = {
  all: () => ["title"] as const,
  listPrefix: () => [...titleQueryKeys.all(), "list"] as const,
  list: (params: TitleListQueryParams) => [...titleQueryKeys.listPrefix(), params] as const,
  detail: (id: number) => [...titleQueryKeys.all(), "detail", id] as const,
};
