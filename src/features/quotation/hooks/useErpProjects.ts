import { quotationQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { ProjeDto } from "../types/quotation-types";

export function useErpProjects() {
  return useQuery<ProjeDto[]>({
    queryKey: quotationQueryKeys.erpProjects(),
    queryFn: () => quotationApi.getProjectCodes(),
    staleTime: 10 * 60 * 1000,
  });
}
