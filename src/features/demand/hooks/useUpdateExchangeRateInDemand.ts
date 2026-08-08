import { demandQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";
import type { DemandExchangeRateUpdateDto } from "../types/demand-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateExchangeRateInDemand() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<boolean, Error, { demandId: number; body: DemandExchangeRateUpdateDto[] }>({
    mutationFn: ({ body }) => demandApi.updateExchangeRateInDemand(body),
    onSuccess: (_, { demandId }) => {
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.detail(demandId) });
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.lines(demandId) });
      queryClient.invalidateQueries({ queryKey: demandQueryKeys.exchangeRates(demandId) });
      showToast("success", t("common.exchangeRatesUpdated"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.exchangeRatesUpdateFailed")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
