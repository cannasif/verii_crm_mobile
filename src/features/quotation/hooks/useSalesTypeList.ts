import { quotationQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { SalesTypeGetDto } from "../types/quotation-types";

interface UseSalesTypeListParams {
  pageNumber?: number;
  pageSize?: number;
  offerType?: string | null;
}

export function useSalesTypeList(params: UseSalesTypeListParams = {}) {
  const { pageNumber = 1, pageSize = 500, offerType } = params;

  const filters =
    offerType && offerType.trim().length > 0
      ? [{ column: "salesType", operator: "equals", value: offerType }]
      : undefined;

  return useQuery<SalesTypeGetDto[]>({
    queryKey: quotationQueryKeys.salesTypes(offerType),
    queryFn: () =>
      quotationApi.getSalesTypeList({
        pageNumber,
        pageSize,
        filters,
      }),
    staleTime: 10 * 60 * 1000,
    enabled: true,
  });
}
