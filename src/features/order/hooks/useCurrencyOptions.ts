import { currencyQueryKeys } from "../utils/query-keys";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { CurrencyOptionDto } from "../types/order-types";

interface UseCurrencyOptionsParams {
  tarih?: string;
  fiyatTipi?: number;
}

export function useCurrencyOptions(params?: UseCurrencyOptionsParams) {
  const stableParams = useMemo(() => {
    if (!params) return undefined;
    return {
      tarih: params.tarih || undefined,
      fiyatTipi: params.fiyatTipi || undefined,
    };
  }, [params?.tarih, params?.fiyatTipi]);

  return useQuery<CurrencyOptionDto[], Error>({
    queryKey: currencyQueryKeys.options(stableParams),
    queryFn: () => orderApi.getCurrencyOptions(stableParams),
    staleTime: 10 * 60 * 1000,
  });
}
