import { demandExchangeRateQueryKeys } from "../utils/query-keys";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";
import type { ExchangeRateDto } from "../types/demand-types";

interface UseExchangeRateParams {
  tarih?: string;
  fiyatTipi?: number;
}

export function useExchangeRate(params?: UseExchangeRateParams) {
  const stableParams = useMemo(() => {
    if (!params) return undefined;
    const tarih = params.tarih || new Date().toISOString().split("T")[0];
    return {
      tarih,
      fiyatTipi: params.fiyatTipi ?? 1,
    };
  }, [params?.tarih, params?.fiyatTipi]);

  return useQuery<ExchangeRateDto[], Error>({
    queryKey: demandExchangeRateQueryKeys.byParams(stableParams),
    queryFn: () => demandApi.getExchangeRate(stableParams),
    staleTime: 5 * 60 * 1000,
    enabled: !!stableParams,
  });
}
