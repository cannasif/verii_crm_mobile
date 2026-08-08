import type { PagedFilter } from "../types/common";

export interface ContactListQueryKeyParams {
  filters: PagedFilter[];
  search?: string;
  searchFields?: string[];
  sortBy: string;
  sortDirection: "asc" | "desc";
  filterLogic: "and" | "or";
  pageSize: number;
}

export const contactQueryKeys = {
  all: () => ["contact"] as const,
  lists: () => [...contactQueryKeys.all(), "list"] as const,
  list: (params: ContactListQueryKeyParams) => [...contactQueryKeys.lists(), params] as const,
  detail: (id: number | undefined) => [...contactQueryKeys.all(), "detail", id] as const,
  byCustomers: () => [...contactQueryKeys.all(), "byCustomer"] as const,
  byCustomer: (customerId: number | undefined) =>
    [...contactQueryKeys.byCustomers(), customerId] as const,
};
