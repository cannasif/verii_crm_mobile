import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerApi } from "../api/customerApi";
import type { BusinessCardOcrResult } from "../types/businessCard";
import { buildBusinessCardPotentialMatchFilters, scoreBusinessCardPotentialMatches } from "../services/businessCardEntityResolutionService";

export function useBusinessCardPotentialMatches(result: BusinessCardOcrResult | null, enabled = true) {
  const filters = useMemo(() => (result ? buildBusinessCardPotentialMatchFilters(result) : []), [result]);

  return useQuery({
    queryKey: ["customer", "businessCardPotentialMatches", filters],
    enabled: enabled && filters.length > 0,
    queryFn: async () => {
      const response = await customerApi.getList({
        pageNumber: 1,
        pageSize: 10,
        filters,
        filterLogic: "or",
        sortBy: "Id",
        sortDirection: "desc",
      });
      return scoreBusinessCardPotentialMatches(result!, response.items);
    },
    staleTime: 30 * 1000,
  });
}
