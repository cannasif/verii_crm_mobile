import { quotationExchangeRateQueryKeys } from "../utils/query-keys";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { ExchangeRateDto } from "../types/quotation-types";

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
    queryKey: quotationExchangeRateQueryKeys.byParams(stableParams),
    queryFn: () => quotationApi.getExchangeRate(stableParams),
    staleTime: 5 * 60 * 1000,
    enabled: !!stableParams,
  });
}
