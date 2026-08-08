import { useQuery } from "@tanstack/react-query";
import { customerApi } from "../api/customer-api";
import { customerQueryKeys } from "../utils/query-keys";

export function useCustomerScopeAccess(
  customerId: number | undefined,
  contextUserId: number | undefined
) {
  return useQuery({
    queryKey: customerQueryKeys.scopeAccess(customerId, contextUserId),
    enabled: customerId != null && customerId > 0,
    queryFn: async () => {
      const response = await customerApi.getList({
        pageNumber: 1,
        pageSize: 1,
        contextUserId,
        filters: [{ column: "id", operator: "eq", value: String(customerId) }],
        filterLogic: "and",
      });

      return response.items.some((item) => item.id === customerId);
    },
    staleTime: 30 * 1000,
  });
}
