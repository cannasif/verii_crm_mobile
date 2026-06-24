import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationApi } from "../api";
import type { QuotationExchangeRateUpdateDto } from "../types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateExchangeRateInQuotation() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<boolean, Error, { quotationId: number; body: QuotationExchangeRateUpdateDto[] }>({
    mutationFn: ({ body }) => quotationApi.updateExchangeRateInQuotation(body),
    onSuccess: (_, { quotationId }) => {
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", quotationId] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", "lines", quotationId] });
      queryClient.invalidateQueries({ queryKey: ["quotation", "detail", "exchangeRates", quotationId] });
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
