import { orderCustomerQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { customerApi } from "../../customer/api/customer-api";
import type { CustomerDto } from "../../customer/types/customer";

const STALE_TIME_MS = 60 * 1000;

export function useCustomerListForDetail(): {
  data: CustomerDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: orderCustomerQueryKeys.listForDetail(),
    queryFn: () =>
      customerApi.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: "name",
        sortDirection: "asc",
      }),
    staleTime: STALE_TIME_MS,
  });

  const items = query.data?.items ?? [];
  return {
    data: items,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: () => query.refetch(),
  };
}
