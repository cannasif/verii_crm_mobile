import { useQuery } from "@tanstack/react-query";
import { getAvailableDocumentSerialTypes } from "../api/document-serial-type-api";
import type { DocumentSerialTypeDto } from "../types/document-serial-type-types";
import { documentSerialTypeQueryKeys } from "../utils/query-keys";

export function useAvailableDocumentSerialTypes(
  customerTypeId: number | undefined | null,
  salesRepId: number | undefined,
  ruleType: number
) {
  return useQuery<DocumentSerialTypeDto[], Error>({
    queryKey: documentSerialTypeQueryKeys.available(customerTypeId, salesRepId, ruleType),
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
