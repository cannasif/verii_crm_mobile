import { quotationCurrencyQueryKeys } from "../utils/query-keys";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { quotationApi } from "../api/quotation-api";
import type { CurrencyOptionDto } from "../types/quotation-types";

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
    queryKey: quotationCurrencyQueryKeys.options(stableParams),
    queryFn: () => quotationApi.getCurrencyOptions(stableParams),
    staleTime: 10 * 60 * 1000,
  });
}
