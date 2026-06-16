import { useQuery } from "@tanstack/react-query";
import { getAvailableDocumentSerialTypes } from "../api/documentSerialTypeApi";
import type { DocumentSerialTypeDto } from "../types";

export function useAvailableDocumentSerialTypes(
  customerTypeId: number | undefined | null,
  salesRepId: number | undefined,
  ruleType: number
) {
  return useQuery<DocumentSerialTypeDto[], Error>({
    queryKey: ["documentSerialType", "available", customerTypeId, salesRepId, ruleType],
    queryFn: () =>
      getAvailableDocumentSerialTypes({
        customerTypeId: customerTypeId ?? 0,
        salesRepId: salesRepId ?? 0,
        ruleType,
      }),
    enabled: !!salesRepId && salesRepId > 0,
    staleTime: 30 * 1000,
  });
}
