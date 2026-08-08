import type { PagedFilter } from "../types/common";

interface ShippingAddressListQueryParams {
  filters: PagedFilter[];
  search?: string;
  searchFields?: string[];
  filterLogic: "and" | "or";
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
}

export const shippingAddressQueryKeys = {
  all: () => ["shippingAddress"] as const,
  listPrefix: () => [...shippingAddressQueryKeys.all(), "list"] as const,
  list: (params: ShippingAddressListQueryParams) =>
    [...shippingAddressQueryKeys.listPrefix(), params] as const,
  byCustomerPrefix: () => [...shippingAddressQueryKeys.all(), "byCustomer"] as const,
  byCustomer: (customerId: number | null | undefined) =>
    [...shippingAddressQueryKeys.byCustomerPrefix(), customerId] as const,
  detail: (id: number | undefined) =>
    [...shippingAddressQueryKeys.all(), "detail", id] as const,
};
