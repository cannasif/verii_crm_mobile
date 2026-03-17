import type { ApiResponse } from "../../auth/types";

export interface PagedFilter {
  column: string;
  operator: string;
  value: string;
}

export interface PagedParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filters?: PagedFilter[];
  filterLogic?: "and" | "or";
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

export type PagedApiResponse<T> = ApiResponse<PagedResponse<T>>;
