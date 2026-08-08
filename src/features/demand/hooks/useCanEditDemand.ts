import { demandQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";

const APPROVAL_WAITING_STATUS = 1;

export function useCanEditDemand(
  demandId: number | null | undefined,
  status: number | null | undefined
) {
  return useQuery({
    queryKey: demandQueryKeys.canEdit(demandId),
    queryFn: () => demandApi.canEditWhileWaiting(demandId!),
    enabled: demandId != null && status === APPROVAL_WAITING_STATUS,
    staleTime: 5 * 60 * 1000,
  });
}
