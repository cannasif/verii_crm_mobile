import type { PagedFilter } from "../types/common";

export interface CustomerListQueryKeyParams {
  filters?: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic?: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
  contextUserId?: number;
}

export const customerQueryKeys = {
  all: () => ["customer"] as const,
  lists: () => [...customerQueryKeys.all(), "list"] as const,
  list: (params: CustomerListQueryKeyParams) => [...customerQueryKeys.lists(), params] as const,
  detail: (id: number | undefined) => [...customerQueryKeys.all(), "detail", id] as const,
  images: (customerId: number | undefined) => [...customerQueryKeys.all(), "images", customerId] as const,
  scopeAccess: (customerId: number | undefined, contextUserId: number | undefined) =>
    [...customerQueryKeys.all(), "scope-access", customerId, contextUserId] as const,
  businessCardPotentialMatches: (filters: PagedFilter[]) =>
    [...customerQueryKeys.all(), "businessCardPotentialMatches", filters] as const,
};

export const customerLookupQueryKeys = {
  all: () => ["lookup"] as const,
  countries: () => [...customerLookupQueryKeys.all(), "countries"] as const,
  cities: (countryId: number | undefined) => [...customerLookupQueryKeys.all(), "cities", countryId] as const,
  districts: (cityId: number | undefined) => [...customerLookupQueryKeys.all(), "districts", cityId] as const,
  customerTypes: () => [...customerLookupQueryKeys.all(), "customerTypes"] as const,
  titles: () => [...customerLookupQueryKeys.all(), "titles"] as const,
};
